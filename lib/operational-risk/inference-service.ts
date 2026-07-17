import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ORI_FEATURE_SCHEMA_VERSION,
  ORI_MODEL_VERSION,
  ORI_RETENTION_DAYS,
  ORI_THRESHOLDS_V1,
  resolveOriOperatingMode,
} from "./constants.ts";
import { extractOriFeatures } from "./feature-extractor.ts";
import { validateOriFeatures } from "./feature-validator.ts";
import { ORI_FEATURE_REGISTRY_HASH, ORI_FEATURE_REGISTRY_V1 } from "./feature-registry.ts";
import { runOriLogisticModel } from "./logistic-model.ts";
import { ORI_MODEL_ARTIFACT_V1, ORI_MODEL_METADATA_V1, verifyOriModelArtifact } from "./model-artifact.ts";
import { compareOriWithAuthoritativeDecision } from "./shadow-comparator.ts";
import { recordOriTelemetry } from "./telemetry.ts";
import type {
  OriAuthoritativeDecision,
  OriInferenceInput,
  OriInferenceOutput,
  OriModelArtifact,
  OriNormalizedEvidence,
  OriPersistenceClient,
  OriShadowEvaluation,
} from "./types.ts";

function deterministicInferenceId(input: OriInferenceInput, modelVersion: string) {
  const digest = createHash("sha256")
    .update(JSON.stringify({
      tenantId: input.tenantId,
      trustSessionId: input.trustSessionId,
      correlationId: input.correlationId,
      modelVersion,
      features: [...input.features].sort((left, right) => left.featureId.localeCompare(right.featureId)),
    }))
    .digest("hex")
    .slice(0, 32);
  const variant = ((Number.parseInt(digest[16], 16) & 0x3) | 0x8).toString(16);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-${variant}${digest.slice(17, 20)}-${digest.slice(20)}`;
}

function bandAndRecommendation(score: number): Pick<OriInferenceOutput, "riskBand" | "recommendation"> {
  if (score <= ORI_THRESHOLDS_V1.lowUpperBound) return { riskBand: "LOW", recommendation: "NO_ADDITIONAL_ACTION" };
  if (score <= ORI_THRESHOLDS_V1.moderateUpperBound) return { riskBand: "MODERATE", recommendation: "STEP_UP" };
  return { riskBand: "HIGH", recommendation: "HUMAN_REVIEW" };
}

function abstentionOutput(input: OriInferenceInput, options: {
  artifact: OriModelArtifact;
  inferredAt: string;
  durationMs: number;
  missingFeatureIds: string[];
  evidenceCoverage: number;
  limitations: string[];
  artifactHashVerified: boolean;
}): OriInferenceOutput {
  return {
    inferenceId: deterministicInferenceId(input, options.artifact.modelVersion),
    modelId: options.artifact.modelId,
    modelVersion: options.artifact.modelVersion,
    featureSchemaVersion: input.featureSchemaVersion,
    datasetVersion: options.artifact.datasetVersion,
    thresholdVersion: options.artifact.thresholdVersion,
    score: 0.5,
    riskBand: "UNKNOWN",
    recommendation: "ABSTAIN",
    abstain: true,
    confidenceBand: "INSUFFICIENT_EVIDENCE",
    contributions: [],
    missingFeatureIds: options.missingFeatureIds,
    evidenceCoverage: options.evidenceCoverage,
    limitations: [...new Set([...options.limitations, ...options.artifact.limitations])],
    artifactHashVerified: options.artifactHashVerified,
    executionDurationMs: options.durationMs,
    inferredAt: options.inferredAt,
  };
}

export function inferOperationalRisk(
  input: OriInferenceInput,
  options: { artifact?: OriModelArtifact; now?: Date; durationMs?: number } = {}
): OriInferenceOutput {
  const artifact = options.artifact ?? ORI_MODEL_ARTIFACT_V1;
  const inferredAt = (options.now ?? new Date()).toISOString();
  const durationMs = Math.max(0, options.durationMs ?? 0);
  const validation = validateOriFeatures(input);
  const artifactHashVerified = verifyOriModelArtifact(artifact);
  if (!artifactHashVerified) {
    return abstentionOutput(input, {
      artifact,
      inferredAt,
      durationMs,
      missingFeatureIds: validation.missingFeatureIds,
      evidenceCoverage: validation.evidenceCoverage,
      limitations: ["Model artifact integrity verification failed."],
      artifactHashVerified: false,
    });
  }
  if (artifact.featureSchemaVersion !== input.featureSchemaVersion || artifact.modelVersion !== ORI_MODEL_VERSION) {
    return abstentionOutput(input, {
      artifact,
      inferredAt,
      durationMs,
      missingFeatureIds: validation.missingFeatureIds,
      evidenceCoverage: validation.evidenceCoverage,
      limitations: ["Model and feature schema versions are incompatible."],
      artifactHashVerified,
    });
  }
  if (!validation.valid) {
    return abstentionOutput(input, {
      artifact,
      inferredAt,
      durationMs,
      missingFeatureIds: validation.missingFeatureIds,
      evidenceCoverage: validation.evidenceCoverage,
      limitations: validation.errors.map((error) => `Feature validation: ${error}.`),
      artifactHashVerified,
    });
  }
  const result = runOriLogisticModel(artifact, input.features);
  const classification = bandAndRecommendation(result.score);
  return {
    inferenceId: deterministicInferenceId(input, artifact.modelVersion),
    modelId: artifact.modelId,
    modelVersion: artifact.modelVersion,
    featureSchemaVersion: input.featureSchemaVersion,
    datasetVersion: artifact.datasetVersion,
    thresholdVersion: artifact.thresholdVersion,
    score: result.score,
    riskBand: classification.riskBand,
    recommendation: classification.recommendation,
    abstain: false,
    confidenceBand: validation.evidenceCoverage >= 0.9 ? "HIGH" : validation.evidenceCoverage >= 0.8 ? "MEDIUM" : "LOW",
    contributions: result.contributions,
    missingFeatureIds: validation.missingFeatureIds,
    evidenceCoverage: validation.evidenceCoverage,
    limitations: [...artifact.limitations],
    artifactHashVerified,
    executionDurationMs: durationMs,
    inferredAt,
  };
}

export function getOriRuntimeStatus(env: Record<string, string | undefined> = process.env) {
  const operating = resolveOriOperatingMode(env);
  return {
    enabled: operating.enabled,
    mode: operating.mode,
    configuredMode: operating.configuredMode,
    model: ORI_MODEL_METADATA_V1,
    featureSchemaVersion: ORI_FEATURE_SCHEMA_VERSION,
    featureCount: ORI_FEATURE_REGISTRY_V1.length,
    featureRegistryHash: ORI_FEATURE_REGISTRY_HASH,
    thresholdVersion: ORI_MODEL_METADATA_V1.thresholdVersion,
    validationStatus: "ML Validation Incomplete" as const,
    enforcementAvailable: false,
    authoritativeDecisionRemainsAuthoritative: true,
    limitation: operating.limitation ?? "Controlled operational risk signal in shadow validation",
  };
}

export async function resolveOriTrustScope(authenticatedClient: SupabaseClient, trustSessionId: string) {
  const { data, error } = await authenticatedClient
    .from("trust_cases")
    .select("id,workspace_id")
    .eq("id", trustSessionId)
    .maybeSingle<{ id: string; workspace_id: string | null }>();
  if (error || !data?.workspace_id || data.id !== trustSessionId) return null;
  return { tenantId: data.workspace_id, trustSessionId: data.id };
}

async function persistOriInference(
  client: OriPersistenceClient,
  input: OriInferenceInput,
  inference: OriInferenceOutput,
  authoritativeDecision: OriAuthoritativeDecision,
  comparisonCategory: ReturnType<typeof compareOriWithAuthoritativeDecision>
) {
  const retentionExpiresAt = new Date(Date.parse(inference.inferredAt) + ORI_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client.from("ori_inference_records").upsert({
    inference_id: inference.inferenceId,
    tenant_id: input.tenantId,
    trust_session_id: input.trustSessionId,
    correlation_id: input.correlationId,
    model_id: inference.modelId,
    model_version: inference.modelVersion,
    feature_schema_version: inference.featureSchemaVersion,
    dataset_version: inference.datasetVersion,
    threshold_version: inference.thresholdVersion,
    score: inference.score,
    risk_band: inference.riskBand,
    recommendation: inference.recommendation,
    abstain: inference.abstain,
    confidence_band: inference.confidenceBand,
    explanation_summary: {
      top_factors: inference.contributions.slice(0, 5),
      evidence_coverage: inference.evidenceCoverage,
      artifact_hash_verified: inference.artifactHashVerified,
      limitations: inference.limitations,
    },
    missing_feature_ids: inference.missingFeatureIds,
    execution_duration_ms: inference.executionDurationMs,
    authoritative_decision: authoritativeDecision,
    authoritative_decision_reference: `trust-decision:${input.trustSessionId}`,
    comparison_category: comparisonCategory,
    inferred_at: inference.inferredAt,
    retention_expires_at: retentionExpiresAt,
  }, { onConflict: "inference_id", ignoreDuplicates: true });
  if (error) throw new Error("ori_persistence_failed");
}

type ShadowInput = {
  authenticatedClient: SupabaseClient;
  persistenceClient?: OriPersistenceClient;
  trustSessionId: string;
  correlationId: string;
  authoritativeDecision: OriAuthoritativeDecision;
  evidence: Omit<OriNormalizedEvidence, "tenantId" | "trustSessionId" | "correlationId">;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
};

export async function runOriAfterAuthoritativeDecision(input: ShadowInput): Promise<OriShadowEvaluation> {
  const operating = resolveOriOperatingMode(input.env);
  if (!operating.enabled || operating.mode === "off") {
    return {
      state: "DISABLED",
      mode: "off",
      authoritativeDecision: input.authoritativeDecision,
      authoritativeDecisionUnchanged: true,
      inference: null,
      comparison: "NOT_COMPARABLE",
      persistence: "NOT_ATTEMPTED",
    };
  }
  let timedOut = false;
  const timeoutResult = (): OriShadowEvaluation => ({
    state: "ABSTAINED",
    mode: operating.mode,
    authoritativeDecision: input.authoritativeDecision,
    authoritativeDecisionUnchanged: true,
    inference: null,
    comparison: "ORI_ABSTAINED",
    persistence: "NOT_ATTEMPTED",
    error: "TIMEOUT",
  });
  const execute = async (): Promise<OriShadowEvaluation> => {
    const scope = await resolveOriTrustScope(input.authenticatedClient, input.trustSessionId);
    if (timedOut) return timeoutResult();
    if (!scope) {
      return {
        state: "ABSTAINED",
        mode: operating.mode,
        authoritativeDecision: input.authoritativeDecision,
        authoritativeDecisionUnchanged: true,
        inference: null,
        comparison: "ORI_ABSTAINED",
        persistence: "NOT_ATTEMPTED",
        error: "SCOPE_UNAVAILABLE",
      };
    }
    const started = Date.now();
    const normalizedEvidence: OriNormalizedEvidence = {
      ...input.evidence,
      tenantId: scope.tenantId,
      trustSessionId: scope.trustSessionId,
      correlationId: input.correlationId,
    };
    const features = extractOriFeatures(normalizedEvidence);
    const inferenceInput: OriInferenceInput = {
      tenantId: scope.tenantId,
      trustSessionId: scope.trustSessionId,
      correlationId: input.correlationId,
      featureSchemaVersion: ORI_FEATURE_SCHEMA_VERSION,
      features,
    };
    recordOriTelemetry({ event: "inference_start", correlationId: input.correlationId, mode: operating.mode, modelVersion: ORI_MODEL_VERSION, recordedAt: new Date().toISOString() });
    const inference = inferOperationalRisk(inferenceInput, { now: input.evidence.now, durationMs: Date.now() - started });
    const comparison = compareOriWithAuthoritativeDecision(inference, input.authoritativeDecision);
    if (inference.abstain) {
      recordOriTelemetry({
        event: inference.artifactHashVerified ? "feature_validation_failure" : "model_hash_failure",
        correlationId: input.correlationId,
        mode: operating.mode,
        modelVersion: inference.modelVersion,
        featureCoverage: inference.evidenceCoverage,
        recordedAt: new Date().toISOString(),
      });
    }
    let persistence: OriShadowEvaluation["persistence"] = "NOT_ATTEMPTED";
    let persistenceFailed = false;
    if (input.persistenceClient) {
      try {
        await persistOriInference(input.persistenceClient, inferenceInput, inference, input.authoritativeDecision, comparison);
        persistence = "PERSISTED";
      } catch {
        persistence = "FAILED";
        persistenceFailed = true;
      }
    }
    if (persistenceFailed) {
      recordOriTelemetry({ event: "inference_failure", correlationId: input.correlationId, mode: operating.mode, modelVersion: inference.modelVersion, featureCoverage: inference.evidenceCoverage, comparison, recordedAt: new Date().toISOString() });
    }
    recordOriTelemetry({
      event: inference.abstain ? "inference_abstain" : "inference_complete",
      correlationId: input.correlationId,
      mode: operating.mode,
      modelVersion: inference.modelVersion,
      featureCoverage: inference.evidenceCoverage,
      durationMs: inference.executionDurationMs,
      comparison,
      recordedAt: new Date().toISOString(),
    });
    return {
      state: inference.abstain ? "ABSTAINED" : "COMPLETED",
      mode: operating.mode,
      authoritativeDecision: input.authoritativeDecision,
      authoritativeDecisionUnchanged: true,
      inference,
      comparison,
      persistence,
      ...(persistenceFailed ? { error: "PERSISTENCE_FAILED" as const } : {}),
    };
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      execute(),
      new Promise<OriShadowEvaluation>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true;
          resolve(timeoutResult());
        }, input.timeoutMs ?? 300);
      }),
    ]);
  } catch {
    return {
      state: "FAILED",
      mode: operating.mode,
      authoritativeDecision: input.authoritativeDecision,
      authoritativeDecisionUnchanged: true,
      inference: null,
      comparison: "NOT_COMPARABLE",
      persistence: "NOT_ATTEMPTED",
      error: "INFERENCE_FAILED",
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
