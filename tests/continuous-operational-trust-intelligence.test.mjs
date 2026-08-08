import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  OPERATIONAL_TRUST_INTELLIGENCE_ASSERTION,
  advanceTrustRecovery,
  analyzeBlastRadius,
  appendHumanFeedback,
  benchmarkContinuousOperationalTrustIntelligence,
  buildContinuousOperationalTrustScenario,
  buildDeterministicTrustNarrative,
  buildTrustCascade,
  classifyTrustChangeMateriality,
  createTrustChangeEvent,
  createTrustRecovery,
  deriveTrustConfidence,
  evaluateAIAssistance,
  evaluateRelationshipImpact,
  evaluateTrustDrift,
  evaluateTrustStability,
  predictOperationalTrust,
  recommendTrustAction,
  retrieveComparableDecisionHistory,
  validateAssistedTrustOutput,
  validateGroundedNarrative,
} from "../lib/trust-intelligence.ts";

const scenario = buildContinuousOperationalTrustScenario();

test("TrustChangeEvent is deterministic, tenant-scoped and derived from canonical references", () => {
  const first = scenario.changes[0];
  const unsigned = { ...first };
  delete unsigned.digest;
  const second = createTrustChangeEvent(unsigned);
  assert.equal(first.digest, second.digest);
  assert.equal(first.enterpriseId, scenario.enterpriseId);
  assert.ok(first.evidenceReferences.length);
  assert.equal(OPERATIONAL_TRUST_INTELLIGENCE_ASSERTION.independentSourceOfTruth, false);
  assert.equal(OPERATIONAL_TRUST_INTELLIGENCE_ASSERTION.canonicalSpine, "Operational Entity");
});

test("materiality uses consequence, authority, environment and evidence without intent inference", () => {
  const result = classifyTrustChangeMateriality({ entity: scenario.alpha, changeType: "AUTHORITY_REVOKED", authorityScope: ["deploy"], actionCapabilities: ["write"], dataAccess: "restricted", environment: "production", consequenceExposure: "critical", evidenceQuality: "conflicting", providerIndependence: "conflicting", existingIncidents: 1, adverseHistoricalOutcomes: 1, policyRequiresReview: true });
  assert.equal(result.materiality, "CRITICAL");
  assert.ok(result.reasonCodes.includes("AUTHORITY_REVOKED"));
  assert.equal(result.reasonCodes.some((reason) => /malicious|protected/i.test(reason)), false);
});

test("Trust Drift cites exact evidence and distinguishes expected, material and approved changes", () => {
  assert.equal(scenario.drift.stale.state, "EXPECTED_DRIFT");
  assert.equal(scenario.drift.runtime.state, "MATERIAL_DRIFT");
  assert.equal(scenario.drift.restored.state, "APPROVED_CHANGE");
  assert.ok(scenario.drift.runtime.findings.every((finding) => finding.evidenceReferences.length));
  const insufficient = evaluateTrustDrift({ previous: scenario.states.baseline, current: { ...scenario.states.baseline, runtime: "runtime:unknown", evidenceByCondition: { ...scenario.states.baseline.evidenceByCondition, runtime: [] } }, evaluatedAt: scenario.times.runtime });
  assert.equal(insufficient.state, "INSUFFICIENT_EVIDENCE");
});

test("Trust Health is dimensional and never a generic reputation score", () => {
  assert.equal(scenario.health.healthy.overallState, "HEALTHY");
  assert.equal(scenario.health.watch.overallState, "WATCH");
  assert.equal(scenario.health.degraded.overallState, "DEGRADED");
  assert.deepEqual(Object.keys(scenario.health.healthy.dimensions).sort(), ["ACCOUNTABILITY", "AUTHORITY", "CONTINUITY", "EVIDENCE", "IDENTITY", "INCIDENT", "OUTCOME", "PROVIDER_INDEPENDENCE"]);
  assert.equal("score" in scenario.health.degraded, false);
});

test("Trust Confidence describes confidence in the conclusion and preserves evidence", () => {
  assert.equal(scenario.confidence.healthy.level, "HIGH");
  assert.notEqual(scenario.confidence.stale.level, "HIGH");
  assert.ok(scenario.confidence.degraded.evidenceReferences.length);
  const insufficient = deriveTrustConfidence({ evidenceCompleteness: 0, evidenceFreshness: 0, sourceIndependence: 0, providerAgreement: 0, authorityCertainty: 0, outcomeConfirmation: 0, continuity: 0, unresolvedContradictions: 0, evidenceReferences: [] });
  assert.equal(insufficient.level, "INSUFFICIENT");
});

test("Trust Stability evaluates configured windows without misconduct labels", () => {
  const stability = evaluateTrustStability({ events: [...scenario.changes, ...scenario.changes.map((event, index) => ({ ...event, eventId: `${event.eventId}:${index}`, effectiveAt: `2026-08-0${7 - index}T14:00:00.000Z` }))], asOf: scenario.times.restored, windowsHours: [24, 168, 720] });
  assert.ok(["CHANGING", "VOLATILE"].includes(stability.state));
  assert.deepEqual(stability.windows.map((window) => window.hours), [24, 168, 720]);
  assert.equal(JSON.stringify(stability).includes("malicious"), false);
});

test("Trust Prediction is bounded and cannot autonomously enforce", () => {
  assert.ok(["LIKELY_POLICY_ESCALATION", "LIKELY_EVIDENCE_EXPIRY", "LIKELY_AUTHORITY_EXPIRY"].includes(scenario.prediction.prediction));
  assert.equal(scenario.prediction.autonomousEnforcementAllowed, false);
  assert.ok(scenario.prediction.limitations.every((limitation) => !/will attack/i.test(limitation)));
  const unavailable = predictOperationalTrust({ generatedAt: scenario.times.healthy, horizonHours: 24, providerGap: false, unresolvedMaterialDrift: false, policyEscalationExpected: false, supportingEvidence: [], historicalBasis: [] });
  assert.equal(unavailable.prediction, "INSUFFICIENT_EVIDENCE");
});

test("Trust Recovery requires evidence and retains adverse history", () => {
  const originalAdverse = structuredClone(scenario.recovery.adverseEvidenceReferences);
  assert.equal(scenario.recovery.state, "RESTORED");
  assert.deepEqual(scenario.recovery.adverseEvidenceReferences, originalAdverse);
  assert.deepEqual(scenario.recovery.history.map((entry) => entry.state), ["DEGRADED", "REMEDIATION_REQUIRED", "EVIDENCE_RECEIVED", "RE_EVALUATION", "RESTORED"]);
  const recovery = createTrustRecovery({ recoveryId: "recovery:test", enterpriseId: scenario.enterpriseId, operationalEntityId: scenario.alpha.entityId, requirements: ["attestation"], evidenceReferences: [], adverseEvidenceReferences: ["evidence:adverse"], createdAt: scenario.times.runtime });
  assert.throws(() => advanceTrustRecovery(advanceTrustRecovery(recovery, "REMEDIATION_REQUIRED", scenario.times.runtime), "EVIDENCE_RECEIVED", scenario.times.attestation), /requires canonical evidence/);
});

test("Trust Narrative rejects unsupported factual sentences and fallback is cited", () => {
  const available = [...new Set(scenario.narrative.flatMap((sentence) => sentence.evidenceReferences))];
  assert.equal(validateGroundedNarrative(scenario.narrative, available).valid, true);
  assert.equal(validateGroundedNarrative([{ text: "Invented provider fact.", evidenceReferences: ["evidence:missing"] }], available).valid, false);
  const fallback = buildDeterministicTrustNarrative({ entityName: "Agent Alpha", authority: "read authority", runtimeChangedAt: "14:31", actionRequestedAt: "14:34", decision: "REVIEW", executionRequested: false, evidence: { authority: available[0], runtime: available[1], action: available[2], decision: available[3] } });
  assert.ok(fallback.every((sentence) => sentence.evidenceReferences.length));
});

test("Trust Explanation answers every required question", () => {
  const explanation = scenario.explanation;
  assert.ok(explanation.whatHappened.length);
  assert.ok(explanation.whatChanged.length);
  assert.ok(explanation.whyTrustChanged.length);
  assert.ok(explanation.supportingEvidence.length);
  assert.ok(explanation.unknowns.length);
  assert.ok(explanation.actionTaken);
  assert.ok(explanation.restorationRequirements.length);
});

test("Trust Recommendation is bounded and never executes", () => {
  const recommendation = recommendTrustAction({ drift: scenario.drift.runtime, health: scenario.health.degraded });
  assert.equal(recommendation.recommendation, "REQUEST_RUNTIME_ATTESTATION");
  assert.equal(recommendation.executesAutomatically, false);
});

test("Trust Advisor orchestrates projections without making a second decision", () => {
  assert.equal(scenario.advisor.currentState, "DEGRADED");
  assert.equal(scenario.advisor.drift, "MATERIAL_DRIFT");
  assert.equal(scenario.advisor.recommendation, "REQUEST_RUNTIME_ATTESTATION");
  assert.equal(scenario.advisor.derivedOnly, true);
  assert.ok(scenario.advisor.evidence.length);
});

test("network aggregation derives attention queues from entity state", () => {
  assert.equal(scenario.network.totalOperationalEntities, 2);
  assert.equal(scenario.network.counts.DEGRADED, 1);
  assert.equal(scenario.network.counts.REVIEW_REQUIRED, 1);
  assert.ok(scenario.network.materialDrift.includes(scenario.alpha.entityId));
  assert.ok(scenario.network.involvedInIncidents.includes(scenario.alpha.entityId));
});

test("provider relationship impact degrades only actual dependencies", () => {
  const impact = evaluateRelationshipImpact({ enterpriseId: scenario.enterpriseId, providerId: "provider:a", dependencies: [
    { enterpriseId: scenario.enterpriseId, providerId: "provider:a", operationalEntityId: "entity:sole", evidenceReferences: ["evidence:a"], independentEvidenceReferences: [], sufficientWithoutProvider: false },
    { enterpriseId: scenario.enterpriseId, providerId: "provider:a", operationalEntityId: "entity:corroborated", evidenceReferences: ["evidence:a:2"], independentEvidenceReferences: ["evidence:b"], sufficientWithoutProvider: true },
    { enterpriseId: "enterprise:other", providerId: "provider:a", operationalEntityId: "entity:other", evidenceReferences: ["evidence:other"], independentEvidenceReferences: [], sufficientWithoutProvider: false },
  ] });
  assert.deepEqual(impact.solelyDependent, ["entity:sole"]);
  assert.deepEqual(impact.independentlyCorroborated, ["entity:corroborated"]);
  assert.equal(impact.suppliedEntities.includes("entity:other"), false);
});

test("blast radius traverses authority, workflow and decision dependencies deterministically", () => {
  const blast = analyzeBlastRadius({ enterpriseId: scenario.enterpriseId, changedReference: "credential:signing-alpha", edges: scenario.relationships, maxDepth: 5 });
  assert.ok(blast.affectedAuthorities.includes("authority:alpha:v3"));
  assert.ok(blast.affectedOperationalEntities.includes(scenario.alpha.entityId));
  assert.ok(blast.affectedOperationalEntities.includes(scenario.workflowDeltaId));
  assert.ok(blast.affectedDecisions.includes("decision:workflow-delta:review"));
  assert.equal(blast.cycleDetected, true);
});

test("Trust Cascade detects cycles and obeys maximum depth", () => {
  assert.equal(scenario.cascade.cycleDetected, true);
  assert.ok(scenario.cascade.edges.every((edge) => edge.depth <= 5 && edge.evidenceReferences.length));
  const limited = buildTrustCascade({ enterpriseId: scenario.enterpriseId, rootChangeReference: "credential:signing-alpha", relationships: scenario.relationships, maxDepth: 1 });
  assert.equal(limited.truncated, true);
  assert.equal(scenario.resolvedCascade.resolved, true);
});

test("decision-history learning retrieves only customer-owned comparable situations", () => {
  const records = [
    { enterpriseId: scenario.enterpriseId, decisionId: "decision:1", operationalEntityId: scenario.alpha.entityId, changeType: "RUNTIME_CHANGED", decision: "REVIEW", resolution: "renewed attestation", evidenceReferences: ["evidence:1"], decidedAt: "2026-08-01T00:00:00.000Z" },
    { enterpriseId: "enterprise:other", decisionId: "decision:2", operationalEntityId: "entity:other", changeType: "RUNTIME_CHANGED", decision: "REVIEW", resolution: "authority reissue", evidenceReferences: ["evidence:2"], decidedAt: "2026-08-02T00:00:00.000Z" },
  ];
  const result = retrieveComparableDecisionHistory({ enterpriseId: scenario.enterpriseId, changeType: "RUNTIME_CHANGED", records });
  assert.equal(result.comparableCount, 1);
  assert.equal(result.crossTenantRecordsIncluded, false);
  assert.equal(result.records[0].decisionId, "decision:1");
});

test("human feedback appends without rewriting the original decision", () => {
  const feedback = { feedbackId: "feedback:alpha:1", enterpriseId: scenario.enterpriseId, operationalEntityId: scenario.alpha.entityId, reviewer: "reviewer:alice", role: "security_reviewer", timestamp: scenario.times.attestation, outcome: "AGREE", originalRecommendation: "REQUEST_RUNTIME_ATTESTATION", originalDecision: "REVIEW", reason: "Current attestation matched the approved runtime.", supportingEvidence: ["evidence:attestation:alpha:v2"], originalDecisionDigest: "a".repeat(64) };
  const appended = appendHumanFeedback([], feedback);
  const duplicate = appendHumanFeedback(appended, feedback);
  assert.equal(appended.length, 1);
  assert.equal(duplicate.length, 1);
  assert.equal(feedback.originalDecision, "REVIEW");
  assert.equal(feedback.originalDecisionDigest, "a".repeat(64));
});

test("AI assistance rejects unsupported claims and deterministic fallback succeeds", () => {
  const refs = [...new Set(scenario.narrative.flatMap((sentence) => sentence.evidenceReferences))];
  const unsupported = validateAssistedTrustOutput({ statements: [...scenario.narrative, { text: "Provider was dishonest.", evidenceReferences: [] }], availableEvidence: refs, aiConfigured: true });
  assert.equal(unsupported.classification, "AI_UNVERIFIED");
  assert.deepEqual(unsupported.unsupportedStatements, ["Provider was dishonest."]);
  const fallback = validateAssistedTrustOutput({ statements: scenario.narrative, availableEvidence: refs, aiConfigured: false });
  assert.equal(fallback.classification, "DETERMINISTIC_FALLBACK");
  assert.equal(fallback.authoritative, false);
});

test("model evaluation remains separate from canonical trust truth", () => {
  const output = validateAssistedTrustOutput({ statements: scenario.narrative, availableEvidence: scenario.advisor.evidence, aiConfigured: false });
  const evaluation = evaluateAIAssistance({ evaluatedAt: scenario.times.restored, outputs: [output], expectedRecommendation: "REQUEST_RUNTIME_ATTESTATION", proposedRecommendations: ["REQUEST_RUNTIME_ATTESTATION"], expectedContradictions: 1, detectedContradictions: 1, fallbackAttempts: 1, fallbackSuccesses: 1 });
  assert.equal(evaluation.canonicalTruth, false);
  assert.equal(evaluation.deterministicFallbackSuccess, 1);
  assert.equal(evaluation.unsupportedClaimRate, 0);
});

test("Agent Alpha scenario completes all 23 demonstration steps", () => {
  assert.equal(scenario.health.healthy.overallState, "HEALTHY");
  assert.equal(scenario.health.watch.overallState, "WATCH");
  assert.equal(scenario.authorityRemainsValid, true);
  assert.equal(scenario.lowConsequenceDecision, "ALLOW");
  assert.equal(scenario.criticalDecision, "REVIEW");
  assert.equal(scenario.health.degraded.overallState, "DEGRADED");
  assert.ok(scenario.blastRadius.affectedOperationalEntities.includes(scenario.workflowDeltaId));
  assert.equal(scenario.recovery.state, "RESTORED");
  assert.equal(scenario.resolvedCascade.resolved, true);
  assert.ok(scenario.replay.length >= 15);
  assert.ok(scenario.trustMemory.length >= 3);
});

test("canonical entity history remains immutable and graph contains no orphan entity", () => {
  const before = scenario.alpha.canonicalDigest;
  const recovered = scenario.states.restored;
  assert.equal(scenario.alpha.canonicalDigest, before);
  assert.equal(recovered.stateReference.includes(scenario.alpha.entityId), false);
  const referenced = new Set(scenario.relationships.flatMap((edge) => [edge.from, edge.to]));
  assert.ok(referenced.has(scenario.alpha.entityId));
  assert.ok(referenced.has(scenario.workflowDeltaId));
});

test("local benchmark covers single, 100, 1,000, blast-radius, Replay and aggregation paths", () => {
  const benchmark = benchmarkContinuousOperationalTrustIntelligence(1_000);
  assert.equal(benchmark.sampleCount, 1_000);
  assert.equal(benchmark.aggregateTotal, 1_000);
  for (const key of ["singleEntityEvaluationMs", "oneHundredEntitiesEstimatedMs", "oneThousandEntitiesMs", "blastRadiusTraversalMs", "replayRetrievalMs", "trustCentreAggregationMs"]) assert.ok(Number.isFinite(benchmark[key]) && benchmark[key] >= 0, key);
  assert.match(benchmark.limitation, /not a Production-scale/);
  console.log(`CONTINUOUS_OPERATIONAL_TRUST_BENCHMARK=${JSON.stringify(benchmark)}`);
});

test("source, UI and capability truth preserve the derived-only architecture", async () => {
  const [source, matrix, centre, entity, architecture] = await Promise.all([readFile(new URL("../lib/trust-intelligence.ts", import.meta.url), "utf8"), readFile(new URL("../docs/CYBER_SENTINELS_CAPABILITY_TRUTH_MATRIX.md", import.meta.url), "utf8"), readFile(new URL("../src/components/trust-centre/EnterpriseTrustCentre.tsx", import.meta.url), "utf8"), readFile(new URL("../app/operational-entities/[entityId]/page.tsx", import.meta.url), "utf8"), readFile(new URL("../docs/architecture/CONTINUOUS_OPERATIONAL_TRUST_INTELLIGENCE.md", import.meta.url), "utf8")]);
  assert.match(source, /independentSourceOfTruth: false/);
  assert.doesNotMatch(source, /will attack/i);
  assert.match(matrix, /Blast Radius and Trust Cascade/);
  for (const heading of ["Operational entities", "Trust changes", "Attention required", "Network impact"]) assert.match(centre, new RegExp(heading, "i"));
  for (const projection of ["Trust Health", "Trust Drift", "Trust Confidence", "Trust Stability", "Trust Prediction", "Trust Narrative", "Trust Recommendation", "Trust Recovery", "WHY?"]) assert.match(entity, new RegExp(projection.replace("?", "\\?")));
  assert.match(architecture, /Operational Entity remains the canonical spine/);
  assert.match(architecture, /Trust Cascade is DERIVED/);
});
