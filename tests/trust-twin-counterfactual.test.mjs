import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COUNTERFACTUAL_CHANGE_TYPES,
  TRUST_BUDGET_STATUSES,
  TRUST_PRESSURE_LEVELS,
  TRUST_PRESSURE_TRENDS,
  TRUST_TWIN_ENTITY_TYPES,
  createAgentAlphaTrustTwinDemo,
  createCounterfactualOutcomeFeedback,
  createTrustTwin,
  simulateCounterfactualTrust,
} from "../lib/trust-fabric/trust-twin.ts";

const enterpriseId = "7c60bb54-a74c-4ea4-b137-50cb1bc92f4b";
const otherEnterpriseId = "8c60bb54-a74c-4ea4-b137-50cb1bc92f4b";

function scenario() { return createAgentAlphaTrustTwinDemo(); }

test("stable Trust Twin is a replayable projection over canonical evidence", () => {
  const { baseline } = scenario();
  assert.equal(baseline.label, "DERIVED_TRUST_TWIN");
  assert.equal(baseline.source, "CANONICAL_EVIDENCE_PROJECTION");
  assert.equal(baseline.trustForecast.state, "STABLE");
  assert.equal(baseline.trustPressure.value, 14);
  assert.equal(baseline.trustBudget.remaining, 86);
  assert.equal(baseline.consequenceReach.systemCount, 7);
  assert.equal(baseline.trustForecast.trustTwinContext.source, "DERIVED_TRUST_TWIN_INPUT");
  assert.equal(baseline.trustForecast.trustTwinContext.trustPressure.value, baseline.trustPressure.value);
  assert.equal(baseline.trustForecast.trustTwinContext.trustBudget.remaining, baseline.trustBudget.remaining);
  assert.equal(baseline.trustForecast.trustTwinContext.advisoryOnly, true);
  assert.equal(baseline.trustMemoryEvents.length, 0);
  assert.equal(Object.isFrozen(baseline), true);
});

test("authority and tool expansion update the Twin and spike explainable pressure", () => {
  const { projected } = scenario();
  const twin = projected.projectedTwin;
  assert.equal(twin.authorityState, "ELEVATED");
  assert.equal(twin.toolState, "ELEVATED");
  assert.equal(twin.trustPressure.value, 81);
  assert.equal(twin.trustPressure.level, "CRITICAL");
  assert.equal(twin.trustPressure.trend, "SPIKING");
  assert.ok(twin.materialEvents.some((item) => item.eventType === "TWIN_AUTHORITY_CHANGED"));
  assert.ok(twin.materialEvents.some((item) => item.eventType === "TWIN_PRESSURE_SPIKE"));
});

test("monitoring degradation consumes budget and recommends restoration", () => {
  const { baseline } = scenario();
  const simulation = simulateCounterfactualTrust({ enterpriseId, currentTwin: baseline, evaluatedAt: "2026-08-24T10:00:00.000Z", changes: [{ changeType: "REMOVE_MONITORING" }] });
  assert.equal(simulation.projectedTwin.monitoringState, "ELEVATED");
  assert.ok(simulation.projectedTwin.trustPressure.value > baseline.trustPressure.value);
  assert.ok(simulation.recommendedControls.some((item) => item.code === "RESTORE_MONITORING"));
  assert.ok(simulation.projectedTwin.materialEvents.some((item) => item.eventType === "TWIN_MONITORING_DEGRADED"));
});

test("controls decrease pressure and restore contextual budget", () => {
  const { projected, controlled } = scenario();
  assert.equal(projected.projectedTwin.trustBudget.status, "NEAR_LIMIT");
  assert.equal(controlled.projectedTwin.trustForecast.state, "STABLE");
  assert.equal(controlled.projectedTwin.trustPressure.value, 22);
  assert.equal(controlled.projectedTwin.trustPressure.trend, "FALLING");
  assert.equal(controlled.projectedTwin.trustBudget.remaining, 78);
  assert.equal(controlled.projectedTwin.trustBudget.status, "HEALTHY");
});

test("Trust Budget tolerance is contextual rather than a pressure inversion", () => {
  const { baseline } = scenario();
  const strict = createTrustTwin({
    enterpriseId,
    entity: { id: baseline.entityId, type: baseline.entityType },
    owner: baseline.owner,
    purpose: "move_eur_10m",
    evaluatedAt: "2026-08-24T10:05:00.000Z",
    forecastInput: {
      enterpriseId,
      subject: { id: baseline.entityId, type: baseline.entityType },
      horizon: "NEXT_CONSEQUENTIAL_ACTION",
      evaluatedAt: "2026-08-24T10:05:00.000Z",
      policyReference: baseline.policyReference,
      conditions: baseline.trustForecast.conditions,
    },
    consequenceReach: {
      systems: baseline.consequenceReach.systems,
      credentials: baseline.consequenceReach.credentials,
      tools: baseline.consequenceReach.tools,
      dataClasses: ["regulated-financial"],
      destinations: baseline.consequenceReach.destinations,
      downstreamAgents: baseline.consequenceReach.downstreamAgents,
      productionResources: ["payment-rail:production"],
      financialExposure: ["EUR:10000000"],
      humanImpactingSystems: [],
    },
    budgetContext: {
      consequenceSeverity: "CRITICAL",
      dataSensitivity: "RESTRICTED",
      privilegeLevel: "WRITE_HIGH_VALUE_PAYMENT",
      financialExposure: "EUR_10M",
      reversibility: "LOW",
      humanSafetyImpact: "NONE_OBSERVED",
      regulatorySensitivity: "REGULATED",
      authorityScope: "EXPANDED",
      policyTolerance: "STRICT",
      monitoringConfidence: 0.4,
    },
  });
  assert.equal(strict.trustPressure.value, baseline.trustPressure.value);
  assert.ok(strict.trustBudget.total < baseline.trustBudget.total);
  assert.ok(strict.trustBudget.remaining < baseline.trustBudget.remaining);
  assert.equal(strict.trustBudget.status, "EXCEEDED");
  assert.ok(strict.trustBudget.contextualConstraints.some((item) => item.code === "BUDGET_FINANCIAL_EXPOSURE"));
  assert.ok(strict.recommendedControls.some((item) => item.code === "REQUIRE_HUMAN_APPROVAL"));
});

test("compounded uncertainty can exceed the normalized Trust Budget", () => {
  const { baseline } = scenario();
  const result = simulateCounterfactualTrust({
    enterpriseId,
    currentTwin: baseline,
    evaluatedAt: "2026-08-24T10:10:00.000Z",
    changes: [
      { changeType: "GRANT_WRITE_REPOSITORY" }, { changeType: "ADD_MCP_TOOL" }, { changeType: "CHANGE_DESTINATION" },
      { changeType: "REMOVE_MONITORING" }, { changeType: "REMOVE_HUMAN_APPROVAL" }, { changeType: "CHANGE_RUNTIME" },
    ],
  });
  assert.equal(result.projectedTwin.trustPressure.value, 100);
  assert.equal(result.projectedTwin.trustBudget.remaining, 0);
  assert.equal(result.projectedTwin.trustBudget.status, "EXCEEDED");
  assert.ok(result.projectedTwin.materialEvents.some((item) => item.eventType === "TWIN_BUDGET_EXCEEDED"));
});

test("counterfactual authority increase, monitoring removal, and destination pin remain isolated", () => {
  const { baseline } = scenario();
  const authority = simulateCounterfactualTrust({ enterpriseId, currentTwin: baseline, evaluatedAt: "2026-08-24T10:20:00.000Z", changes: [{ changeType: "INCREASE_PRIVILEGE" }] });
  const monitoring = simulateCounterfactualTrust({ enterpriseId, currentTwin: baseline, evaluatedAt: "2026-08-24T10:21:00.000Z", changes: [{ changeType: "REMOVE_MONITORING" }] });
  const pinned = simulateCounterfactualTrust({ enterpriseId, currentTwin: scenario().projected.projectedTwin, evaluatedAt: "2026-08-24T10:22:00.000Z", changes: [{ changeType: "PIN_DESTINATION" }] });
  assert.equal(authority.projectedTwin.authorityState, "ELEVATED");
  assert.equal(monitoring.projectedTwin.monitoringState, "ELEVATED");
  assert.equal(pinned.projectedTwin.destinationState, "STABLE");
  for (const result of [authority, monitoring, pinned]) {
    assert.equal(result.type, "COUNTERFACTUAL_TRUST_SIMULATION");
    assert.equal(result.executionPerformed, false);
    assert.equal(result.persistedAsCanonicalExecution, false);
  }
});

test("blast-radius expansion and reduction use known reach rather than damage prediction", () => {
  const { projected, controlled } = scenario();
  assert.deepEqual(projected.delta.projectedBlastRadius, { from: 7, to: 19, change: 12 });
  assert.equal(controlled.projectedTwin.consequenceReach.systemCount, 11);
  assert.ok(controlled.projectedTwin.consequenceReach.systemCount < projected.projectedTwin.consequenceReach.systemCount);
  assert.match(projected.knownLimitations.join(" "), /not an exact damage prediction/i);
});

test("minimum controls are ranked by disruption, specificity, restoration, and confidence", () => {
  const controls = scenario().projected.recommendedControls;
  assert.equal(controls[0].code, "PIN_DESTINATION");
  assert.ok(controls.some((item) => item.code === "REDUCE_AUTHORITY"));
  assert.ok(controls.some((item) => item.code === "RESTORE_MONITORING"));
  assert.ok(controls.some((item) => item.code === "REQUALIFY_TOOL"));
  assert.ok(controls.every((item, index) => item.rank === index + 1));
});

test("simulation never becomes a real execution or canonical decision", () => {
  const { baseline, projected } = scenario();
  assert.equal(Object.hasOwn(projected, "decision"), false);
  assert.equal(projected.currentTwin.twinDigest, baseline.twinDigest);
  assert.equal(baseline.trustMemoryEvents.some((item) => item.eventType.includes("COUNTERFACTUAL")), false);
  assert.deepEqual(projected.projectedTwin.canonicalDecisionBoundary, { decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY", pressureCanDeny: false, budgetCanDeny: false, twinCanExecute: false, verificationCanGrantAuthority: false });
});

test("reviewed counterfactual outcome creates material memory without rewriting the simulation as execution", () => {
  const { projected } = scenario();
  const feedback = createCounterfactualOutcomeFeedback({ simulation: projected, enterpriseId, controlApplied: "REDUCE_AUTHORITY", canonicalDecision: "DENY", executionOutcome: "NOT_EXECUTED", destinationOutcome: "NOT_OBSERVED", laterResult: "STABLE_AFTER_CONTROL", occurredAt: "2026-08-24T11:00:00.000Z" });
  assert.ok(feedback.trustMemoryEvents.some((item) => item.eventType === "COUNTERFACTUAL_PREVENTED_UNSAFE_RELEASE"));
  assert.ok(feedback.trustMemoryEvents.some((item) => item.eventType === "CONTROL_RESTORED_TRUST"));
  assert.equal(feedback.replayEvents[0].simulated, false);
  assert.equal(feedback.automaticTrainingStarted, false);
  for (const key of ["twinStateBefore", "pressure", "budget", "forecast", "proposedChange", "counterfactualProjection", "controlRecommended", "controlApplied", "canonicalDecision", "executionOutcome", "destinationOutcome", "laterResult"]) assert.ok(Object.hasOwn(feedback.mlEpisode, key));
});

test("existing Evidence Graph, Replay, and Trust Memory projections cover the full Twin chain", () => {
  const twin = scenario().projected.projectedTwin;
  for (const nodeType of ["ENTITY", "TRUST_TWIN", "TRUST_CONDITION", "PRESSURE", "BUDGET", "FORECAST", "RECOMMENDATION", "ACTION", "OUTCOME", "FORECAST_UPDATE"]) assert.ok(twin.graphProjection.nodes.some((item) => item.nodeType === nodeType), nodeType);
  for (const eventType of ["TRUST_TWIN_PROJECTED", "TRUST_PRESSURE_EVALUATED", "TRUST_BUDGET_EVALUATED", "TRUST_FORECAST_EVALUATED"]) assert.ok(twin.replayEvents.some((item) => item.eventType === eventType), eventType);
  for (const eventType of ["PRESSURE_SPIKE", "BLAST_RADIUS_MATERIALLY_INCREASED"]) assert.ok(twin.trustMemoryEvents.some((item) => item.eventType === eventType), eventType);
  assert.ok(scenario().controlled.projectedTwin.trustMemoryEvents.some((item) => item.eventType === "CONTROL_RESTORED_TRUST"));
});

test("cross-tenant access and counterfactual feedback fail closed", () => {
  const { baseline, projected } = scenario();
  assert.throws(() => simulateCounterfactualTrust({ enterpriseId: otherEnterpriseId, currentTwin: baseline, evaluatedAt: "2026-08-24T11:10:00.000Z", changes: [{ changeType: "REMOVE_MONITORING" }] }), /TENANT_SCOPE_MISMATCH/);
  assert.throws(() => createCounterfactualOutcomeFeedback({ simulation: projected, enterpriseId: otherEnterpriseId, canonicalDecision: "DENY", executionOutcome: "NOT_EXECUTED", destinationOutcome: "NOT_OBSERVED", laterResult: "HELD", occurredAt: "2026-08-24T11:11:00.000Z" }), /TENANT_SCOPE_MISMATCH/);
});

test("one VALE-compatible Trust Twin architecture supports all entity types", () => {
  const { baseline } = scenario();
  for (const type of TRUST_TWIN_ENTITY_TYPES) {
    const twin = createTrustTwin({
      enterpriseId,
      entity: { id: `vale-${type.toLowerCase()}`, type },
      owner: "owner:vale-test",
      purpose: "controlled-operation",
      evaluatedAt: "2026-08-24T12:00:00.000Z",
      forecastInput: { enterpriseId, subject: { id: `vale-${type.toLowerCase()}`, type }, horizon: "NEXT_CONSEQUENTIAL_ACTION", evaluatedAt: "2026-08-24T12:00:00.000Z", policyReference: baseline.policyReference, conditions: baseline.trustForecast.conditions },
      consequenceReach: { systems: ["system:vale-test"], credentials: [], tools: [], dataClasses: [], destinations: [], downstreamAgents: [], productionResources: [], financialExposure: [], humanImpactingSystems: type === "ROBOT" ? ["workspace:human"] : [] },
    });
    assert.equal(twin.entityType, type);
    assert.equal(twin.label, "DERIVED_TRUST_TWIN");
  }
});

test("raw secrets are rejected from Twin and simulation evidence", () => {
  const { baseline } = scenario();
  assert.throws(() => simulateCounterfactualTrust({ enterpriseId, currentTwin: baseline, evaluatedAt: "2026-08-24T12:10:00.000Z", changes: [{ changeType: "CHANGE_DESTINATION", target: "Bearer abcdefghijklmnopqrstuvwxyz" }] }), /raw secret/);
  assert.equal(JSON.stringify(baseline).includes("PRIVATE KEY"), false);
});

test("contracts expose requested pressure, budget, change, and entity vocabularies", () => {
  assert.deepEqual(TRUST_PRESSURE_LEVELS, ["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN"]);
  assert.deepEqual(TRUST_PRESSURE_TRENDS, ["RISING", "FALLING", "STABLE", "SPIKING", "UNKNOWN"]);
  assert.deepEqual(TRUST_BUDGET_STATUSES, ["HEALTHY", "CONSTRAINED", "NEAR_LIMIT", "EXCEEDED", "UNKNOWN"]);
  for (const change of ["GRANT_WRITE_REPOSITORY", "ADD_MCP_TOOL", "REMOVE_MONITORING", "PIN_DESTINATION", "RESTORE_MONITORING"]) assert.ok(COUNTERFACTUAL_CHANGE_TYPES.includes(change));
});

test("tenant-scoped APIs reuse canonical snapshots and the simulation endpoint performs no write", async () => {
  const readRoute = await readFile(new URL("../app/api/trust/twin/[entityId]/route.ts", import.meta.url), "utf8");
  const simulationRoute = await readFile(new URL("../app/api/trust/twin/[entityId]/simulations/route.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../lib/trust-fabric/trust-twin-server.ts", import.meta.url), "utf8");
  assert.match(readRoute, /architectureContext/);
  assert.match(readRoute, /trustPressure/);
  assert.match(readRoute, /trustBudget/);
  assert.match(simulationRoute, /canonicalExecutionInvoked:\s*false/);
  assert.match(simulationRoute, /persistencePerformed:\s*false/);
  assert.match(simulationRoute, /architectureReference\(candidate\.target, "change target"\)/);
  assert.match(simulationRoute, /COUNTERFACTUAL_EXPLANATION_INVALID/);
  assert.equal(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/.test(simulationRoute), false);
  assert.match(server, /canonical_trust_transactions/);
  assert.match(server, /\.eq\("enterprise_id", input\.enterpriseId\)/);
});

test("migration extends existing canonical graph, Replay, and Trust Memory without a new table", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260824184543_trust_forecast_operational_intelligence.sql", import.meta.url), "utf8");
  assert.equal(/create\s+table/i.test(sql), false);
  for (const path of ["{trustTwin,graphProjection}", "{trustTwin,replayEvents}", "{trustTwin,trustMemoryEvents}"]) assert.ok(sql.includes(path));
  assert.match(sql, /set search_path=''/);
  assert.match(sql, /revoke all on function[\s\S]+from public,anon,authenticated/);
  assert.match(sql, /grant execute on function[\s\S]+to service_role/);
});

test("canonical pre-action integration derives the Twin before consuming its forecast", async () => {
  const source = await readFile(new URL("../src/lib/trust-transaction/canonical.ts", import.meta.url), "utf8");
  assert.ok(source.indexOf("const trustTwin = createTrustTwin") < source.indexOf("const trustForecast = trustTwin.trustForecast"));
  assert.equal(/trustPressure\.value[^\n]+decision\s*=\s*"DENY"/.test(source), false);
  assert.match(source, /TRUST_TWIN_MATERIAL_EVENT/);
});

test("Agent Alpha UI shows the exact safe transformation and canonical denial proof", async () => {
  const source = await readFile(new URL("../app/trust-prediction/page.tsx", import.meta.url), "utf8");
  for (const text of ["Trust Twin™", "Trust Forecast™", "Trust Pressure", "Trust Budget", "What If?", "NOW → PROPOSED CHANGE → PROJECTED STATE", "Consequence reach", "Projected blast radius", "Recommended controls", "Action recommendation", "Primary drivers", "Mitigating conditions", "Forecast history", "Canonical result", "AUTHORITY_SCOPE_INVALID", "Evidence Graph", "Replay", "Trust Memory", "Receipt", "NON-PRODUCTION DEMO"]) assert.ok(source.includes(text), text);
  assert.equal(source.includes("exact damage prediction"), true);
});
