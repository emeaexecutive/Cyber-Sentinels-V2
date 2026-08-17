import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateCapabilityGovernance,
  evaluateCapabilityReauthorization,
} from "../lib/operational-entities/capability-governance.ts";
import { createOperationalEntity } from "../lib/operational-entities/operational-entity.ts";

const at = "2026-08-14T12:00:00.000Z";
const enterpriseId = "enterprise:capability-test";
const entityId = "entity:model-agent";

function entity(overrides = {}) {
  return createOperationalEntity({
    entityId,
    enterpriseId,
    entityType: "ai_agent",
    displayReference: "Model-backed Agent",
    canonicalTrustObjectId: "trust:model-agent",
    lifecycleState: "active",
    accountableOwnerId: "owner:alice",
    organizationReference: "org:test",
    providerReferences: [],
    identityProfileReference: "profile:model-agent",
    currentAuthorityReferences: ["authority:model-agent"],
    environmentReferences: ["environment:approved"],
    workflowReferences: ["workflow:code-review"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "high",
    canonicalDigest: "a".repeat(64),
    ...overrides,
  });
}

function assessment(overrides = {}) {
  return {
    assessmentId: "assessment:enterprise:code:v1",
    enterpriseId,
    operationalEntityId: entityId,
    assessmentProvider: "Enterprise Evaluator",
    sourcePartyId: "party:enterprise-evaluator",
    assessmentType: "capability_evaluation",
    capabilityClass: "code_assistance",
    capabilityThreshold: "approved-medium",
    capabilityDimensions: { autonomy: 2, toolUse: true },
    evaluationReference: "evaluation:code-suite:v4",
    environmentReference: "environment:approved",
    assessedModelId: "model:one",
    assessedModelVersion: "1.0.0",
    assessedModelHash: "b".repeat(64),
    assessmentTimestamp: "2026-08-13T12:00:00.000Z",
    validFrom: "2026-08-13T12:00:00.000Z",
    validUntil: "2026-08-20T12:00:00.000Z",
    evidenceDigest: "c".repeat(64),
    confidence: 0.92,
    attribution: "Enterprise evaluation result; not a Cyber Sentinels certification.",
    ...overrides,
  };
}

function projection(overrides = {}) {
  return {
    enterpriseId,
    operationalEntityId: entityId,
    modelId: "model:one",
    modelVersion: "1.0.0",
    modelHash: "b".repeat(64),
    fineTuneReference: null,
    deploymentOrigin: "customer-controlled artifact store",
    hostingOperator: "operator:customer",
    modelFamily: "family:one",
    openClosedClassification: "open_weight",
    capabilityAssessments: [assessment()],
    applicableOversightRegimes: ["enterprise:high-impact-ai"],
    safeguardsActive: ["sandbox", "human-approval"],
    environmentAttestation: {
      attestationReference: "environment:approved",
      enterpriseId,
      environment: "staging",
      runtimeReference: "runtime:container:v1",
      hostingOperator: "operator:customer",
      toolSet: ["repository:read"],
      observedAt: "2026-08-14T10:00:00.000Z",
      expiresAt: "2026-08-15T12:00:00.000Z",
      evidenceProvider: "runtime:attestor",
      sourcePartyId: "party:runtime-operator",
      evidenceDigest: "d".repeat(64),
    },
    enterpriseRiskClassification: "high-impact",
    evidenceTimestamp: "2026-08-14T10:00:00.000Z",
    evidenceExpiry: "2026-08-15T12:00:00.000Z",
    continuityReference: "continuity:model-agent:v1",
    permissionScope: ["repository:read"],
    ...overrides,
  };
}

function policy(overrides = {}) {
  return {
    policyReference: "policy:model-governance:v1",
    requestedAction: "READ",
    requiredCapabilityClass: "code_assistance",
    allowedCapabilityClasses: ["code_assistance"],
    requiredSafeguards: ["sandbox"],
    requireModelHash: true,
    requireEnvironmentAttestation: true,
    requireHumanReviewForEvidenceConflict: true,
    denyWhenSafeguardMissing: false,
    ...overrides,
  };
}

test("open-weight self-hosted capability passes when its deployed evidence is current", () => {
  const result = evaluateCapabilityGovernance({ entity: entity(), current: projection(), policy: policy(), evaluatedAt: at });
  assert.equal(result.status, "PASS");
  assert.equal(result.decision, "ALLOW");
  assert.ok(!result.reasonCodes.some((reason) => /OPEN|SELF_HOSTED|PROVIDER_REPUTATION/.test(reason)));
});

test("recognized frontier provider cannot substitute reputation for an assessment", () => {
  const result = evaluateCapabilityGovernance({
    entity: entity(),
    current: projection({ openClosedClassification: "hosted_api", deploymentOrigin: "recognized-frontier-provider", capabilityAssessments: [] }),
    policy: policy(),
    evaluatedAt: at,
  });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("CAPABILITY_ASSESSMENT_MISSING"));
});

test("model hash mismatch requires review without rewriting the attributed assessment", () => {
  const current = projection({ modelHash: "e".repeat(64) });
  const originalAssessment = structuredClone(current.capabilityAssessments[0]);
  const result = evaluateCapabilityGovernance({ entity: entity(), current, policy: policy(), evaluatedAt: at });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("MODEL_HASH_CHANGED"));
  assert.deepEqual(current.capabilityAssessments[0], originalAssessment);
});

test("fine-tune change is a material reauthorization trigger", () => {
  const previous = projection();
  const current = projection({ fineTuneReference: "fine-tune:customer:v2" });
  const result = evaluateCapabilityReauthorization({ previous, current, policy: policy(), evaluatedAt: at });
  assert.equal(result.disposition, "REAUTHORIZATION_REQUIRED");
  assert.ok(result.triggers.includes("FINE_TUNE_CHANGED"));
});

test("expired assessment cannot allow", () => {
  const result = evaluateCapabilityGovernance({
    entity: entity(),
    current: projection({ capabilityAssessments: [assessment({ validUntil: "2026-08-14T11:59:59.000Z" })] }),
    policy: policy(),
    evaluatedAt: at,
  });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("CAPABILITY_ASSESSMENT_EXPIRED"));
});

test("materially conflicting attributed capability evaluations remain preserved", () => {
  const assessments = [
    assessment({ assessmentId: "assessment:a", assessmentProvider: "Evaluator A", sourcePartyId: "party:a" }),
    assessment({ assessmentId: "assessment:b", assessmentProvider: "Evaluator B", sourcePartyId: "party:b", capabilityThreshold: "restricted-low", capabilityDimensions: { autonomy: 4, toolUse: true } }),
  ];
  const result = evaluateCapabilityGovernance({ entity: entity(), current: projection({ capabilityAssessments: assessments }), policy: policy(), evaluatedAt: at });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("CAPABILITY_EVIDENCE_CONFLICT"));
  assert.deepEqual(result.evidenceReferences.filter((reference) => reference.startsWith("assessment:")), ["assessment:a", "assessment:b"]);
});

test("environment mismatch and missing safeguards trigger review", () => {
  const result = evaluateCapabilityGovernance({
    entity: entity(),
    current: projection({
      safeguardsActive: [],
      environmentAttestation: { ...projection().environmentAttestation, attestationReference: "environment:changed" },
    }),
    policy: policy(),
    evaluatedAt: at,
  });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("ENVIRONMENT_CHANGED"));
  assert.ok(result.reasonCodes.includes("SAFEGUARD_REQUIRED"));
});

test("stale governance evidence cannot allow", () => {
  const result = evaluateCapabilityGovernance({
    entity: entity(),
    current: projection({ evidenceExpiry: "2026-08-14T11:00:00.000Z" }),
    policy: policy(),
    evaluatedAt: at,
  });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("CAPABILITY_ASSESSMENT_EXPIRED"));
});

test("capability threshold change below the allowed policy boundary is review, not automatic deny", () => {
  const previous = projection({ capabilityAssessments: [assessment({ capabilityThreshold: "approved-low" })] });
  const current = projection({ capabilityAssessments: [assessment({ capabilityThreshold: "approved-medium" })] });
  const result = evaluateCapabilityGovernance({ entity: entity(), current, previous, policy: policy(), evaluatedAt: at });
  assert.equal(result.decision, "REVIEW");
  assert.equal(result.authorityImpact, "REVIEW_REQUIRED");
  assert.ok(result.reasonCodes.includes("CAPABILITY_THRESHOLD_CHANGED"));
});

test("cross-tenant capability evidence is rejected", () => {
  const result = evaluateCapabilityGovernance({ entity: entity(), current: projection({ enterpriseId: "enterprise:other" }), policy: policy(), evaluatedAt: at });
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("CROSS_TENANT_CAPABILITY_EVIDENCE_REJECTED"));
});

test("cross-tenant assessment injection is denied without leaking its reference into the snapshot", () => {
  const injected = assessment({ assessmentId: "assessment:other-tenant", enterpriseId: "enterprise:other" });
  const result = evaluateCapabilityGovernance({
    entity: entity(),
    current: projection({ capabilityAssessments: [assessment(), injected] }),
    policy: policy(),
    evaluatedAt: at,
  });
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("CROSS_TENANT_CAPABILITY_EVIDENCE_REJECTED"));
  assert.equal(result.snapshot.evidenceReferences.includes(injected.assessmentId), false);
});

test("malformed assessment timestamps fail freshness and attribution checks closed", () => {
  const result = evaluateCapabilityGovernance({
    entity: entity(),
    current: projection({ capabilityAssessments: [assessment({ validUntil: "not-a-timestamp" })] }),
    policy: policy(),
    evaluatedAt: at,
  });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("MODEL_PROVENANCE_UNVERIFIED"));
  assert.ok(result.reasonCodes.includes("CAPABILITY_ASSESSMENT_EXPIRED"));
});

test("decision-time capability snapshot is immutable and contains no provider reputation score", () => {
  const result = evaluateCapabilityGovernance({ entity: entity(), current: projection(), policy: policy(), evaluatedAt: at });
  assert.ok(Object.isFrozen(result.snapshot));
  assert.equal(result.snapshot.model.openClosedClassification, "open_weight");
  assert.equal("providerReputation" in result.snapshot, false);
  assert.throws(() => { result.snapshot.status = "FAIL"; }, TypeError);
});
