import { EnterpriseTrustPatternEngine } from "./pattern-engine.ts";
import { buildGroundedTrustNarrative } from "./ai-assistance.ts";
import { recommendApprovedActions } from "./recommendations.ts";
import { simulateTrustSnapshot } from "./simulation.ts";
import { assessTrustResilience } from "./resilience.ts";
import { createTrustLearningFeedback } from "./feedback.ts";
import { deriveEnterpriseTrustGenome } from "./genome.ts";
import { buildHistoricalTrustForecast } from "./forecast.ts";
import type { CanonicalLearningEvent, EvidenceSource, TrustLearningSnapshot } from "./types.ts";

export async function buildEnterpriseTrustLearningDemo() {
  const enterpriseId = "enterprise:synthetic-demo";
  const events: CanonicalLearningEvent[] = [
    ["event:provider-1", "provider.unavailable", "2026-07-01T09:00:00.000Z", "evidence:provider-1"],
    ["event:provider-2", "provider.unavailable", "2026-07-08T09:00:00.000Z", "evidence:provider-2"],
    ["event:provider-3", "provider.unavailable", "2026-07-15T09:00:00.000Z", "evidence:provider-3"],
    ["event:review-1", "workflow.review", "2026-07-01T09:01:00.000Z", "evidence:review-1"],
    ["event:review-2", "workflow.review", "2026-07-08T09:01:00.000Z", "evidence:review-2"],
    ["event:review-3", "workflow.review", "2026-07-15T09:01:00.000Z", "evidence:review-3"],
    ["event:missing-1", "evidence.mandatory_missing", "2026-07-01T09:02:00.000Z", "evidence:request-1"],
    ["event:missing-2", "evidence.mandatory_missing", "2026-07-08T09:02:00.000Z", "evidence:request-2"],
    ["event:contradiction-1", "provider.contradiction", "2026-07-08T09:03:00.000Z", "evidence:contradiction"],
    ["event:contradiction-2", "provider.contradiction", "2026-07-16T09:03:00.000Z", "evidence:correction"],
  ].map(([eventId, eventType, occurredAt, evidence], index) => ({
    eventId, enterpriseId, eventType, occurredAt, subjectType: "AI_AGENT", subjectReference: "agent:payments", workflowReference: "workflow:payment-approval",
    authorityReference: "authority:payments", policyReference: "policy:payment-approval/3", providerReference: "provider:a", incidentReference: index === 8 ? "incident:provider-contradiction" : null,
    decisionReference: `decision:${index + 1}`, evidenceReferences: [evidence], materiality: index >= 8 ? "high" : "moderate",
    correctedEventReference: index === 9 ? "event:contradiction-1" : null,
  }));
  const patterns = new EnterpriseTrustPatternEngine().detect({ enterpriseId, events, recurrenceWindowDays: 30 });
  const evidence: EvidenceSource[] = patterns[0]?.evidenceReferences.map((reference, index) => ({ reference, summary: index === 0 ? "Provider A was unavailable during the approval workflow." : "The workflow moved to human review while provider evidence was unavailable.", sourceVersion: `synthetic/${index + 1}`, classification: "observed_evidence", contradiction: reference === "evidence:correction" })) ?? [];
  const narrative = await buildGroundedTrustNarrative({ sources: evidence, correlationId: "00000000-0000-4000-8000-000000000034" });
  const recommendations = patterns[0] ? recommendApprovedActions(patterns[0]) : [];
  const snapshot: TrustLearningSnapshot = {
    enterpriseId, capturedAt: "2026-07-16T10:00:00.000Z",
    trustObjects: [{ reference: "agent:payments", authorityReference: "authority:payments", providerReferences: ["provider:a"], evidenceReferences: evidence.map((source) => source.reference), workflowReferences: ["workflow:payment-approval"] }],
    authorities: [{ reference: "authority:payments", active: true, expiresAt: "2026-08-01T00:00:00.000Z" }],
    workflows: [{ reference: "workflow:payment-approval", authorityReferences: ["authority:payments"], providerReferences: ["provider:a"], evidenceReferences: evidence.map((source) => source.reference), decision: "review" }],
    incidents: [{ reference: "incident:provider-contradiction", resolved: false }],
  };
  const simulation = simulateTrustSnapshot({ snapshot, simulationType: "provider_outage", targetReference: "provider:a" });
  const resilience = assessTrustResilience({ snapshot, providerReference: "provider:a" });
  const feedback = createTrustLearningFeedback({ enterpriseId, reviewerReference: "reviewer:synthetic", reviewerRole: "reviewer", outputReference: narrative.digest, sourceVersion: "synthetic/1", label: "corrected", reason: "Preserve the provider correction beside the original contradiction.", correction: "The provider corrected the earlier event; the original contradiction remains visible.", createdAt: "2026-07-16T10:05:00.000Z" });
  const genome = deriveEnterpriseTrustGenome({ enterpriseId, patterns, version: "synthetic/1", generatedAt: "2026-07-16T10:06:00.000Z" });
  const forecast = buildHistoricalTrustForecast({ pattern: patterns[0], comparisonPopulation: "Synthetic payment-approval cases", sampleSize: 10, matchingCaseCount: 8 });
  return { enterpriseId, synthetic: true, patterns, narrative, recommendations, simulation, resilience, feedback, genome, forecast, replayReference: "replay:synthetic-payment-approval", trustMemoryReference: "trust-memory:synthetic-payment-approval", limitations: ["Synthetic evidence only.", "No external model is configured.", "No canonical or Production state is mutated."] };
}
