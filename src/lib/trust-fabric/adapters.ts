import { hashCanonical } from "../trust-core/hash.ts";
import type { EnterpriseSubjectClass, FabricSubject } from "./types.ts";

export const trustProviderTypes = ["identity_provider", "model_provider", "agent_framework", "cloud_provider", "EDR", "SIEM", "IAM", "network_security", "evaluation_provider", "runtime_security"] as const;
export type TrustProviderType = (typeof trustProviderTypes)[number];
export type NormalizedProviderEvidence = {
  providerIdentity: string; providerType: TrustProviderType; sourceSystem: string; evidenceCategory: string;
  classification: "assertion" | "observation"; subject: FabricSubject; timestamp: string; receiptTimestamp: string;
  confidence: number; evidenceStrength: string; integrityStatus: "verified" | "unverified" | "invalid" | "unknown";
  externalReference: string; normalizedData: Record<string, unknown>; restrictedRawDataReference: string | null;
  correlationId: string; deterministicDigest: string;
};
export type ProviderEvidenceAdapter<T> = { key: string; normalize(input: T): NormalizedProviderEvidence };

export const syntheticEvidenceAdapter: ProviderEvidenceAdapter<{
  providerIdentity: string; providerType: TrustProviderType; subjectType: EnterpriseSubjectClass; subjectId: string;
  displayName: string; observedAt: string; receivedAt: string; category: string; classification: "assertion" | "observation";
  confidence: number; evidenceStrength: string; integrityStatus: "verified" | "unverified" | "invalid" | "unknown";
  externalReference: string; normalizedData: Record<string, unknown>; correlationId: string;
}> = {
  key: "synthetic-example/1.0",
  normalize(input) {
    if (input.confidence < 0 || input.confidence > 1) throw new TypeError("Provider evidence confidence must be between 0 and 1.");
    const output = { providerIdentity: input.providerIdentity, providerType: input.providerType, sourceSystem: "synthetic_example", evidenceCategory: input.category, classification: input.classification, subject: { type: input.subjectType, id: input.subjectId, displayName: input.displayName }, timestamp: input.observedAt, receiptTimestamp: input.receivedAt, confidence: input.confidence, evidenceStrength: input.evidenceStrength, integrityStatus: input.integrityStatus, externalReference: input.externalReference, normalizedData: input.normalizedData, restrictedRawDataReference: null, correlationId: input.correlationId };
    return { ...output, deterministicDigest: hashCanonical(output) };
  },
};
