import { createHash } from "node:crypto";
import type { EvidenceOutcome, IdentityEvidenceType, NormalizedIdentityEvidence, ProviderContext, VerifiedProviderCallback } from "./types.ts";

export function normalizedEvidenceIdempotencyKey(input: {
  providerEventId: string;
  providerSessionId: string;
  evidenceType: IdentityEvidenceType;
  mappingVersion: string;
}) {
  return createHash("sha256")
    .update(`${input.providerEventId}:${input.providerSessionId}:${input.evidenceType}:${input.mappingVersion}`, "utf8")
    .digest("hex");
}

export function buildNormalizedIdentityEvidence(input: {
  callback: VerifiedProviderCallback;
  context: ProviderContext;
  evidenceType: IdentityEvidenceType;
  outcome: EvidenceOutcome;
  assuranceLevel?: number | null;
  observedAt: string;
  expiresAt?: string | null;
  mappingVersion: string;
  attributes?: NormalizedIdentityEvidence["attributes"];
  limitations?: string[];
}): NormalizedIdentityEvidence {
  return {
    schemaVersion: 1,
    idempotencyKey: normalizedEvidenceIdempotencyKey({
      providerEventId: input.callback.eventId,
      providerSessionId: input.callback.providerSessionId,
      evidenceType: input.evidenceType,
      mappingVersion: input.mappingVersion,
    }),
    tenantId: input.context.tenantId,
    trustSessionId: input.context.trustSessionId,
    correlationId: input.context.correlationId,
    provider: input.callback.provider,
    providerSessionId: input.callback.providerSessionId,
    providerEventId: input.callback.eventId,
    evidenceType: input.evidenceType,
    outcome: input.outcome,
    assuranceLevel: input.assuranceLevel ?? null,
    observedAt: input.observedAt,
    expiresAt: input.expiresAt ?? null,
    sourceDigest: input.callback.sourceDigest,
    mappingVersion: input.mappingVersion,
    attributes: input.attributes ?? {},
    limitations: input.limitations ?? [],
  };
}
