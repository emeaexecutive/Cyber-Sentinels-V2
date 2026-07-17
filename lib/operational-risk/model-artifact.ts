import { createHash } from "node:crypto";
import {
  ORI_DATASET_VERSION,
  ORI_FEATURE_SCHEMA_VERSION,
  ORI_MODEL_ID,
  ORI_MODEL_VERSION,
  ORI_THRESHOLD_VERSION,
} from "./constants.ts";
import type { OriModelArtifact, OriModelMetadata } from "./types.ts";

type ArtifactWithoutHash = Omit<OriModelArtifact, "artifactHash">;

export function canonicalizeOriModelArtifact(artifact: ArtifactWithoutHash | OriModelArtifact) {
  const coefficients = Object.fromEntries(
    Object.entries(artifact.coefficients).sort(([left], [right]) => left.localeCompare(right))
  );
  return JSON.stringify({
    modelId: artifact.modelId,
    modelName: artifact.modelName,
    modelVersion: artifact.modelVersion,
    scope: artifact.scope,
    algorithmFamily: artifact.algorithmFamily,
    featureSchemaVersion: artifact.featureSchemaVersion,
    datasetVersion: artifact.datasetVersion,
    thresholdVersion: artifact.thresholdVersion,
    trainedAt: artifact.trainedAt,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    approvedAt: artifact.approvedAt ?? null,
    approvedBy: artifact.approvedBy ?? null,
    status: artifact.status,
    limitations: [...artifact.limitations],
    intercept: artifact.intercept,
    coefficients,
    normalizationAssumptions: [...artifact.normalizationAssumptions],
  });
}

export function calculateOriArtifactHash(artifact: ArtifactWithoutHash | OriModelArtifact) {
  return createHash("sha256").update(canonicalizeOriModelArtifact(artifact)).digest("hex");
}

const artifactWithoutHash: ArtifactWithoutHash = {
  modelId: ORI_MODEL_ID,
  modelName: "Operational Risk Intelligence Logistic Baseline",
  modelVersion: ORI_MODEL_VERSION,
  scope: "GLOBAL_SHADOW",
  algorithmFamily: "LOGISTIC_REGRESSION",
  featureSchemaVersion: ORI_FEATURE_SCHEMA_VERSION,
  datasetVersion: ORI_DATASET_VERSION,
  thresholdVersion: ORI_THRESHOLD_VERSION,
  trainedAt: "2026-07-17T00:00:00.000Z",
  createdAt: "2026-07-17T00:00:00.000Z",
  updatedAt: "2026-07-17T00:00:00.000Z",
  approvedAt: "2026-07-17T00:00:00.000Z",
  approvedBy: "sprint-16.1a-controlled-shadow-approval",
  status: "SHADOW",
  limitations: [
    "Controlled placeholder coefficients were not trained on production data.",
    "Synthetic validation does not establish real-world accuracy or calibration.",
    "The model does not verify identity and does not make authorization decisions.",
    "Shadow recommendations require authoritative Trust Decision and human governance context.",
  ],
  intercept: -0.4,
  coefficients: Object.freeze({
    authority_scope_mismatch: 1.5,
    evidence_freshness_ratio: -1,
    identity_evidence_age_days: 0.65,
    identity_verification_present: -1.2,
    missing_evidence_ratio: 2,
    replay_available: -0.4,
    trust_memory_prior_review_count: 0.8,
  }),
  normalizationAssumptions: [
    "Booleans map to 0 or 1.",
    "Bounded numeric values use feature-registry min-max scaling.",
    "Missing values are never imputed as low risk; coverage below 0.70 abstains.",
    "All time arithmetic uses UTC epoch milliseconds and whole days.",
  ],
};

export const ORI_MODEL_ARTIFACT_V1: Readonly<OriModelArtifact> = Object.freeze({
  ...artifactWithoutHash,
  artifactHash: calculateOriArtifactHash(artifactWithoutHash),
});

export const ORI_MODEL_METADATA_V1: Readonly<OriModelMetadata> = Object.freeze({
  modelId: ORI_MODEL_ARTIFACT_V1.modelId,
  modelName: ORI_MODEL_ARTIFACT_V1.modelName,
  modelVersion: ORI_MODEL_ARTIFACT_V1.modelVersion,
  scope: ORI_MODEL_ARTIFACT_V1.scope,
  algorithmFamily: ORI_MODEL_ARTIFACT_V1.algorithmFamily,
  featureSchemaVersion: ORI_MODEL_ARTIFACT_V1.featureSchemaVersion,
  datasetVersion: ORI_MODEL_ARTIFACT_V1.datasetVersion,
  thresholdVersion: ORI_MODEL_ARTIFACT_V1.thresholdVersion,
  trainedAt: ORI_MODEL_ARTIFACT_V1.trainedAt,
  createdAt: ORI_MODEL_ARTIFACT_V1.createdAt,
  updatedAt: ORI_MODEL_ARTIFACT_V1.updatedAt,
  approvedAt: ORI_MODEL_ARTIFACT_V1.approvedAt,
  approvedBy: ORI_MODEL_ARTIFACT_V1.approvedBy,
  artifactHash: ORI_MODEL_ARTIFACT_V1.artifactHash,
  status: ORI_MODEL_ARTIFACT_V1.status,
  limitations: [...ORI_MODEL_ARTIFACT_V1.limitations],
});

export function verifyOriModelArtifact(artifact: OriModelArtifact) {
  return calculateOriArtifactHash(artifact) === artifact.artifactHash;
}

export const ORI_MODEL_REGISTRY = Object.freeze([ORI_MODEL_METADATA_V1]);
