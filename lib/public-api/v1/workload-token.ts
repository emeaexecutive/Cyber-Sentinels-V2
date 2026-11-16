import { createRemoteJWKSet, customFetch, errors, jwtVerify } from "jose";
import { PublicApiError, type PublicApiScope } from "./contracts";

const WORKLOAD_TOKEN_MAX_AGE_SECONDS = 300;
const allowedAlgorithms = ["EdDSA", "ES256", "RS256"] as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const workloadIdPattern = /^[A-Za-z0-9_.:/-]{1,180}$/;
const subjectPattern = /^[^\s\u0000-\u001f\u007f]{1,240}$/;
const allowedWorkloadScopes = new Set<PublicApiScope>(["trust:request"]);

class JwksFetchError extends Error {}

export type WorkloadIdentityConfig = {
  issuer: string;
  audience: string;
  jwksUrl: string;
};

export type VerifiedWorkloadToken = {
  issuer: string;
  subject: string;
  tenantId: string;
  workloadId: string;
  tokenId: string;
  scopes: PublicApiScope[];
};

function configuredHttpsUrl(value: string | undefined, name: string): string {
  if (!value) {
    throw new PublicApiError(
      "WORKLOAD_IDENTITY_CONFIGURATION_MISSING",
      "Workload identity is not configured.",
      503,
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PublicApiError(
      "WORKLOAD_IDENTITY_CONFIGURATION_INVALID",
      "Workload identity configuration is invalid.",
      503,
    );
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new PublicApiError(
      "WORKLOAD_IDENTITY_CONFIGURATION_INVALID",
      `${name} must be a pinned HTTPS URL without credentials, query, or fragment.`,
      503,
    );
  }
  return value.trim();
}

export function workloadIdentityConfig(
  env: Record<string, string | undefined> = process.env,
): WorkloadIdentityConfig {
  const issuer = configuredHttpsUrl(env.WORKLOAD_OIDC_ISSUER, "WORKLOAD_OIDC_ISSUER");
  const jwksUrl = configuredHttpsUrl(env.WORKLOAD_OIDC_JWKS_URL, "WORKLOAD_OIDC_JWKS_URL");
  const audience = env.WORKLOAD_OIDC_AUDIENCE?.trim();
  if (!audience || audience.length > 240 || /[\u0000-\u001f\u007f]/.test(audience)) {
    throw new PublicApiError(
      "WORKLOAD_IDENTITY_CONFIGURATION_MISSING",
      "Workload identity is not configured.",
      503,
    );
  }
  return { issuer, audience, jwksUrl };
}

function normalizedScopes(value: unknown): PublicApiScope[] {
  if (typeof value !== "string" || value.length > 512) {
    throw new PublicApiError("WORKLOAD_TOKEN_INVALID", "The workload token is invalid.", 401);
  }
  const values = value.split(/\s+/).filter(Boolean);
  if (!values.length || new Set(values).size !== values.length
    || values.some(scope => !allowedWorkloadScopes.has(scope as PublicApiScope))) {
    throw new PublicApiError("WORKLOAD_SCOPE_DENIED", "The workload token requests an unsupported scope.", 403);
  }
  return values as PublicApiScope[];
}

function invalidWorkloadToken(): PublicApiError {
  return new PublicApiError("WORKLOAD_TOKEN_INVALID", "The workload token is invalid.", 401);
}

function workloadVerifierUnavailable(): PublicApiError {
  return new PublicApiError(
    "WORKLOAD_IDENTITY_UNAVAILABLE",
    "Workload identity verification is temporarily unavailable.",
    503,
  );
}

export function createWorkloadTokenVerifier(
  config: WorkloadIdentityConfig,
  fetcher: typeof fetch = fetch,
) {
  const issuer = configuredHttpsUrl(config.issuer, "issuer");
  const jwksUrl = new URL(configuredHttpsUrl(config.jwksUrl, "jwksUrl"));
  const audience = config.audience.trim();
  if (!audience || audience.length > 240) {
    throw new PublicApiError(
      "WORKLOAD_IDENTITY_CONFIGURATION_INVALID",
      "Workload identity configuration is invalid.",
      503,
    );
  }

  const jwks = createRemoteJWKSet(jwksUrl, {
    [customFetch]: async (input, init) => {
      let response: Response;
      try {
        response = await fetcher(input, { ...init, redirect: "error" });
      } catch {
        throw new JwksFetchError();
      }
      if (!response.ok) throw new JwksFetchError();
      return response;
    },
  });

  return async (token: string): Promise<VerifiedWorkloadToken> => {
    if (token.length > 16_384) throw invalidWorkloadToken();
    try {
      const { payload, protectedHeader } = await jwtVerify(token, jwks, {
        issuer,
        audience,
        algorithms: [...allowedAlgorithms],
        requiredClaims: ["iss", "sub", "aud", "exp", "iat", "jti"],
        maxTokenAge: `${WORKLOAD_TOKEN_MAX_AGE_SECONDS}s`,
        clockTolerance: 5,
      });
      if (!protectedHeader.kid
        || typeof payload.iss !== "string"
        || typeof payload.sub !== "string"
        || !subjectPattern.test(payload.sub)
        || typeof payload.exp !== "number"
        || typeof payload.iat !== "number"
        || payload.exp - payload.iat > WORKLOAD_TOKEN_MAX_AGE_SECONDS
        || typeof payload.jti !== "string"
        || !/^[A-Za-z0-9._:-]{16,180}$/.test(payload.jti)
        || typeof payload.tenant_id !== "string"
        || !uuidPattern.test(payload.tenant_id)
        || typeof payload.workload_id !== "string"
        || !workloadIdPattern.test(payload.workload_id)) {
        throw invalidWorkloadToken();
      }
      return {
        issuer: payload.iss,
        subject: payload.sub,
        tenantId: payload.tenant_id,
        workloadId: payload.workload_id,
        tokenId: payload.jti,
        scopes: normalizedScopes(payload.scope),
      };
    } catch (error) {
      if (error instanceof PublicApiError) throw error;
      if (error instanceof errors.JWKSNoMatchingKey) throw invalidWorkloadToken();
      if (error instanceof JwksFetchError) throw workloadVerifierUnavailable();
      const code = (error as { code?: unknown })?.code;
      if (typeof code === "string" && code.startsWith("ERR_JWKS_")) {
        throw workloadVerifierUnavailable();
      }
      throw invalidWorkloadToken();
    }
  };
}
