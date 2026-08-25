import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FORECAST_SUBJECT_TYPES,
  TRUST_CONDITION_DIMENSIONS,
  TRUST_CONDITION_TRENDS,
  TRUST_FORECAST_INTEGRATION_MODES,
  appendTrustForecastHistory,
  compareProductionTrustManifests,
  createPreActionTrustForecastInput,
  createProductionTrustManifest,
  createTrustForecastCiContract,
  createTrustForecastIntegrationContract,
  createTrustForecastMlEpisode,
  createTrustForecastOutcomeFeedback,
  evaluateTrustBaseline,
  evaluateTrustForecast,
  runPreDeploymentAuthoritySimulation,
} from "../lib/trust-fabric/trust-forecast.ts";

const enterpriseId = "10000000-0000-4000-8000-000000000001";
const otherEnterpriseId = "20000000-0000-4000-8000-000000000001";
const evaluatedAt = "2026-08-24T09:00:00.000Z";

function manifest(overrides = {}) {
  const bindings = {
    who: "agent-passport:alpha",
    what: "read_repository",
    why: "source-review",
    authority: "authority:read",
    tools: ["tool:reader@1"],
    data: ["repository:approved"],
    destinations: ["destination:approved"],
    runtime: "runtime:pinned",
    monitoring: ["monitor:audit"],
    model: "model:alpha-v1",
    policy: "policy:read-v1",
    humanControl: "intent:signed-v1",
    evidenceVersion: "evidence:1",
    ...(overrides.bindings ?? {}),
  };
  return createProductionTrustManifest({
    enterpriseId: overrides.enterpriseId ?? enterpriseId,
    subjectId: "agent-alpha",
    approvedAt: evaluatedAt,
    canonicalTransactionReference: "transaction:baseline",
    deploymentGateReference: "deployment-gate:baseline",
    bindings,
  });
}

function condition(dimension, overrides = {}) {
  return {
    dimension,
    status: "STABLE",
    confidence: 0.9,
    evidenceReferences: [`evidence:${dimension.toLowerCase()}`],
    lastVerifiedAt: evaluatedAt,
    freshness: "CURRENT",
    trend: "UNCHANGED",
    materiality: "HIGH",
    knownLimitations: [],
    summary: `${dimension} is within the approved baseline.`,
    signals: [],
    providerIds: ["provider-neutral-test"],
    ...overrides,
  };
}

function forecast(overrides = {}) {
  const approved = overrides.approvedManifest === undefined ? manifest() : overrides.approvedManifest;
  return evaluateTrustForecast({
    enterpriseId: overrides.enterpriseId ?? enterpriseId,
    subject: overrides.subject ?? { type: "AI_AGENT", id: "agent-alpha" },
    horizon: overrides.horizon ?? "PRE_DEPLOYMENT",
    evaluatedAt: overrides.evaluatedAt ?? evaluatedAt,
    policyReference: "policy:read-v1",
    conditions: overrides.conditions ?? [
      condition("IDENTITY_STABILITY", { status: "STRONG" }),
      condition("AUTHORITY_STABILITY"),
      condition("INTENT_ALIGNMENT", { status: "STRONG" }),
      condition("DESTINATION_EXPOSURE"),
      condition("MONITORING_COVERAGE", { status: "COMPLETE" }),
    ],
    authorityIntegrityFindings: overrides.authorityIntegrityFindings ?? [],
    approvedManifest: approved,
    currentManifest: overrides.currentManifest === undefined ? approved : overrides.currentManifest,
    previousForecast: overrides.previousForecast ?? null,
  });
}

test("stable baseline produces an explainable STABLE / QUALIFY forecast", () => {
  const result = forecast();
  assert.equal(result.state, "STABLE");
  assert.equal(result.deploymentRecommendation, "QUALIFY");
  assert.equal(result.snapshotType, "PRE_DEPLOYMENT_TRUST_FORECAST");
  assert.equal(result.recommendedControl.control, "no_action");
  assert.ok(result.conditions.length > 1);
  assert.match(result.explanation.at(-1), /canonical Trust Fabric retains ALLOW \/ REVIEW \/ DENY/);
});

test("authority expansion elevates the forecast and holds deployment", () => {
  const approved = manifest();
  const current = manifest({ bindings: { authority: "authority:read-write" } });
  const result = forecast({ approvedManifest: approved, currentManifest: current, conditions: [condition("AUTHORITY_STABILITY", { status: "ELEVATED", trend: "DETERIORATING", signals: ["PRIVILEGE_INCREASED"] })] });
  assert.equal(result.state, "ELEVATED");
  assert.equal(result.deploymentRecommendation, "HOLD");
  assert.ok(result.forecastSignals.includes("AUTHORITY_BOUNDARY_PRESSURE"));
  assert.ok(result.materialChanges.includes("AUTHORITY_CHANGED"));
});

test("a newly added tool is surfaced as a primary contributor", () => {
  const result = forecast({ conditions: [condition("TOOL_EXPOSURE", { status: "ELEVATED", signals: ["TOOLSET_CHANGED"], summary: "A new MCP tool was added." })] });
  assert.equal(result.state, "ELEVATED");
  assert.equal(result.primaryContributors[0].dimension, "TOOL_EXPOSURE");
  assert.ok(result.requiredControls.some((item) => item.code === "REQUALIFY_TOOL"));
});

test("monitoring loss degrades forecast without claiming malicious activity", () => {
  const result = forecast({ conditions: [condition("MONITORING_COVERAGE", { status: "ELEVATED", signals: ["MONITORING_COVERAGE_GAP"], summary: "Expected observation was not verified." })] });
  assert.equal(result.state, "ELEVATED");
  assert.ok(result.requiredControls.some((item) => item.code === "RESTORE_MONITORING"));
  assert.equal(JSON.stringify(result).includes("malicious"), false);
});

test("destination change is compared against the Production Trust Manifest", () => {
  const approved = manifest();
  const current = manifest({ bindings: { destinations: ["destination:new"] } });
  const result = forecast({ approvedManifest: approved, currentManifest: current, conditions: [condition("DESTINATION_EXPOSURE", { status: "ELEVATED", signals: ["DESTINATION_CHANGED"] })] });
  assert.ok(result.materialChanges.includes("DESTINATION_CHANGED"));
  assert.ok(result.requiredControls.some((item) => item.code === "PIN_DESTINATION"));
});

test("model-controlled security boundaries elevate forecast through existing finding evidence", () => {
  const result = forecast({ authorityIntegrityFindings: ["MODEL_CONTROLLED_SECURITY_BOUNDARY"], conditions: [condition("TOOL_PARAMETER_PROVENANCE", { status: "WATCH" })] });
  assert.equal(result.state, "ELEVATED");
  assert.ok(result.requiredControls.some((item) => item.code === "PIN_DESTINATION"));
});

test("identity discontinuity recommends existing step-up verification", () => {
  const result = forecast({ authorityIntegrityFindings: ["IDENTITY_DISCONTINUITY"], conditions: [condition("IDENTITY_STABILITY", { status: "ELEVATED" })] });
  assert.ok(result.requiredControls.some((item) => item.intervention === "STEP_UP_VERIFICATION"));
});

test("signed-intent mismatch requires human review", () => {
  const result = forecast({ authorityIntegrityFindings: ["SIGNED_INTENT_MISMATCH"], conditions: [condition("INTENT_ALIGNMENT", { status: "ELEVATED" })] });
  assert.ok(result.requiredControls.some((item) => item.code === "REQUIRE_HUMAN_APPROVAL" && item.intervention === "REVIEW"));
});

test("post-revocation stale authority forces SEVERE without becoming a canonical DENY", () => {
  const result = forecast({ authorityIntegrityFindings: ["STALE_AUTHORITY_STILL_ACTIVE"], conditions: [condition("STALE_AUTHORITY_RISK", { status: "SEVERE", trend: "RAPIDLY_DETERIORATING" })] });
  assert.equal(result.state, "SEVERE");
  assert.equal(result.deploymentRecommendation, "DO_NOT_RELEASE");
  assert.equal(result.recommendedControl.control, "revoke_stale_credential");
  assert.equal(Object.hasOwn(result, "decision"), false);
});

test("applied controls improve a prior elevated forecast", () => {
  const elevated = forecast({ conditions: [condition("AUTHORITY_STABILITY", { status: "ELEVATED" })] });
  const restored = forecast({ evaluatedAt: "2026-08-24T09:30:00.000Z", previousForecast: elevated });
  assert.equal(restored.state, "STABLE");
  assert.equal(restored.conditionDirection, "TRUST_CONDITIONS_IMPROVED");
  assert.ok(restored.trustMemoryEvents.some((item) => item.eventType === "TRUST_FORECAST_CLEARED"));
});

test("material changes trigger reauthorization and deployment requalification", () => {
  const approved = manifest();
  const current = manifest({ bindings: { model: "model:alpha-v2", policy: "policy:read-v2" } });
  const result = forecast({ approvedManifest: approved, currentManifest: current });
  assert.equal(result.reauthorizationRequired, true);
  assert.deepEqual(result.materialChanges, ["MODEL_VERSION_CHANGED", "POLICY_CHANGED"]);
  assert.ok(result.requiredControls.some((item) => item.code === "RERUN_DEPLOYMENT_QUALIFICATION"));
});

test("approved Trust Baseline comparison distinguishes requalification, reauthorization and no action", () => {
  const approved = manifest();
  assert.equal(evaluateTrustBaseline(approved, approved).action, "NO_ACTION_REQUIRED");
  assert.equal(evaluateTrustBaseline(approved, manifest({ bindings: { tools: ["tool:reader@1", "tool:writer@1"] } })).action, "REQUALIFICATION_REQUIRED");
  const authorityChange = evaluateTrustBaseline(approved, manifest({ bindings: { authority: "authority:read-write" } }));
  assert.equal(authorityChange.finding, "TRUST_CONDITIONS_CHANGED");
  assert.equal(authorityChange.action, "REAUTHORIZATION_REQUIRED");
});

test("pre-action snapshot derives explicit conditions without becoming a canonical decision", () => {
  const input = createPreActionTrustForecastInput({
    enterpriseId,
    subject: { type: "AI_AGENT", id: "agent-alpha" },
    evaluatedAt,
    policyReference: "policy:read-v1",
    actorReference: "actor:reviewer",
    authorityReference: "authority:read",
    authorityScopeValid: true,
    actionReference: "write_repository:repo:alpha",
    toolReference: "write_repository",
    parameterProvenanceReference: "digest:abc",
    runtimeReference: "runtime:pinned",
    monitoringCoverage: "partial",
    destinationReference: "destination:approved",
    humanApproval: "not_required",
    consequence: "high",
    evidenceReferences: ["evidence:pre-action"],
    evidenceFresh: true,
    evidenceComplete: true,
  });
  const result = evaluateTrustForecast(input);
  assert.equal(result.snapshotType, "PRE_ACTION_TRUST_FORECAST");
  assert.ok(result.conditions.some((item) => item.dimension === "MONITORING_COVERAGE"));
  assert.equal(result.actionRecommendation, result.deploymentRecommendation);
  assert.equal(Object.hasOwn(result, "decision"), false);
});

test("minimum viable controls are ranked by disruption and retain exact portable control codes", () => {
  const result = forecast({ conditions: [condition("DESTINATION_EXPOSURE", { status: "ELEVATED", signals: ["DESTINATION_CHANGED", "MONITORING_COVERAGE_GAP"] })] });
  assert.equal(result.requiredControls[0].rank, 1);
  assert.ok(result.requiredControls.every((item, index) => item.rank === index + 1));
  assert.ok(result.requiredControls.some((item) => item.control === "pin_destination"));
  assert.ok(result.requiredControls.some((item) => item.control === "restore_monitoring"));
  assert.equal(result.recommendedControl.disruption, Math.min(...result.requiredControls.map((item) => item.disruption)));
});

test("missing conditions returns INSUFFICIENT_EVIDENCE", () => {
  const result = forecast({ conditions: [], approvedManifest: null, currentManifest: null });
  assert.equal(result.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.deploymentRecommendation, "REVIEW_REQUIRED");
});

test("forecast history is append-only, deduplicated and reconstructable", () => {
  const first = forecast();
  const second = forecast({ evaluatedAt: "2026-08-24T09:15:00.000Z", previousForecast: first, conditions: [condition("AUTHORITY_STABILITY", { status: "ELEVATED" })] });
  const once = appendTrustForecastHistory([], first);
  const duplicate = appendTrustForecastHistory(once, first);
  const history = appendTrustForecastHistory(duplicate, second, { intervention: "PAUSE" });
  assert.equal(history.length, 2);
  assert.equal(history[0].state, "STABLE");
  assert.equal(history[1].intervention, "PAUSE");
  assert.equal(Object.isFrozen(first), true);
});

test("forecast contributor explanations remain explicit instead of hidden in a score", () => {
  const result = forecast({ conditions: [condition("PRIVILEGE_CHANGE_RISK", { status: "ELEVATED", summary: "Privilege increased from read to write." }), condition("IDENTITY_STABILITY", { status: "STRONG", summary: "Identity continuity remains strong." })] });
  assert.match(result.primaryContributors[0].explanation, /Privilege increased/);
  assert.match(result.mitigatingConditions[0].explanation, /Identity continuity/);
});

test("existing Evidence Graph projection links conditions, forecast, recommendation and interventions", () => {
  const result = forecast({ conditions: [condition("MONITORING_COVERAGE", { status: "ELEVATED", signals: ["MONITORING_COVERAGE_GAP"] })] });
  for (const nodeType of ["TRUST_CONDITION", "FORECAST", "CONTRIBUTOR", "AUTHORITY", "EVIDENCE", "RECOMMENDATION", "INTERVENTION", "ACTION", "OUTCOME", "FORECAST_UPDATE"]) assert.ok(result.graphProjection.nodes.some((item) => item.nodeType === nodeType));
  assert.ok(result.graphProjection.edges.some((item) => item.toNodeType === "FORECAST"));
});

test("Replay preserves forecast, transition and recommended control evidence", () => {
  const first = forecast();
  const result = forecast({ evaluatedAt: "2026-08-24T09:15:00.000Z", previousForecast: first, conditions: [condition("AUTHORITY_STABILITY", { status: "ELEVATED" })] });
  for (const eventType of ["TRUST_FORECAST_EVALUATED", "TRUST_FORECAST_CHANGED", "TRUST_FORECAST_CONTROL_RECOMMENDED"]) assert.ok(result.replayEvents.some((item) => item.eventType === eventType));
});

test("Trust Memory retains only material forecast transitions", () => {
  const stable = forecast();
  const elevated = forecast({ conditions: [condition("AUTHORITY_STABILITY", { status: "ELEVATED" })] });
  assert.equal(stable.trustMemoryEvents.length, 0);
  assert.ok(elevated.trustMemoryEvents.some((item) => item.eventType === "FORECAST_ENTERED_ELEVATED"));
  assert.ok(elevated.trustMemoryEvents.some((item) => item.eventType === "DEPLOYMENT_HELD"));
});

test("forecast and future ML readiness cannot bypass the canonical evaluator", () => {
  const result = forecast({ conditions: [condition("STALE_AUTHORITY_RISK", { status: "SEVERE" })] });
  assert.deepEqual(result.canonicalDecisionBoundary, { decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY", forecastCanAllow: false, forecastCanDeny: false, mlCanDeny: false });
  assert.equal(result.mlReadiness.modelUsed, false);
  assert.equal(result.mlReadiness.trainingPerformed, false);
  assert.equal(result.mlReadiness.incidentProbabilityClaimed, false);
  const episode = createTrustForecastMlEpisode({ forecast: result, canonicalDecision: "DENY", executionOutcome: "NOT_EXECUTED", destinationOutcome: "NOT_OBSERVED" });
  assert.equal(episode.automaticTrainingStarted, false);
  for (const field of ["conditionsBeforeAction", "forecast", "authorityState", "identityState", "toolState", "runtimeState", "monitoringState", "policyState", "consequenceExposure", "laterResult"]) assert.ok(Object.hasOwn(episode, field));
  assert.equal(Object.hasOwn(episode, "predictedDecision"), false);
});

test("outcome feedback is append-only Replay, graph and material Trust Memory evidence", () => {
  const result = forecast({ conditions: [condition("AUTHORITY_STABILITY", { status: "ELEVATED" })] });
  const feedback = createTrustForecastOutcomeFeedback({ forecast: result, canonicalDecision: "REVIEW", intervention: "PAUSE", controlApplied: "reduce_authority", executionOutcome: "NOT_EXECUTED", destinationOutcome: "NOT_OBSERVED", laterResult: "SUCCESSFUL_REQUALIFICATION", occurredAt: "2026-08-24T10:00:00.000Z" });
  assert.equal(feedback.forecastId, result.forecastId);
  for (const eventType of ["CANONICAL_REVIEW", "CONTROL_APPLIED", "SUCCESSFUL_REQUALIFICATION"]) assert.ok(feedback.trustMemoryEvents.some((item) => item.eventType === eventType));
  assert.ok(feedback.replayEvents.some((item) => item.eventType === "TRUST_FORECAST_OUTCOME_RECORDED"));
  assert.ok(feedback.graphProjection.nodes.some((item) => item.nodeType === "FORECAST_UPDATE"));
});

test("cross-tenant manifests fail closed", () => {
  assert.throws(() => forecast({ currentManifest: manifest({ enterpriseId: otherEnterpriseId }) }), /TRUST_FORECAST_TENANT_SCOPE_MISMATCH/);
  assert.throws(() => compareProductionTrustManifests(manifest(), manifest({ enterpriseId: otherEnterpriseId })), /TENANT_OR_SUBJECT_MISMATCH/);
});

test("provider-neutral CI contract stops at forecast and requires canonical qualification", () => {
  const elevated = forecast({ conditions: [condition("AUTHORITY_STABILITY", { status: "ELEVATED" })] });
  const contract = createTrustForecastCiContract(elevated);
  assert.equal(contract.pipelineOutcome, "HOLD");
  assert.equal(contract.canonicalQualificationRequired, true);
  assert.equal(contract.deploymentMayProceed, false);
});

test("authority simulation evaluates synthetic intent without destructive execution", async () => {
  let calls = 0;
  const evidence = await runPreDeploymentAuthoritySimulation({
    evaluatedAt,
    scenarios: ["WRITE_REPOSITORY", "DELETE_REPOSITORY", "CROSS_TENANT_ACCESS", "MODEL_CONTROLLED_SECURITY_FIELD"],
    async evaluateCanonicalPolicy(input) {
      calls += 1;
      assert.equal(input.syntheticIntent, true);
      assert.equal(input.executionAllowed, false);
      return { decision: "DENY", reasonCodes: ["SCOPE_OUTSIDE_CONTRACT"] };
    },
  });
  assert.equal(calls, 4);
  assert.equal(evidence.evidenceType, "PRE_DEPLOYMENT_AUTHORITY_TEST_EVIDENCE");
  assert.equal(evidence.destructiveExecutionPerformed, false);
});

test("condition and subject contracts cover the requested Trust Fabric and VALE surfaces", () => {
  assert.equal(TRUST_CONDITION_DIMENSIONS.length, 21);
  assert.deepEqual(TRUST_CONDITION_TRENDS, ["IMPROVING", "UNCHANGED", "DETERIORATING", "RAPIDLY_DETERIORATING", "UNKNOWN"]);
  assert.deepEqual(FORECAST_SUBJECT_TYPES, ["HUMAN", "AI_AGENT", "SOFTWARE_AGENT", "MACHINE", "ROBOT", "WORKLOAD"]);
});

test("plug-and-play contract reuses the current API across all provider-neutral integration modes", () => {
  const contract = createTrustForecastIntegrationContract();
  assert.deepEqual(contract.modes, TRUST_FORECAST_INTEGRATION_MODES);
  assert.equal(contract.currentApiReuseRequired, true);
  assert.equal(contract.redundantRoutesRequired, false);
  assert.ok(contract.supportedOperations.includes("POST_FORECAST_EVIDENCE"));
});

test("migration extends existing artifacts without new forecast tables or public execution", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260824184543_trust_forecast_operational_intelligence.sql", import.meta.url), "utf8");
  assert.equal(/create\s+table/i.test(sql), false);
  for (const routine of ["extend_canonical_trust_transaction_graph_v1", "append_canonical_trust_transaction_replay_v1", "emit_canonical_trust_transaction_memory_v1"]) assert.match(sql, new RegExp(`create or replace function public\\.${routine}`));
  assert.match(sql, /set search_path=''/);
  assert.match(sql, /revoke all on function[\s\S]+from public,anon,authenticated/);
  assert.match(sql, /grant execute on function[\s\S]+to service_role/);
  assert.match(sql, /\{trustForecast,graphProjection\}/);
  assert.match(sql, /\{trustForecast,replayEvents\}/);
  assert.match(sql, /\{trustForecast,trustMemoryEvents\}/);
});

test("Trust Weather UI is professional, deterministic and explicitly non-production", async () => {
  const source = await readFile(new URL("../app/trust-prediction/page.tsx", import.meta.url), "utf8");
  for (const text of ["Trust Forecast™", "NON-PRODUCTION DEMO", "Current conditions", "Primary drivers", "Recommended controls", "Mitigating conditions", "Action recommendation", "Forecast history", "Canonical result", "AUTHORITY_SCOPE_INVALID", "Evidence Graph", "Replay", "Trust Memory", "Receipt", "Cyber Sentinels saw the trust conditions weakening before the action"]) assert.ok(source.includes(text));
  assert.equal(source.includes("predictTrustRisk"), false);
  assert.equal(source.includes("weather icon"), false);
});
