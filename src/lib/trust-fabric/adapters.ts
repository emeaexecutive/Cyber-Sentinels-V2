import { hashCanonical } from "../trust-core/hash.ts";
import type { EnterpriseSubjectClass, EvidenceClassification, FabricSubject } from "./types.ts";

export const trustProviderTypes = ["identity_provider", "model_provider", "agent_framework", "cloud_provider", "EDR", "SIEM", "IAM", "network_security", "evaluation_provider", "runtime_security"] as const;
export type TrustProviderType = (typeof trustProviderTypes)[number];
export type NormalizedProviderEvidence = {
  providerIdentity: string; providerType: TrustProviderType; sourceSystem: string; evidenceCategory: string;
  sourceIdentity: string; sourceType: string; sourceAuthority: string; enterpriseId: string;
  evidenceClassification: EvidenceClassification; subject: FabricSubject; observedAt: string; receivedAt: string;
  freshness: "current" | "stale" | "expired" | "unknown";
  confidence: number; evidenceStrength: string; integrityStatus: "verified" | "unverified" | "invalid" | "unknown";
  externalReference: string; normalizedData: Record<string, unknown>; restrictedRawReference: string | null;
  evidenceReference: { type: "provider_evidence"; id: string }; supersedesEvidenceReference: { type: "provider_evidence"; id: string } | null;
  derivedFromEvidenceReferences: Array<{ type: string; id: string; version?: string }>;
  correlationId: string; deterministicDigest: string;
  /** Compatibility aliases for pre-reconciliation consumers. */
  classification: EvidenceClassification | "assertion" | "observation"; timestamp: string; receiptTimestamp: string;
  restrictedRawDataReference: string | null;
};
export type ProviderEvidenceAdapter<T> = { key: string; normalize(input: T): NormalizedProviderEvidence };

export const syntheticEvidenceAdapter: ProviderEvidenceAdapter<{
  enterpriseId: string; providerIdentity: string; providerType: TrustProviderType; sourceAuthority: string;
  subjectType: EnterpriseSubjectClass; subjectId: string;
  displayName: string; observedAt: string; receivedAt: string; category: string;
  classification: EvidenceClassification | "assertion" | "observation";
  freshness: "current" | "stale" | "expired" | "unknown";
  confidence: number; evidenceStrength: string; integrityStatus: "verified" | "unverified" | "invalid" | "unknown";
  externalReference: string; normalizedData: Record<string, unknown>; correlationId: string;
  supersedesExternalReference?: string | null; derivedFromEvidenceReferences?: Array<{ type: string; id: string; version?: string }>;
}> = {
  key: "synthetic-example/1.0",
  normalize(input) {
    if (input.confidence < 0 || input.confidence > 1) throw new TypeError("Provider evidence confidence must be between 0 and 1.");
    const evidenceClassification = input.classification === "assertion" ? "asserted" : input.classification === "observation" ? "observed" : input.classification;
    if (evidenceClassification === "cryptographically_attested" && input.integrityStatus !== "verified") {
      throw new TypeError("Cryptographic evidence requires verified integrity metadata.");
    }
    const classification: EvidenceClassification | "assertion" | "observation" = evidenceClassification === "asserted" ? "assertion" : evidenceClassification === "observed" ? "observation" : evidenceClassification;
    const output = {
      enterpriseId: input.enterpriseId, providerIdentity: input.providerIdentity, providerType: input.providerType,
      sourceIdentity: input.providerIdentity, sourceType: input.providerType, sourceAuthority: input.sourceAuthority,
      sourceSystem: "synthetic_example",
      evidenceCategory: input.category, evidenceClassification, classification,
      subject: { type: input.subjectType, id: input.subjectId, displayName: input.displayName },
      observedAt: input.observedAt, receivedAt: input.receivedAt, timestamp: input.observedAt, receiptTimestamp: input.receivedAt,
      freshness: input.freshness, confidence: input.confidence, evidenceStrength: input.evidenceStrength, integrityStatus: input.integrityStatus,
      externalReference: input.externalReference, normalizedData: input.normalizedData,
      evidenceReference: { type: "provider_evidence" as const, id: input.externalReference },
      supersedesEvidenceReference: input.supersedesExternalReference ? { type: "provider_evidence" as const, id: input.supersedesExternalReference } : null,
      derivedFromEvidenceReferences: input.derivedFromEvidenceReferences ?? [],
      restrictedRawReference: null, restrictedRawDataReference: null, correlationId: input.correlationId,
    };
    return { ...output, deterministicDigest: hashCanonical(output) };
  },
};
