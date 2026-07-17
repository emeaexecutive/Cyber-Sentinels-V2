import { ORI_DATASET_VERSION, ORI_FEATURE_SCHEMA_VERSION } from "./constants.ts";

export type OriSyntheticDatasetRow = {
  caseId: string;
  datasetVersion: string;
  evidenceStatus: "SYNTHETIC";
  expectedClass: "LOW" | "MODERATE" | "HIGH" | "ABSTAIN";
  reviewerReference: null;
  featureSchemaVersion: string;
  source: "CONTROLLED_SYNTHETIC_FIXTURE";
  approvalState: "APPROVED_FOR_CONTROLLED_TEST";
  featureValues: Readonly<Record<string, boolean | number | null>>;
  limitations: readonly string[];
};

const limitations = Object.freeze([
  "Synthetic behavior fixture only; not production accuracy evidence.",
  "The row cannot authorize, block, approve, reject, or verify.",
]);

function row(
  caseId: string,
  expectedClass: OriSyntheticDatasetRow["expectedClass"],
  featureValues: OriSyntheticDatasetRow["featureValues"]
): OriSyntheticDatasetRow {
  return Object.freeze({
    caseId,
    datasetVersion: ORI_DATASET_VERSION,
    evidenceStatus: "SYNTHETIC",
    expectedClass,
    reviewerReference: null,
    featureSchemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    source: "CONTROLLED_SYNTHETIC_FIXTURE",
    approvalState: "APPROVED_FOR_CONTROLLED_TEST",
    featureValues: Object.freeze({ ...featureValues }),
    limitations,
  });
}

export const ORI_SYNTHETIC_DATASET_V1: readonly OriSyntheticDatasetRow[] = Object.freeze([
  row("ori-syn-low-001", "LOW", { identity_verification_present: true, identity_evidence_age_days: 0, evidence_freshness_ratio: 1, missing_evidence_ratio: 0, replay_available: true, trust_memory_prior_review_count: 0, authority_scope_mismatch: false }),
  row("ori-syn-low-002", "LOW", { identity_verification_present: true, identity_evidence_age_days: 7, evidence_freshness_ratio: 0.92, missing_evidence_ratio: 0, replay_available: true, trust_memory_prior_review_count: 1, authority_scope_mismatch: false }),
  row("ori-syn-moderate-001", "MODERATE", { identity_verification_present: true, identity_evidence_age_days: 90, evidence_freshness_ratio: 0, missing_evidence_ratio: 0.33, replay_available: true, trust_memory_prior_review_count: 5, authority_scope_mismatch: true }),
  row("ori-syn-moderate-002", "MODERATE", { identity_verification_present: false, identity_evidence_age_days: 20, evidence_freshness_ratio: 0.78, missing_evidence_ratio: 0.17, replay_available: true, trust_memory_prior_review_count: 2, authority_scope_mismatch: false }),
  row("ori-syn-high-001", "HIGH", { identity_verification_present: false, identity_evidence_age_days: 365, evidence_freshness_ratio: 0, missing_evidence_ratio: 1, replay_available: false, trust_memory_prior_review_count: 20, authority_scope_mismatch: true }),
  row("ori-syn-high-002", "HIGH", { identity_verification_present: false, identity_evidence_age_days: 180, evidence_freshness_ratio: 0, missing_evidence_ratio: 0.66, replay_available: false, trust_memory_prior_review_count: 10, authority_scope_mismatch: true }),
  row("ori-syn-abstain-001", "ABSTAIN", { identity_verification_present: false, identity_evidence_age_days: null, evidence_freshness_ratio: null, missing_evidence_ratio: 0.5, replay_available: true, trust_memory_prior_review_count: null, authority_scope_mismatch: null }),
  row("ori-syn-abstain-002", "ABSTAIN", { identity_verification_present: false, identity_evidence_age_days: null, evidence_freshness_ratio: null, missing_evidence_ratio: 0.67, replay_available: false, trust_memory_prior_review_count: null, authority_scope_mismatch: null }),
]);
