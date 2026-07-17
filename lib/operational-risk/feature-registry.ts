import { createHash } from "node:crypto";
import { ORI_FEATURE_SCHEMA_VERSION, ORI_MODEL_VERSION } from "./constants.ts";
import type { OriFeatureDefinition } from "./types.ts";

const createdAt = "2026-07-17T00:00:00.000Z";

export const ORI_FEATURE_REGISTRY_V1: readonly OriFeatureDefinition[] = Object.freeze([
  {
    id: "identity_verification_present",
    name: "Identity verification present",
    version: "1.0.0",
    schemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    description: "Whether normalized identity evidence was available to the authoritative Trust Decision.",
    dataType: "boolean",
    source: "Normalized Trust Decision identity evidence",
    sensitivity: "INTERNAL",
    required: true,
    defaultBehavior: "ABSTAIN",
    normalization: "false=0; true=1",
    retentionImplication: "Stores only a boolean and evidence references; no identity payload is retained.",
    limitations: ["Presence does not establish identity validity or authorization."],
    active: true,
    firstSupportedModelVersion: ORI_MODEL_VERSION,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "identity_evidence_age_days",
    name: "Identity evidence age",
    version: "1.0.0",
    schemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    description: "Whole UTC days since the normalized evidence timestamp.",
    dataType: "integer",
    source: "Normalized Trust Decision evidence timestamp",
    sensitivity: "INTERNAL",
    minimum: 0,
    maximum: 365,
    required: false,
    defaultBehavior: "ABSTAIN",
    normalization: "Clip trusted extracted counts to 0..365, then min-max scale for inference.",
    retentionImplication: "Stores an age count, never the underlying document or identity payload.",
    limitations: ["Age is freshness context, not evidence quality."],
    active: true,
    firstSupportedModelVersion: ORI_MODEL_VERSION,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "evidence_freshness_ratio",
    name: "Evidence freshness ratio",
    version: "1.0.0",
    schemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    description: "Bounded freshness derived from evidence age using a 90-day review horizon.",
    dataType: "number",
    source: "Derived from normalized evidence age",
    sensitivity: "INTERNAL",
    minimum: 0,
    maximum: 1,
    required: false,
    defaultBehavior: "ABSTAIN",
    normalization: "max(0, 1 - ageDays/90), constrained to 0..1.",
    retentionImplication: "Stores a ratio only.",
    limitations: ["Freshness does not imply authenticity or sufficiency."],
    active: true,
    firstSupportedModelVersion: ORI_MODEL_VERSION,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "missing_evidence_ratio",
    name: "Missing evidence ratio",
    version: "1.0.0",
    schemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    description: "Share of approved source fields unavailable during deterministic extraction.",
    dataType: "number",
    source: "ORI deterministic feature extraction coverage",
    sensitivity: "INTERNAL",
    minimum: 0,
    maximum: 1,
    required: true,
    defaultBehavior: "ABSTAIN",
    normalization: "missing approved source fields / approved source field count, constrained to 0..1.",
    retentionImplication: "Stores aggregate coverage only.",
    limitations: ["Coverage does not measure correctness of available evidence."],
    active: true,
    firstSupportedModelVersion: ORI_MODEL_VERSION,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "replay_available",
    name: "Replay available",
    version: "1.0.0",
    schemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    description: "Whether the authoritative workflow reported a retained or scheduled Replay record.",
    dataType: "boolean",
    source: "Existing Trust Workflow Executor",
    sensitivity: "INTERNAL",
    required: true,
    defaultBehavior: "ABSTAIN",
    normalization: "false=0; true=1",
    retentionImplication: "Stores a boolean and references only.",
    limitations: ["Availability does not assert completeness of Replay contents."],
    active: true,
    firstSupportedModelVersion: ORI_MODEL_VERSION,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "trust_memory_prior_review_count",
    name: "Prior governance review count",
    version: "1.0.0",
    schemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    description: "Count of review, escalation, or blocked outcomes supplied in authoritative governance history.",
    dataType: "integer",
    source: "Governance history already supplied to the Trust Decision pipeline",
    sensitivity: "CONFIDENTIAL",
    minimum: 0,
    maximum: 20,
    required: false,
    defaultBehavior: "ABSTAIN",
    normalization: "Clip trusted extracted count to 0..20, then min-max scale for inference.",
    retentionImplication: "Stores an aggregate count, not reviewer notes or identities.",
    limitations: ["Historical review volume does not establish present risk."],
    active: true,
    firstSupportedModelVersion: ORI_MODEL_VERSION,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "authority_scope_mismatch",
    name: "Authority scope mismatch",
    version: "1.0.0",
    schemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    description: "Whether the authoritative intent-risk input crossed the existing scope-mismatch threshold.",
    dataType: "boolean",
    source: "Existing Trust Decision intent-risk boundary",
    sensitivity: "CONFIDENTIAL",
    required: false,
    defaultBehavior: "ABSTAIN",
    normalization: "intentRisk > 80; false=0; true=1",
    retentionImplication: "Stores a boolean only; no request content is retained.",
    limitations: ["This is a deterministic boundary and is not proof of malicious intent."],
    active: true,
    firstSupportedModelVersion: ORI_MODEL_VERSION,
    createdAt,
    updatedAt: createdAt,
  },
]);

export const ORI_FEATURE_REGISTRY_BY_ID = new Map(
  ORI_FEATURE_REGISTRY_V1.map((feature) => [feature.id, feature])
);

export const ORI_FEATURE_REGISTRY_HASH = createHash("sha256")
  .update(JSON.stringify(ORI_FEATURE_REGISTRY_V1))
  .digest("hex");

export function getOriFeatureDefinition(featureId: string) {
  return ORI_FEATURE_REGISTRY_BY_ID.get(featureId) ?? null;
}

export function assertOriFeatureRegistryIntegrity() {
  const ids = ORI_FEATURE_REGISTRY_V1.map((feature) => feature.id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate_ori_feature_id");
  if (ORI_FEATURE_REGISTRY_V1.some((feature) => feature.schemaVersion !== ORI_FEATURE_SCHEMA_VERSION)) {
    throw new Error("incompatible_ori_feature_schema");
  }
  return true;
}
