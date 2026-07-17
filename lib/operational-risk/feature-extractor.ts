import { ORI_FEATURE_SCHEMA_VERSION } from "./constants.ts";
import { clipApprovedExtractedCount, constrainApprovedExtractedRatio } from "./feature-normalizer.ts";
import type { OriFeatureValue, OriNormalizedEvidence } from "./types.ts";

const dayMs = 24 * 60 * 60 * 1000;

function feature(input: OriNormalizedEvidence, featureId: string, value: boolean | number | string): OriFeatureValue {
  return {
    featureId,
    schemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    value,
    sourceEvidenceIds: [...new Set(input.sourceEvidenceIds)].sort(),
    sourceTenantId: input.tenantId,
    sourceTrustSessionId: input.trustSessionId,
  };
}

export function extractOriFeatures(input: OriNormalizedEvidence): OriFeatureValue[] {
  const now = input.now ?? new Date();
  const hasIdentity = input.identityConfidence != null || input.proofOfHuman != null;
  const identityPresent = input.proofOfHuman === "verified" || (input.identityConfidence ?? 0) > 0;
  let evidenceAgeDays: number | null = null;
  if (input.evidenceLastSeenAt) {
    const parsed = Date.parse(input.evidenceLastSeenAt);
    if (Number.isFinite(parsed)) {
      evidenceAgeDays = clipApprovedExtractedCount((now.getTime() - parsed) / dayMs, 0, 365);
    }
  }
  const sourceAvailability = [
    hasIdentity,
    evidenceAgeDays !== null,
    input.governanceHistory !== undefined,
    input.intentRisk != null,
    true,
    true,
  ];
  const missingRatio = constrainApprovedExtractedRatio(
    sourceAvailability.filter((available) => !available).length / sourceAvailability.length
  );
  const features: OriFeatureValue[] = [
    feature(input, "missing_evidence_ratio", missingRatio),
    feature(input, "replay_available", input.replayAvailable),
  ];
  if (hasIdentity) features.push(feature(input, "identity_verification_present", identityPresent));
  if (evidenceAgeDays !== null) {
    features.push(feature(input, "identity_evidence_age_days", evidenceAgeDays));
    features.push(
      feature(input, "evidence_freshness_ratio", constrainApprovedExtractedRatio(1 - evidenceAgeDays / 90))
    );
  }
  if (input.governanceHistory !== undefined) {
    const reviews = input.governanceHistory.filter((outcome) => outcome !== "approved").length;
    features.push(feature(input, "trust_memory_prior_review_count", clipApprovedExtractedCount(reviews, 0, 20)));
  }
  if (input.intentRisk != null) {
    features.push(feature(input, "authority_scope_mismatch", input.intentRisk > 80));
  }
  return features.sort((left, right) => left.featureId.localeCompare(right.featureId));
}
