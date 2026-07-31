export type RequestDemoErrorCode =
  | "REQUEST_DEMO_CONFIG_MISSING"
  | "REQUEST_DEMO_TURNSTILE_TOKEN_MISSING"
  | "REQUEST_DEMO_TURNSTILE_FAILED"
  | "REQUEST_DEMO_TURNSTILE_UNAVAILABLE"
  | "REQUEST_DEMO_VALIDATION_FAILED"
  | "REQUEST_DEMO_PAYLOAD_TOO_LARGE"
  | "REQUEST_DEMO_DATABASE_FAILED"
  | "REQUEST_DEMO_RATE_LIMITED"
  | "REQUEST_DEMO_UNKNOWN";

export type RequestDemoPayload = {
  name: string;
  work_email: string;
  company: string;
  role: string;
  message: string;
  use_case: string;
  status: string;
  ai_usage_level: string;
  company_size: string;
  current_problem_category: string;
  current_problem: string;
};

type ProviderError = {
  code?: string | null;
  name?: string | null;
};

type InsertResult = {
  error: ProviderError | null;
};

type RequestDemoPersistence = {
  insertRequest(payload: RequestDemoPayload): Promise<InsertResult>;
  insertInterestSignal(payload: Record<string, string | null>): Promise<InsertResult>;
};

export type RequestDemoConfig = {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  turnstileSecretConfigured: boolean;
  turnstileSiteKeyConfigured: boolean;
};

export type TurnstileResult =
  | {
      ok: true;
      reason: string;
      errorCodes?: string[];
      hostname?: string;
      challengeTimestamp?: string;
    }
  | {
      ok: false;
      reason: string;
      errorCodes?: string[];
      hostname?: string;
      challengeTimestamp?: string;
    };

export type RequestDemoLogFields = {
  correlationId: string;
  operation: string;
  internalCode: string;
  providerCode?: string;
  providerErrorCodes?: string[];
  providerHostname?: string;
  providerChallengeTimestamp?: string;
  errorName: string;
};

export type RequestDemoDependencies = {
  isRateLimited(req: Request): boolean;
  getClientIp(req: Request): string;
  getTurnstileToken(formData: FormData): string;
  verifyTurnstile(token: string, ip: string, expectedHostname: string): Promise<TurnstileResult>;
  getConfig(): RequestDemoConfig;
  createPersistence(config: Required<Pick<RequestDemoConfig, "supabaseUrl" | "serviceRoleKey">>): RequestDemoPersistence;
  logError(event: string, fields: RequestDemoLogFields): void;
};

const genericMessage = "We could not submit your request. Please try again or contact support.";
export const requestDemoMaxRequestBytes = 32_000;
const fieldLimits = {
  name: 160,
  work_email: 254,
  company: 200,
  role: 160,
  message: 4_000,
  use_case: 100,
  status: 64,
  ai_usage_level: 100,
  company_size: 100,
  current_problem_category: 100,
  current_problem: 2_000,
} satisfies Record<keyof RequestDemoPayload, number>;

class RequestDemoBodyTooLargeError extends Error {}

async function boundedFormData(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return req.formData();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > requestDemoMaxRequestBytes) {
        await reader.cancel();
        throw new RequestDemoBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const headers = new Headers(req.headers);
  headers.delete("content-length");
  return new Request(req.url, {
    method: req.method,
    headers,
    body,
  }).formData();
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function buildPayload(formData: FormData): RequestDemoPayload {
  const currentProblemCategory = field(formData, "current_problem_category");
  const aiUsageLevel = field(formData, "urgency") || field(formData, "ai_usage_level");
  const designPartnerInterest = field(formData, "design_partner_interest") === "true";

  return {
    name: field(formData, "name"),
    work_email: field(formData, "email") || field(formData, "work_email"),
    company: field(formData, "company"),
    role: field(formData, "role"),
    company_size: field(formData, "company_size"),
    current_problem_category: currentProblemCategory,
    current_problem: field(formData, "current_problem"),
    ai_usage_level: aiUsageLevel,
    use_case: field(formData, "use_case") || (designPartnerInterest ? "design_partner_access" : ""),
    status: field(formData, "status") || (designPartnerInterest ? "design_partner_interest" : "new"),
    message: field(formData, "message"),
  };
}

function validPayload(payload: RequestDemoPayload) {
  if (!payload.name || !payload.work_email || !payload.company) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.work_email)) return false;
  return (Object.keys(fieldLimits) as Array<keyof RequestDemoPayload>)
    .every((key) => payload[key].length <= fieldLimits[key]);
}

function getEnterpriseInterestSignal(problemCategory: string) {
  const normalizedCategory = problemCategory.toLowerCase();

  if (normalizedCategory === "auditability") return "auditability_interest_detected";
  if (normalizedCategory === "ai_identity" || normalizedCategory === "provenance") {
    return "ai_identity_interest_detected";
  }
  if (
    normalizedCategory === "ownership"
    || normalizedCategory === "human_review"
    || normalizedCategory === "workflow_governance"
    || normalizedCategory === "compliance"
  ) {
    return "governance_interest_detected";
  }
  return "operational_trust_interest_detected";
}

function safeErrorName(error: unknown, fallback: string) {
  const name = error instanceof Error
    ? error.name
    : typeof (error as ProviderError | null)?.name === "string"
      ? (error as ProviderError).name
      : fallback;
  return name && /^[A-Za-z][A-Za-z0-9]*$/.test(name) ? name : fallback;
}

function safeProviderCode(error: ProviderError | null | undefined) {
  const code = String(error?.code ?? "").trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : undefined;
}

function logFailure(
  dependencies: RequestDemoDependencies,
  fields: RequestDemoLogFields,
) {
  try {
    dependencies.logError("request-demo submission failed", fields);
  } catch {
    // Logging must not replace the stable API failure response.
  }
}

export function enterpriseAccessErrorResponse(
  error: string,
  status: number,
  code: RequestDemoErrorCode,
  correlationId: string,
) {
  return Response.json(
    {
      ok: false,
      error,
      code,
      message: genericMessage,
      correlationId,
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-correlation-id": correlationId,
      },
    },
  );
}

function redirectResponse(req: Request, path: string, correlationId: string) {
  return new Response(null, {
    status: 303,
    headers: {
      location: new URL(path, req.url).toString(),
      "cache-control": "no-store",
      "x-correlation-id": correlationId,
    },
  });
}

export function createRequestDemoHandler(dependencies: RequestDemoDependencies) {
  return async function handleRequestDemo(req: Request, correlationId: string) {
    try {
      if (dependencies.isRateLimited(req)) {
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.rate_limit",
          internalCode: "REQUEST_DEMO_RATE_LIMITED",
          errorName: "RequestDemoError",
        });
        return enterpriseAccessErrorResponse(
          "Too many attempts. Please wait and try again.",
          429,
          "REQUEST_DEMO_RATE_LIMITED",
          correlationId,
        );
      }

      const config = dependencies.getConfig();
      const missingConfig = [
        !config.supabaseUrl ? "SUPABASE_URL" : "",
        !config.serviceRoleKey ? "SERVICE_ROLE_KEY" : "",
        !config.turnstileSecretConfigured ? "TURNSTILE_SECRET" : "",
        !config.turnstileSiteKeyConfigured ? "TURNSTILE_SITE_KEY" : "",
      ].filter(Boolean);

      if (missingConfig.length > 0) {
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.config",
          internalCode: `REQUEST_DEMO_CONFIG_MISSING_${missingConfig.join("_")}`,
          errorName: "RequestDemoError",
        });
        return enterpriseAccessErrorResponse(
          "Request Demo is temporarily unavailable.",
          503,
          "REQUEST_DEMO_CONFIG_MISSING",
          correlationId,
        );
      }

      const contentLength = Number(req.headers.get("content-length") ?? "0");
      if (Number.isFinite(contentLength) && contentLength > requestDemoMaxRequestBytes) {
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.validation",
          internalCode: "REQUEST_DEMO_PAYLOAD_TOO_LARGE",
          errorName: "RequestDemoError",
        });
        return enterpriseAccessErrorResponse(
          "The submitted request is too large.",
          413,
          "REQUEST_DEMO_PAYLOAD_TOO_LARGE",
          correlationId,
        );
      }

      let formData: FormData;
      try {
        formData = await boundedFormData(req);
      } catch (error) {
        if (error instanceof RequestDemoBodyTooLargeError) {
          logFailure(dependencies, {
            correlationId,
            operation: "request_demo.validation",
            internalCode: "REQUEST_DEMO_PAYLOAD_TOO_LARGE",
            errorName: "RequestDemoError",
          });
          return enterpriseAccessErrorResponse(
            "The submitted request is too large.",
            413,
            "REQUEST_DEMO_PAYLOAD_TOO_LARGE",
            correlationId,
          );
        }
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.validation",
          internalCode: "REQUEST_DEMO_VALIDATION_FAILED",
          errorName: "RequestDemoError",
        });
        return enterpriseAccessErrorResponse(
          "Additional information is required.",
          400,
          "REQUEST_DEMO_VALIDATION_FAILED",
          correlationId,
        );
      }

      const payload = buildPayload(formData);
      if (!validPayload(payload)) {
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.validation",
          internalCode: "REQUEST_DEMO_VALIDATION_FAILED",
          errorName: "RequestDemoError",
        });
        return enterpriseAccessErrorResponse(
          "Additional information is required.",
          400,
          "REQUEST_DEMO_VALIDATION_FAILED",
          correlationId,
        );
      }

      const turnstileToken = dependencies.getTurnstileToken(formData);

      if (!turnstileToken || turnstileToken.length > 2_048) {
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.turnstile",
          internalCode: "REQUEST_DEMO_TURNSTILE_TOKEN_MISSING",
          errorName: "RequestDemoError",
        });
        return enterpriseAccessErrorResponse(
          "Security check failed. Please try again.",
          400,
          "REQUEST_DEMO_TURNSTILE_TOKEN_MISSING",
          correlationId,
        );
      }

      const turnstile = await dependencies.verifyTurnstile(
        turnstileToken,
        dependencies.getClientIp(req),
        new URL(req.url).hostname,
      );

      if (!turnstile.ok) {
        const unavailable = [
          "provider_unavailable",
          "provider_error",
          "turnstile_not_configured",
        ].includes(turnstile.reason);
        const code: RequestDemoErrorCode = unavailable
          ? "REQUEST_DEMO_TURNSTILE_UNAVAILABLE"
          : "REQUEST_DEMO_TURNSTILE_FAILED";
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.turnstile",
          internalCode: code,
          providerCode: turnstile.reason,
          ...(turnstile.errorCodes ? { providerErrorCodes: turnstile.errorCodes } : {}),
          ...(turnstile.hostname ? { providerHostname: turnstile.hostname } : {}),
          ...(turnstile.challengeTimestamp
            ? { providerChallengeTimestamp: turnstile.challengeTimestamp }
            : {}),
          errorName: "TurnstileError",
        });
        return enterpriseAccessErrorResponse(
          "Security check failed. Please try again.",
          unavailable ? 503 : 400,
          code,
          correlationId,
        );
      }

      const persistence = dependencies.createPersistence({
        supabaseUrl: config.supabaseUrl!,
        serviceRoleKey: config.serviceRoleKey!,
      });
      const requestInsert = await persistence.insertRequest(payload);

      if (requestInsert.error) {
        const providerCode = safeProviderCode(requestInsert.error);
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.database_insert",
          internalCode: "REQUEST_DEMO_DATABASE_FAILED",
          ...(providerCode ? { providerCode } : {}),
          errorName: safeErrorName(requestInsert.error, "SupabaseError"),
        });
        return enterpriseAccessErrorResponse(
          "We could not complete this request.",
          500,
          "REQUEST_DEMO_DATABASE_FAILED",
          correlationId,
        );
      }

      const interestSignal = await persistence.insertInterestSignal({
        company: payload.company,
        role: payload.role || null,
        use_case: payload.use_case || payload.current_problem_category || payload.current_problem || null,
        interest_level: payload.ai_usage_level || "early_access_request",
        source: getEnterpriseInterestSignal(payload.current_problem_category),
        notes: [payload.current_problem_category, payload.current_problem, payload.message]
          .filter(Boolean)
          .join(" / ") || null,
      });

      if (interestSignal.error) {
        const providerCode = safeProviderCode(interestSignal.error);
        logFailure(dependencies, {
          correlationId,
          operation: "request_demo.interest_signal_insert",
          internalCode: "REQUEST_DEMO_INTEREST_SIGNAL_DATABASE_FAILED",
          ...(providerCode ? { providerCode } : {}),
          errorName: safeErrorName(interestSignal.error, "SupabaseError"),
        });
      }

      return redirectResponse(
        req,
        payload.use_case.endsWith("_waitlist")
          ? "/pro-waitlist?success=true"
          : "/enterprise-access?success=true",
        correlationId,
      );
    } catch (error) {
      logFailure(dependencies, {
        correlationId,
        operation: "request_demo.submit",
        internalCode: "REQUEST_DEMO_UNKNOWN",
        errorName: safeErrorName(error, "Error"),
      });
      return enterpriseAccessErrorResponse(
        "We could not submit your request. Please try again.",
        500,
        "REQUEST_DEMO_UNKNOWN",
        correlationId,
      );
    }
  };
}
