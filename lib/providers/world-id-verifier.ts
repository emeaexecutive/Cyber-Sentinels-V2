import { createHash } from "node:crypto";
import { signRequest } from "@worldcoin/idkit-core/signing";
import { createWorldIdReplayStore, resetWorldIdReplayStoreForTests, type WorldIdReplayClaimInput } from "./world-id-replay-repository.ts";

export type WorldIdProofInput = {
  idkitResponse?: unknown;
  tenantId?: unknown;
  subjectId?: unknown;
};

export type WorldIdVerificationResult = {
  ok: boolean;
  serverVerified: boolean;
  providerVerified: boolean;
  rpRequestSigned: boolean;
  reasonCode: string;
  confidence: number;
  providerReference?: string;
  payloadHash?: string;
  nullifierDigest?: string;
  evidenceReferences?: string[];
  status?: "VERIFIED" | "INCONCLUSIVE" | "FAILED";
  normalizedEvidence?: {
    provider: "world_id";
    verificationStatus: "verified";
    protocolVersion: string;
    action: string;
    environment: string;
    applicationId: string;
    relyingPartyId: string;
    subjectDigest: string;
    providerReference: string;
    credentialIdentifiers: string[];
    userPresenceCompleted: boolean;
    providerVerifiedAt: string | null;
  };
};

type JsonObject = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function configuredWorldId() {
  return {
    appId: text(process.env.NEXT_PUBLIC_WORLD_APP_ID).trim(),
    rpId: text(process.env.WORLD_RP_ID).trim(),
    action: text(process.env.WORLD_ACTION).trim(),
    signingKey: text(process.env.WORLD_RP_SIGNING_KEY).trim(),
    environment: text(process.env.WORLD_ID_ENVIRONMENT).trim(),
  };
}

export function inspectWorldIdConfiguration() {
  const config = configuredWorldId();
  const missing = [
    ["NEXT_PUBLIC_WORLD_APP_ID", config.appId],
    ["WORLD_RP_ID", config.rpId],
    ["WORLD_ACTION", config.action],
    ["WORLD_RP_SIGNING_KEY", config.signingKey],
    ["WORLD_ID_ENVIRONMENT", config.environment],
  ].filter(([, value]) => !value).map(([name]) => name);
  const invalid = [
    ...(!config.appId.startsWith("app_") && config.appId ? ["NEXT_PUBLIC_WORLD_APP_ID"] : []),
    ...(!config.rpId.startsWith("rp_") && config.rpId ? ["WORLD_RP_ID"] : []),
    ...(!["staging", "production"].includes(config.environment) && config.environment ? ["WORLD_ID_ENVIRONMENT"] : []),
  ];
  return { config, configured: missing.length === 0 && invalid.length === 0, missing, invalid };
}

function canonicalizeWorldIdNullifier(value: unknown) {
  const candidate = text(value).trim();
  if (/^0x[0-9a-f]+$/i.test(candidate) || /^\d+$/.test(candidate)) {
    try {
      return BigInt(candidate).toString(10);
    } catch {
      return "";
    }
  }
  return "";
}

function digestWorldIdNullifier(value: unknown) {
  const canonical = canonicalizeWorldIdNullifier(value);
  return canonical ? createHash("sha256").update(canonical).digest("hex") : "";
}

function proofResponse(input: unknown) {
  const response = object(input);
  if (!response || response.protocol_version !== "4.0" || !Array.isArray(response.responses) || response.responses.length === 0) return null;
  const responses = response.responses.map(object);
  if (responses.some((item) => !item)) return null;
  const uniqueness = responses.find((item) => item && typeof item.nullifier === "string");
  if (!uniqueness) return null;
  return {
    raw: response,
    action: text(response.action).trim(),
    environment: text(response.environment).trim(),
    protocolVersion: text(response.protocol_version),
    nullifier: text(uniqueness.nullifier),
    credentialIdentifiers: responses.map((item) => text(item?.identifier)).filter(Boolean),
    userPresenceCompleted: response.user_presence_completed === true,
  };
}

export function resetWorldIdReplayStore() {
  resetWorldIdReplayStoreForTests();
}

export async function verifyWorldIdProof(input: WorldIdProofInput): Promise<WorldIdVerificationResult> {
  const configuration = inspectWorldIdConfiguration();
  const tenantId = text(input.tenantId).trim();
  const subjectId = text(input.subjectId).trim();

  if (!configuration.configured) {
    return {
      ok: false, serverVerified: false, providerVerified: false, rpRequestSigned: false,
      reasonCode: "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED", confidence: 0,
      evidenceReferences: [`World ID configuration is incomplete: ${[...configuration.missing, ...configuration.invalid].join(", ")}.`],
      status: "INCONCLUSIVE",
    };
  }

  const parsed = proofResponse(input.idkitResponse);
  if (!parsed || !parsed.action || !parsed.nullifier || !parsed.environment) {
    return {
      ok: false, serverVerified: false, providerVerified: false, rpRequestSigned: false,
      reasonCode: "WORLD_ID_INVALID_PROOF", confidence: 0,
      evidenceReferences: ["A complete World ID 4.0 uniqueness result is required."], status: "INCONCLUSIVE",
    };
  }

  if (parsed.action !== configuration.config.action || parsed.environment !== configuration.config.environment) {
    return {
      ok: false, serverVerified: false, providerVerified: false, rpRequestSigned: false,
      reasonCode: "WORLD_ID_APP_ACTION_MISMATCH", confidence: 0,
      evidenceReferences: ["World ID action or environment did not match the server-owned configuration."], status: "INCONCLUSIVE",
    };
  }

  if (!tenantId || !subjectId) {
    return {
      ok: false, serverVerified: false, providerVerified: false, rpRequestSigned: false,
      reasonCode: "WORLD_ID_INVALID_PROOF", confidence: 0,
      evidenceReferences: ["A server-resolved tenant and subject are required for durable replay protection."], status: "INCONCLUSIVE",
    };
  }

  const canonicalNullifier = canonicalizeWorldIdNullifier(parsed.nullifier);
  const nullifierDigest = digestWorldIdNullifier(parsed.nullifier);
  if (!canonicalNullifier || !nullifierDigest) {
    return {
      ok: false, serverVerified: false, providerVerified: false, rpRequestSigned: false,
      reasonCode: "WORLD_ID_INVALID_PROOF", confidence: 0,
      evidenceReferences: ["World ID returned an invalid uniqueness nullifier."], status: "INCONCLUSIVE",
    };
  }

  // Forward the complete IDKit result without remapping fields.
  const payload = JSON.stringify(parsed.raw);
  const payloadHash = createHash("sha256").update(payload).digest("hex");
  const providerReference = `world-id:${configuration.config.rpId}:${nullifierDigest}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`https://developer.world.org/api/v4/verify/${encodeURIComponent(configuration.config.rpId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      signal: controller.signal,
    });
    const providerResponse = object(await response.json().catch(() => null));
    const providerResults = Array.isArray(providerResponse?.results) ? providerResponse.results.map(object).filter(Boolean) as JsonObject[] : [];
    const providerNullifier = text(providerResponse?.nullifier).trim()
      || text(providerResults.find((result) => result.success === true)?.nullifier).trim();
    const successfulProviderResult = providerResults.find((result) => result.success === true);
    const providerVerified = response.ok
      && providerResponse?.success === true
      && Boolean(successfulProviderResult)
      && text(successfulProviderResult?.identifier).trim().length > 0
      && parsed.credentialIdentifiers.includes(text(successfulProviderResult?.identifier).trim())
      && text(providerResponse?.action).trim() === parsed.action
      && text(providerResponse?.environment).trim() === parsed.environment
      && canonicalizeWorldIdNullifier(providerNullifier) === canonicalNullifier;

    if (!providerVerified) {
      return {
        ok: false, serverVerified: false, providerVerified: false, rpRequestSigned: true,
        reasonCode: "WORLD_ID_PROVIDER_VERIFICATION_FAILED", confidence: 0,
        providerReference, payloadHash, nullifierDigest,
        evidenceReferences: ["World ID provider verification rejected the proof or returned inconsistent nullifier evidence."],
        status: "INCONCLUSIVE",
      };
    }

    const replayStore = createWorldIdReplayStore();
    const replayInput: WorldIdReplayClaimInput = {
      enterpriseId: tenantId,
      action: parsed.action,
      subjectReference: subjectId,
      nullifierHash: canonicalNullifier,
      providerReference,
      verificationReference: providerReference,
      payloadHash,
    };
    const replayClaim = await replayStore.claim(replayInput);
    if (!replayClaim.accepted) {
      return {
        ok: false, serverVerified: false, providerVerified: false, rpRequestSigned: true,
        reasonCode: replayClaim.reasonCode === "WORLD_ID_DUPLICATE_NULLIFIER" ? "WORLD_ID_NULLIFIER_REPLAY" : (replayClaim.reasonCode ?? "WORLD_ID_NULLIFIER_REPLAY"),
        confidence: 0, providerReference, payloadHash, nullifierDigest,
        evidenceReferences: ["World ID nullifier was already claimed for this action."], status: "FAILED",
      };
    }

    return {
      ok: true, serverVerified: true, providerVerified: true, rpRequestSigned: true,
      reasonCode: "WORLD_ID_PROVIDER_VERIFIED", confidence: 90, providerReference, payloadHash, nullifierDigest,
      evidenceReferences: ["World ID provider verification succeeded.", "The proof remained bound to the configured RP, action and environment."],
      status: "VERIFIED",
      normalizedEvidence: {
        provider: "world_id",
        verificationStatus: "verified",
        protocolVersion: parsed.protocolVersion,
        action: parsed.action,
        environment: parsed.environment,
        applicationId: configuration.config.appId,
        relyingPartyId: configuration.config.rpId,
        subjectDigest: nullifierDigest,
        providerReference,
        credentialIdentifiers: parsed.credentialIdentifiers,
        userPresenceCompleted: parsed.userPresenceCompleted,
        providerVerifiedAt: text(providerResponse?.created_at).trim() || null,
      },
    };
  } catch (error) {
    const reasonCode = error instanceof Error && error.name === "AbortError" ? "WORLD_ID_PROVIDER_UNAVAILABLE" : "WORLD_ID_PROVIDER_VERIFICATION_FAILED";
    return {
      ok: false, serverVerified: false, providerVerified: false, rpRequestSigned: true,
      reasonCode, confidence: 0, providerReference, payloadHash, nullifierDigest,
      evidenceReferences: ["World ID provider verification could not be completed."], status: "INCONCLUSIVE",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function createWorldIdRpSignature() {
  const configuration = inspectWorldIdConfiguration();
  if (!configuration.configured) throw new Error("World ID RP signing is not configured.");
  const signature = signRequest({ signingKeyHex: configuration.config.signingKey, action: configuration.config.action, ttl: 300 });
  return {
    sig: signature.sig,
    nonce: signature.nonce,
    created_at: signature.createdAt,
    expires_at: signature.expiresAt,
    rp_id: configuration.config.rpId,
    app_id: configuration.config.appId,
    action: configuration.config.action,
    environment: configuration.config.environment as "staging" | "production",
  };
}
