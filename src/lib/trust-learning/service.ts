import "server-only";
import { EnterpriseTrustPatternEngine } from "./pattern-engine.ts";
import { buildGroundedTrustNarrative } from "./ai-assistance.ts";
import { recommendApprovedActions } from "./recommendations.ts";
import { simulateTrustSnapshot } from "./simulation.ts";
import { assessTrustResilience } from "./resilience.ts";
import { createTrustLearningFeedback } from "./feedback.ts";
import { enterpriseTrustLearningRepository } from "./repository.ts";
import { TrustArchitectureApiError, learningReferences, trustLearningReference } from "./http.ts";
import { reviewerFeedbackLabels, type ReviewerFeedbackLabel, type TrustSimulationResult } from "./types.ts";

export async function evaluateEnterpriseTrustPatterns(input: { enterpriseId: string; actorId: string; correlationId: string; value: Record<string, unknown> }) {
  const minimumOccurrences = Number(input.value.minimumOccurrences ?? 2);
  const recurrenceWindowDays = Number(input.value.recurrenceWindowDays ?? 90);
  if (!Number.isInteger(minimumOccurrences) || minimumOccurrences < 2 || minimumOccurrences > 100) throw new TrustArchitectureApiError("minimumOccurrences must be an integer from 2 to 100.", 400, "PATTERN_MINIMUM_INVALID");
  if (!Number.isInteger(recurrenceWindowDays) || recurrenceWindowDays < 1 || recurrenceWindowDays > 3650) throw new TrustArchitectureApiError("recurrenceWindowDays must be an integer from 1 to 3650.", 400, "PATTERN_WINDOW_INVALID");
  const repository = enterpriseTrustLearningRepository();
  const events = await repository.canonicalEvents(input.enterpriseId);
  const patterns = new EnterpriseTrustPatternEngine().detect({ enterpriseId: input.enterpriseId, events, minimumOccurrences, recurrenceWindowDays });
  const persistence = await repository.persistPatterns(input.enterpriseId, input.actorId, patterns, input.correlationId);
  return { patterns, persistence, excludedCrossTenantInput: true, canonicalDecisionMutationCount: 0 };
}

export async function createGroundedNarrative(input: { enterpriseId: string; correlationId: string; value: Record<string, unknown> }) {
  const evidenceReferences = learningReferences(input.value.evidenceReferences, "evidenceReferences");
  const sources = await enterpriseTrustLearningRepository().evidenceSources(input.enterpriseId, evidenceReferences);
  return buildGroundedTrustNarrative({ sources, correlationId: input.correlationId });
}

export async function createTrustRecommendations(input: { enterpriseId: string; value: Record<string, unknown> }) {
  const patternId = trustLearningReference(input.value.patternId, "patternId");
  const pattern = await enterpriseTrustLearningRepository().pattern(input.enterpriseId, patternId);
  if (!pattern) throw new TrustArchitectureApiError("Trust pattern was not found.", 404, "TRUST_PATTERN_NOT_FOUND");
  return recommendApprovedActions(pattern);
}

export async function createTrustLearningSimulation(input: { enterpriseId: string; actorId: string; correlationId: string; value: Record<string, unknown> }) {
  const simulationType = String(input.value.simulationType ?? "") as TrustSimulationResult["simulationType"];
  if (!["authority_expiry", "provider_outage", "delegated_agent_impact", "economic_limit"].includes(simulationType)) throw new TrustArchitectureApiError("Simulation type is unsupported.", 400, "TRUST_SIMULATION_TYPE_INVALID");
  const targetReference = trustLearningReference(input.value.targetReference, "targetReference");
  const repository = enterpriseTrustLearningRepository(); const snapshot = await repository.snapshot(input.enterpriseId);
  const result = simulateTrustSnapshot({ snapshot, simulationType, targetReference });
  await repository.persistSimulation(input.enterpriseId, input.actorId, result, input.correlationId);
  return result;
}

export async function createTrustResilienceAssessment(input: { enterpriseId: string; actorId: string; correlationId: string; value: Record<string, unknown> }) {
  const providerReference = input.value.providerReference === null || input.value.providerReference === undefined ? null : trustLearningReference(input.value.providerReference, "providerReference");
  const repository = enterpriseTrustLearningRepository(); const snapshot = await repository.snapshot(input.enterpriseId);
  const assessment = assessTrustResilience({ snapshot, providerReference });
  await repository.persistResilience(input.enterpriseId, input.actorId, assessment, input.correlationId);
  return assessment;
}

export async function recordTrustLearningFeedback(input: { enterpriseId: string; reviewerId: string; reviewerRole: string; correlationId: string; outputId: string; value: Record<string, unknown> }) {
  const label = String(input.value.label ?? "") as ReviewerFeedbackLabel;
  if (!reviewerFeedbackLabels.includes(label)) throw new TrustArchitectureApiError("Feedback label is unsupported.", 400, "TRUST_FEEDBACK_LABEL_INVALID");
  const feedback = createTrustLearningFeedback({ enterpriseId: input.enterpriseId, reviewerReference: input.reviewerId, reviewerRole: input.reviewerRole, outputReference: input.outputId, sourceVersion: trustLearningReference(input.value.sourceVersion, "sourceVersion"), label, reason: String(input.value.reason ?? ""), correction: input.value.correction ? String(input.value.correction) : null });
  await enterpriseTrustLearningRepository().persistFeedback(feedback, input.correlationId);
  return feedback;
}
