import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  VERIFICATION_CHALLENGES,
  VERIFICATION_DEPTHS,
  createAdaptiveVerificationCoverage,
  evaluateAdaptiveVerification,
} from "../lib/trust-fabric/adaptive-verification.ts";
import { createAgentAlphaTrustTwinDemo } from "../lib/trust-fabric/trust-twin.ts";

const enterpriseId = "7c60bb54-a74c-4ea4-b137-50cb1bc92f4b";
const otherEnterpriseId = "8c60bb54-a74c-4ea4-b137-50cb1bc92f4b";
const demo = createAgentAlphaTrustTwinDemo();

function verificationInput(overrides = {}) {
  const entity = overrides.entity ?? { id: "entity:adaptive-demo", type: "AI_AGENT" };
  const forecast = structuredClone(overrides.forecast ?? demo.baseline.trustForecast);
  forecast.enterpriseId = enterpriseId;
  forecast.subject = entity;
  return {
    enterpriseId,
    entity,
    action: { type: "read_repository", purpose: "inspect_source", environment: "sandbox" },
    authorityReference: "authority:adaptive-demo",
    authorityScopeValid: true,
    evaluatedAt: "2026-08-24T09:10:00.000Z",
    forecast,
    trustPressure: { value: 14, level: "LOW", trend: "STABLE", primaryContributors: [] },
    trustBudget: {
      total: 100,
      consumed: 14,
      remaining: 86,
      status: "HEALTHY",
      context: { consequenceSeverity: "LOW", dataSensitivity: "INTERNAL", financialExposure: "NONE", humanSafetyImpact: "NONE_OBSERVED" },
      contextualConstraints: [],
    },
    consequenceReach: {
      systemCount: 3,
      dimensionCount: 3,
      level: "BOUNDED",
      productionResources: [],
      financialExposure: [],
      humanImpactingSystems: [],
      dataClasses: ["internal-source"],
      destinations: [],
    },
    evidence: [],
    materialChanges: [],
    ...overrides,
    forecast,
    entity,
  };
}

function consequentialInput(overrides = {}) {
  return verificationInput({
    evaluatedAt: "2026-08-24T09:30:00.000Z",
    action: { type: "production_write", purpose: "update_release", environment: "production" },
    trustPressure: { value: 72, level: "HIGH", trend: "RISING", primaryContributors: [{ code: "AUTHORITY_EXPANSION", evidenceReferences: ["evidence:authority"] }] },
    trustBudget: {
      total: 70,
      consumed: 58,
      remaining: 12,
      status: "NEAR_LIMIT",
      context: { consequenceSeverity: "HIGH", dataSensitivity: "RESTRICTED", financialExposure: "NONE", humanSafetyImpact: "NONE_OBSERVED" },
      contextualConstraints: [{ code: "PRODUCTION_WRITE", evidenceReferences: ["policy:production"] }],
    },
    consequenceReach: {
      systemCount: 18,
      dimensionCount: 7,
      level: "BROAD",
      productionResources: ["repository:production"],
      financialExposure: [],
      humanImpactingSystems: [],
      dataClasses: ["restricted-source"],
      destinations: ["destination:release"],
    },
    ...overrides,
  });
}

function satisfyingEvidence(requirement, observedAt = "2026-08-24T09:29:00.000Z") {
  return requirement.requiredEvidence.map((item) => ({
    challenge: item.challenge,
    evidenceType: item.challenge,
    providerClass: item.acceptableProviderClasses[0],
    providerKey: `provider:${item.challenge.toLowerCase()}`,
    observedAt,
    expiresAt: "2026-08-24T10:30:00.000Z",
    outcome: "PASSED",
    assurance: 0.99,
    evidenceReferences: [`evidence:${item.challenge.toLowerCase()}`],
    retestReference: `retest:${item.challenge.toLowerCase()}`,
  }));
}

test("depth model observes low-consequence human work and steps up consequential human work", () => {
  const entity = { id: "human:release-owner", type: "HUMAN" };
  const observed = evaluateAdaptiveVerification(verificationInput({ entity }));
  const stepped = evaluateAdaptiveVerification(consequentialInput({
    entity,
    action: { type: "approve_release", purpose: "approve release", environment: "staging" },
    trustPressure: { value: 30, level: "MODERATE", trend: "STABLE", primaryContributors: [] },
    trustBudget: { ...verificationInput().trustBudget, context: { ...verificationInput().trustBudget.context, consequenceSeverity: "HIGH" } },
    consequenceReach: { ...consequentialInput().consequenceReach, productionResources: [], level: "BOUNDED", systemCount: 8 },
  }));
  assert.equal(observed.requiredVerificationDepth, "OBSERVE");
  assert.equal(stepped.requiredVerificationDepth, "STEP_UP");
  assert.ok(stepped.requiredEvidence.some((item) => item.challenge === "VERIFY_DEVICE"));
});

test("agents verify configuration and gate high-consequence production changes", () => {
  const verified = evaluateAdaptiveVerification(verificationInput({ action: { type: "write_draft", purpose: "prepare change", environment: "sandbox" }, trustBudget: { ...verificationInput().trustBudget, context: { ...verificationInput().trustBudget.context, consequenceSeverity: "MATERIAL" } } }));
  const gated = evaluateAdaptiveVerification(consequentialInput());
  assert.equal(verified.requiredVerificationDepth, "VERIFY");
  assert.equal(gated.requiredVerificationDepth, "GATE");
  assert.ok(gated.requiredEvidence.some((item) => item.challenge === "VERIFY_AGENT_CONFIGURATION"));
  assert.ok(gated.requiredEvidence.some((item) => item.challenge === "VERIFY_DESTINATION"));
});

test("workloads, machines, and robots reuse the same Fabric contract with contextual proof", () => {
  for (const type of ["WORKLOAD", "MACHINE", "ROBOT"]) {
    const entity = { id: `${type.toLowerCase()}:demo`, type };
    const result = evaluateAdaptiveVerification(consequentialInput({ entity }));
    assert.ok(result.requiredEvidence.some((item) => item.challenge === "VERIFY_RUNTIME"));
    assert.ok(result.requiredEvidence.some((item) => item.challenge === "VERIFY_MACHINE_STATE"));
    assert.equal(result.source, "DERIVED_FROM_TRUST_TWIN_AND_CANONICAL_EVIDENCE");
  }
});

test("consequence, pressure, reach, and budget escalate proof without predicting maliciousness", () => {
  const result = evaluateAdaptiveVerification(consequentialInput());
  assert.equal(result.consequence, "HIGH");
  assert.equal(result.requiredVerificationDepth, "GATE");
  assert.equal(result.canonicalAuthorityBoundary.lowTrustMeansMalicious, false);
  assert.match(result.reason.join(" "), /Trust Pressure is 72; Trust Budget is 12\/70/);
});

test("freshness is contextual and material change invalidates only affected proof", () => {
  const requirement = evaluateAdaptiveVerification(verificationInput({ action: { type: "write_draft", purpose: "prepare change", environment: "sandbox" }, trustBudget: { ...verificationInput().trustBudget, context: { ...verificationInput().trustBudget.context, consequenceSeverity: "MATERIAL" } } }));
  const freshInput = verificationInput({ action: { type: "write_draft", purpose: "prepare change", environment: "sandbox" }, trustBudget: { ...verificationInput().trustBudget, context: { ...verificationInput().trustBudget.context, consequenceSeverity: "MATERIAL" } }, evidence: satisfyingEvidence(requirement) });
  const fresh = evaluateAdaptiveVerification(freshInput);
  assert.equal(fresh.verificationStatus, "SATISFIED");
  const stale = evaluateAdaptiveVerification({ ...freshInput, evaluatedAt: "2026-08-26T09:10:00.000Z" });
  assert.equal(stale.evidenceFreshness, "EXPIRED");
  const changed = evaluateAdaptiveVerification({ ...freshInput, materialChanges: ["TOOLSET_CHANGED"], evidence: satisfyingEvidence(requirement).map((item) => ({ ...item, retestReference: null })) });
  assert.ok(changed.currentEvidence.some((item) => item.challenge === "VERIFY_AGENT_CONFIGURATION" && item.status === "INVALIDATED_BY_CHANGE"));
});

test("minimum sufficient proof identifies and resolves a Trust Gap", () => {
  const open = evaluateAdaptiveVerification(consequentialInput());
  assert.equal(open.trustGap.status, "OPEN");
  assert.equal(open.minimumSufficientProof.challenges.length, open.missingEvidence.length);
  assert.equal(open.minimumStepUp, open.missingEvidence[0]);
  const resolved = evaluateAdaptiveVerification({ ...consequentialInput(), evidence: satisfyingEvidence(open), previousVerification: open });
  assert.equal(resolved.verificationStatus, "SATISFIED");
  assert.equal(resolved.trustGap.status, "RESOLVED");
  assert.ok(resolved.trustMemoryEvents.some((item) => item.eventType === "TRUST_GAP_RESOLVED"));
});

test("coverage prioritizes unverified consequential authority instead of generic inventory", () => {
  const low = evaluateAdaptiveVerification(verificationInput());
  const high = evaluateAdaptiveVerification(consequentialInput({ entity: { id: "agent:priority", type: "AI_AGENT" } }));
  const coverage = createAdaptiveVerificationCoverage({ enterpriseId, generatedAt: "2026-08-24T09:15:00.000Z", requirements: [low, high] });
  assert.equal(coverage.knownEntities, 2);
  assert.equal(coverage.unverifiedConsequentialAuthority, 1);
  assert.equal(coverage.highestPriority[0].entityId, "agent:priority");
  assert.equal(coverage.genericAssetInventory, false);
});

test("counterfactual verification responds to authority, reach, pressure, and budget restoration", () => {
  const { baseline, projected, controlled } = demo;
  assert.equal(baseline.adaptiveVerification.requiredVerificationDepth, "OBSERVE");
  assert.equal(projected.projectedTwin.adaptiveVerification.requiredVerificationDepth, "GATE");
  assert.equal(projected.projectedTwin.adaptiveVerification.trustGap.status, "OPEN");
  assert.ok(projected.projectedTwin.adaptiveVerification.missingEvidence.includes("VERIFY_RUNTIME"));
  assert.ok(projected.projectedTwin.adaptiveVerification.missingEvidence.includes("VERIFY_DESTINATION"));
  assert.equal(controlled.projectedTwin.adaptiveVerification.verificationStatus, "SATISFIED");
  assert.equal(controlled.projectedTwin.adaptiveVerification.trustGap.status, "RESOLVED");
  assert.ok(controlled.projectedTwin.trustPressure.value < projected.projectedTwin.trustPressure.value);
  assert.ok(controlled.projectedTwin.trustBudget.remaining > projected.projectedTwin.trustBudget.remaining);
  assert.equal(projected.executionPerformed, false);
});

test("verified never means authorized and verification cannot replace the canonical decision", () => {
  const requirement = evaluateAdaptiveVerification(consequentialInput());
  const satisfied = evaluateAdaptiveVerification({ ...consequentialInput({ authorityScopeValid: false }), evidence: satisfyingEvidence(requirement) });
  assert.equal(satisfied.verificationStatus, "SATISFIED");
  assert.equal(satisfied.canonicalAuthorityBoundary.verifiedDoesNotMeanAuthorized, true);
  assert.equal(satisfied.canonicalAuthorityBoundary.verificationCanGrantAuthority, false);
  assert.equal(satisfied.canonicalAuthorityBoundary.verificationCanAllow, false);
  assert.equal(demo.canonicalRuntimeRequest.decision, "DENY");
  assert.equal(demo.canonicalRuntimeRequest.reasonCode, "AUTHORITY_SCOPE_INVALID");
});

test("provider choice is neutral while Cyber Sentinels defines the proof requirement", () => {
  const open = evaluateAdaptiveVerification(consequentialInput());
  const first = satisfyingEvidence(open);
  const second = first.map((item) => ({ ...item, providerKey: `alternate:${item.challenge.toLowerCase()}` }));
  const left = evaluateAdaptiveVerification({ ...consequentialInput(), evidence: first });
  const right = evaluateAdaptiveVerification({ ...consequentialInput(), evidence: second });
  assert.equal(left.verificationStatus, right.verificationStatus);
  assert.deepEqual(left.requiredEvidence.map((item) => item.challenge), right.requiredEvidence.map((item) => item.challenge));
  assert.equal(left.minimumSufficientProof.providerCollectionBoundary, "CYBER_SENTINELS_DEFINES_WHAT_PROVIDERS_MAY_DEFINE_HOW");
});

test("tenant and previous-verification scope mismatches fail closed", () => {
  const previous = evaluateAdaptiveVerification(consequentialInput());
  assert.throws(() => evaluateAdaptiveVerification({ ...consequentialInput(), enterpriseId: otherEnterpriseId }), /TENANT_SCOPE_MISMATCH/);
  assert.throws(() => evaluateAdaptiveVerification({ ...consequentialInput(), previousVerification: { ...previous, entityId: "agent:other" } }), /PREVIOUS_SCOPE_MISMATCH/);
  assert.throws(() => createAdaptiveVerificationCoverage({ enterpriseId: otherEnterpriseId, generatedAt: "2026-08-24T09:15:00.000Z", requirements: [previous] }), /COVERAGE_TENANT_SCOPE_MISMATCH/);
});

test("Evidence Graph, Replay, Trust Memory, receipt, API, and UI reuse existing architecture", async () => {
  const result = evaluateAdaptiveVerification(consequentialInput());
  assert.ok(result.graphProjection.nodes.some((item) => item.nodeType === "VERIFICATION_REQUIREMENT"));
  assert.ok(result.graphProjection.nodes.some((item) => item.nodeType === "TRUST_GAP"));
  assert.ok(result.replayEvents.some((item) => item.eventType === "ADAPTIVE_VERIFICATION_EVALUATED"));
  assert.ok(result.trustMemoryEvents.some((item) => item.eventType === "VERIFICATION_GATE_REQUIRED"));

  const [canonical, server, coverageRoute, ui, migration] = await Promise.all([
    readFile(new URL("../src/lib/trust-transaction/canonical.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/trust-fabric/trust-twin-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/trust/verification/coverage/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/trust-prediction/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260824184543_trust_forecast_operational_intelligence.sql", import.meta.url), "utf8"),
  ]);
  assert.match(canonical, /adaptiveVerification: trustTwin\.adaptiveVerification/);
  assert.match(server, /canonical_trust_transactions/);
  assert.match(coverageRoute, /persistencePerformed: false/);
  assert.match(ui, /VERIFIED ≠ AUTHORIZED/);
  assert.match(migration, /decision_time_snapshot/);
  assert.equal(migration.includes("adaptive_verification"), false);
  assert.deepEqual(VERIFICATION_DEPTHS, ["OBSERVE", "VERIFY", "STEP_UP", "GATE"]);
  assert.ok(VERIFICATION_CHALLENGES.includes("VERIFY_MACHINE_STATE"));
});
