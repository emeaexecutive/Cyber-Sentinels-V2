import type { EnterpriseSubjectClass } from "../../src/lib/trust-fabric/types.ts";
import type { CanonicalTransactionDecision, SafeCanonicalTransactionReceipt } from "../../src/lib/trust-transaction/canonical.ts";

type Row = Record<string, unknown>;

export type WorldIdQualificationInput = {
  tenantId: string;
  actorId: string;
  subjectId: string;
  subjectType: EnterpriseSubjectClass;
  operationalEntityId?: string | null;
  requestedAction: string;
  requestedPurpose: string;
  resource: string;
  environment: string;
  payloadDigest: string;
  idkitResponse: unknown;
};

export type WorldIdQualificationResult = {
  ok: true;
  worldProvider: { status: "VERIFIED"; reference: string };
  replayClaim: { status: "ACCEPTED"; reference: string };
  identityAssurance: { status: string; score: number; reference: string; evidenceReference: string };
  authority: { status: "VERIFIED" | "REJECTED"; reference: string; version: string | null };
  policy: { status: "EVALUATED"; id: string; version: string };
  decision: CanonicalTransactionDecision;
  transactionId: string;
  decisionId: string;
  evidenceReference: string;
  receiptReference: string;
  replayReference: string;
  trustMemoryReference: string;
  reasonCodes: string[];
};

export type FailedWorldIdQualification = {
  ok: false;
  reasonCode: string;
  worldProvider: { status: "VERIFIED" | "FAILED"; reference: string | null };
  replayClaim: { status: "ACCEPTED" | "REJECTED" | "FAILED" | "NOT_ATTEMPTED"; reference: string | null };
  identityAssurance: { status: string; score: number | null; reference: string | null; evidenceReference: string | null };
  authority: { status: "FAILED" | "NOT_EVALUATED"; reference: null };
  policy: { status: "FAILED" | "NOT_EVALUATED"; id: null; version: null };
  decision: null;
  transactionId: null;
  receiptReference: null;
  replayReference: null;
  trustMemoryReference: null;
};

export class WorldIdQualificationError extends Error {
  readonly status: number;
  readonly result: FailedWorldIdQualification;

  constructor(status: number, result: FailedWorldIdQualification) {
    super(result.reasonCode);
    this.name = "WorldIdQualificationError";
    this.status = status;
    this.result = result;
  }
}

export type WorldIdQualificationServices = {
  verifyIdentity(input: WorldIdQualificationInput & { correlationId: string; idempotencyKey: string }): Promise<{
    requestId: string;
    details: { evidence?: Row[]; confidence?: Row | null } | null;
  }>;
  executeCanonical(input: WorldIdQualificationInput & { correlationId: string; idempotencyKey: string }): Promise<SafeCanonicalTransactionReceipt>;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function identityFailure(reasonCode: string, input?: { requestId?: string; evidence?: Row; confidence?: Row | null }): FailedWorldIdQualification {
  const duplicate = ["WORLD_ID_NULLIFIER_REPLAY", "WORLD_ID_DUPLICATE_NULLIFIER"].includes(reasonCode);
  const replayFailure = duplicate || reasonCode === "WORLD_ID_REPLAY_STORE_UNAVAILABLE";
  return {
    ok: false,
    reasonCode,
    worldProvider: { status: replayFailure ? "VERIFIED" : "FAILED", reference: text(input?.evidence?.provider_reference) || null },
    replayClaim: { status: duplicate ? "REJECTED" : replayFailure ? "FAILED" : "NOT_ATTEMPTED", reference: null },
    identityAssurance: {
      status: text(input?.confidence?.status) || "FAILED",
      score: Number.isFinite(Number(input?.confidence?.score)) ? Number(input?.confidence?.score) : null,
      reference: input?.requestId ?? null,
      evidenceReference: text(input?.evidence?.id) || null,
    },
    authority: { status: "NOT_EVALUATED", reference: null },
    policy: { status: "NOT_EVALUATED", id: null, version: null },
    decision: null,
    transactionId: null,
    receiptReference: null,
    replayReference: null,
    trustMemoryReference: null,
  };
}

function canonicalFailure(error: unknown, verified: { requestId: string; evidence: Row; confidence: Row }): FailedWorldIdQualification {
  const reasonCode = text((error as { code?: unknown })?.code) || (error instanceof Error ? error.message : "TRUST_TRANSACTION_UNAVAILABLE");
  const authorityFailed = reasonCode.includes("AUTHORITY");
  const policyFailed = reasonCode.includes("POLICY");
  return {
    ...identityFailure(reasonCode, verified),
    worldProvider: { status: "VERIFIED", reference: text(verified.evidence.provider_reference) || null },
    replayClaim: { status: "ACCEPTED", reference: text(verified.evidence.provider_reference) || null },
    identityAssurance: {
      status: text(verified.confidence.status) || "PROVISIONAL",
      score: Number(verified.confidence.score ?? 0),
      reference: verified.requestId,
      evidenceReference: text(verified.evidence.id) || null,
    },
    authority: { status: authorityFailed ? "FAILED" : "NOT_EVALUATED", reference: null },
    policy: { status: policyFailed ? "FAILED" : "NOT_EVALUATED", id: null, version: null },
  };
}

export async function orchestrateWorldIdQualification(input: WorldIdQualificationInput, services: WorldIdQualificationServices): Promise<WorldIdQualificationResult> {
  const correlationId = crypto.randomUUID();
  let identity;
  try {
    identity = await services.verifyIdentity({ ...input, correlationId, idempotencyKey: `world-identity-${crypto.randomUUID()}` });
  } catch (error) {
    const reasonCode = text((error as { code?: unknown })?.code) || "IDENTITY_PERSISTENCE_FAILED";
    throw new WorldIdQualificationError(Number((error as { status?: unknown })?.status) || 503, identityFailure(reasonCode));
  }

  const evidence = identity.details?.evidence?.find((item) => item.provider_id === "world_id");
  const confidence = identity.details?.confidence ?? null;
  const reasonCode = Array.isArray(evidence?.reason_codes) ? text(evidence.reason_codes[0]) : "";
  const verified = evidence?.signal_status === "PASS"
    && evidence?.outcome === "VERIFIED"
    && evidence?.server_verified === true
    && evidence?.signature_verified === true
    && text(evidence?.provider_reference).length > 0
    && /^[a-f0-9]{64}$/.test(text(evidence?.source_digest));
  if (!evidence || !confidence || !verified) {
    const code = reasonCode || "WORLD_ID_IDENTITY_ASSURANCE_FAILED";
    throw new WorldIdQualificationError(code.includes("REPLAY") || code.includes("DUPLICATE") ? 409 : 400, identityFailure(code, { requestId: identity.requestId, evidence, confidence }));
  }

  let receipt: SafeCanonicalTransactionReceipt;
  try {
    receipt = await services.executeCanonical({ ...input, correlationId, idempotencyKey: `world-canonical-${crypto.randomUUID()}` });
  } catch (error) {
    throw new WorldIdQualificationError(Number((error as { status?: unknown })?.status) || 503, canonicalFailure(error, { requestId: identity.requestId, evidence, confidence }));
  }
  if (!receipt.trustMemoryReference) {
    const error = Object.assign(new Error("TRUST_MEMORY_NOT_EMITTED"), { code: "TRUST_MEMORY_NOT_EMITTED" });
    throw new WorldIdQualificationError(503, canonicalFailure(error, { requestId: identity.requestId, evidence, confidence }));
  }

  return {
    ok: true,
    worldProvider: { status: "VERIFIED", reference: text(evidence.provider_reference) },
    replayClaim: { status: "ACCEPTED", reference: text(evidence.provider_reference) },
    identityAssurance: { status: text(confidence.status), score: Number(confidence.score), reference: identity.requestId, evidenceReference: text(evidence.id) },
    authority: { status: receipt.reasonCodes.includes("AUTHORITY_SCOPE_VALID") ? "VERIFIED" : "REJECTED", reference: receipt.authorityReference, version: receipt.authorityVersion },
    policy: { status: "EVALUATED", id: receipt.policy.id, version: receipt.policy.version },
    decision: receipt.decision,
    transactionId: receipt.transactionId,
    decisionId: receipt.decisionReference,
    evidenceReference: text(evidence.id),
    receiptReference: `/api/trust/transactions/${receipt.transactionId}/receipt`,
    replayReference: receipt.replayReference,
    trustMemoryReference: receipt.trustMemoryReference,
    reasonCodes: receipt.reasonCodes,
  };
}
