import assert from "node:assert/strict";
import test from "node:test";

import {
  appendHumanArbitrationOutcome,
  buildInterAgentConflictReplay,
  evaluateInterAgentAuthorityConflict,
} from "../lib/operational-entities/inter-agent-authority-conflict.ts";
import { appendMaterialTrustMemoryEvent } from "../lib/operational-entities/federated-evidence.ts";
import { createOperationalEntity } from "../lib/operational-entities/operational-entity.ts";

const at = "2026-08-14T12:00:00.000Z";
const enterpriseId = "enterprise:agent-conflict";

function entity(id, overrides = {}) {
  return createOperationalEntity({
    entityId: id,
    enterpriseId,
    entityType: "ai_agent",
    displayReference: id,
    canonicalTrustObjectId: `trust:${id}`,
    lifecycleState: "active",
    accountableOwnerId: `owner:${id}`,
    organizationReference: "org:test",
    providerReferences: [],
    identityProfileReference: `profile:${id}`,
    currentAuthorityReferences: [`authority:${id}`],
    environmentReferences: ["production"],
    workflowReferences: ["workflow:configuration"],
    currentTrustState: "verified",
    currentEvidenceState: "current",
    currentConsequenceClassification: "high",
    canonicalDigest: id === "beta" ? "a".repeat(64) : "b".repeat(64),
    ...overrides,
  });
}

function authority(id, overrides = {}) {
  const resource = overrides.resource ?? "repository:a";
  const effect = overrides.effect ?? "read";
  const actionType = overrides.actionType ?? (effect === "read" ? "READ" : "WRITE");
  const target = overrides.target ?? resource;
  return {
    enterpriseId,
    operationalEntityId: id,
    authorityReference: `authority:${id}`,
    authorityScope: {
      permittedActions: overrides.permittedActions ?? [actionType],
      permittedTools: overrides.permittedTools ?? ["repository-tool"],
      permittedTargets: overrides.permittedTargets ?? [target],
      environments: ["production"],
      dataBoundary: "RESTRICTED",
      financialLimit: null,
      executionLimit: 10,
      notBefore: "2026-08-14T00:00:00.000Z",
      expiresAt: "2026-08-15T00:00:00.000Z",
    },
    objective: {
      objectiveReference: `objective:${id}`,
      purpose: overrides.purpose ?? `${effect} ${resource}`,
      effect,
      resource,
    },
    requestedAction: {
      type: actionType,
      tool: "repository-tool",
      target,
      resource,
      environment: "production",
      dataBoundary: "RESTRICTED",
      consequenceClassification: overrides.consequence ?? "high",
    },
    validFrom: overrides.validFrom ?? "2026-08-14T00:00:00.000Z",
    expiresAt: overrides.expiresAt ?? "2026-08-15T00:00:00.000Z",
    revokedAt: overrides.revokedAt ?? null,
  };
}

function evidence(source, target, overrides = {}) {
  return {
    relationshipEvidenceId: overrides.relationshipEvidenceId ?? `relationship:${source}:${target}`,
    enterpriseId,
    sourceAgent: source,
    targetAgent: target,
    sharedWorkflow: "workflow:configuration",
    sourceDelegatedObjective: `objective:${source}`,
    targetDelegatedObjective: `objective:${target}`,
    sourceAuthorityReference: `authority:${source}`,
    targetAuthorityReference: `authority:${target}`,
    authorityIntersection: [],
    sharedResources: overrides.sharedResources ?? [],
    sharedCredentialsOrTools: overrides.sharedCredentialsOrTools ?? [],
    interactionType: overrides.interactionType ?? "observed_action_pair",
    relationshipType: overrides.relationshipType ?? "cooperation",
    observedConditions: overrides.observedConditions ?? [],
    evidenceSource: "runtime-observation",
    evidenceProvider: "enterprise-runtime",
    sourcePartyId: overrides.sourcePartyId ?? "party:runtime-operator",
    observedAt: at,
    evidenceDigest: "c".repeat(64),
    independentlyObserved: overrides.independentlyObserved ?? false,
    ...overrides,
  };
}

function policy(overrides = {}) {
  return {
    policyReference: "policy:agent-conflict:v1",
    highImpactThreshold: "high",
    denyConditions: [],
    requireHumanArbitrationForHighImpact: true,
    ...overrides,
  };
}

function evaluate(sourceAuthority, targetAuthority, relationshipEvidence = [evidence("beta", "gamma")], overrides = {}) {
  return evaluateInterAgentAuthorityConflict({
    sourceEntity: entity("beta"),
    targetEntity: entity("gamma"),
    sourceAuthority,
    targetAuthority,
    relationshipEvidence,
    policy: policy(),
    evaluatedAt: at,
    ...overrides,
  });
}

test("different read resources have no authority conflict", () => {
  const result = evaluate(authority("beta", { resource: "repository:a" }), authority("gamma", { resource: "repository:b" }), [evidence("beta", "gamma")]);
  assert.equal(result.conflictState, "NO_CONFLICT");
  assert.equal(result.decision, "ALLOW");
});

test("compatible reads of one shared resource do not create a false conflict", () => {
  const result = evaluate(
    authority("beta", { resource: "repository:a" }),
    authority("gamma", { resource: "repository:a" }),
    [evidence("beta", "gamma", { sharedResources: ["repository:a"], sharedCredentialsOrTools: ["repository-tool"] })],
  );
  assert.equal(result.conflictState, "NO_CONFLICT");
  assert.equal(result.decision, "ALLOW");
  assert.ok(result.reasonCodes.includes("NO_INTER_AGENT_CONFLICT"));
});

test("incompatible mutations on one high-consequence resource require arbitration", () => {
  const result = evaluate(
    authority("beta", { resource: "production:configuration", effect: "preserve", actionType: "WRITE" }),
    authority("gamma", { resource: "production:configuration", effect: "replace", actionType: "WRITE" }),
    [evidence("beta", "gamma", { sharedResources: ["production:configuration"], relationshipType: "conflict" })],
  );
  assert.equal(result.conflictState, "INTER_AGENT_CONFLICT");
  assert.equal(result.decision, "REVIEW");
  assert.equal(result.policyResponse, "REQUIRE_HUMAN_ARBITRATION");
  assert.ok(result.reasonCodes.includes("INCOMPATIBLE_OBJECTIVES"));
  assert.ok(result.reasonCodes.includes("COMPETING_RESOURCE_MUTATION"));
  assert.ok(result.reasonCodes.includes("HIGH_CONSEQUENCE_CONFLICT_REQUIRES_REVIEW"));
});

test("ordinary out-of-scope action denies without false inter-agent conflict", () => {
  const beta = authority("beta", { resource: "repository:a", actionType: "WRITE", permittedActions: ["READ"] });
  const result = evaluate(beta, authority("gamma", { resource: "repository:b" }));
  assert.equal(result.conflictState, "NO_CONFLICT");
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("ACTION_OUT_OF_DELEGATED_SCOPE"));
  assert.ok(!result.reasonCodes.includes("INTER_AGENT_CONFLICT"));
});

test("parent or delegated revocation remains authority invalidation, not conflict", () => {
  const result = evaluate(authority("beta", { revokedAt: "2026-08-14T11:00:00.000Z" }), authority("gamma", { resource: "repository:b" }));
  assert.equal(result.conflictState, "NO_CONFLICT");
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("AUTHORITY_REVOKED"));
  assert.ok(!result.reasonCodes.includes("INTER_AGENT_CONFLICT"));
});

for (const condition of [
  "CREDENTIAL_INTERFERENCE",
  "TOOL_INTERFERENCE",
  "REPEATED_AGENT_DENIAL_CYCLE",
  "CONFLICTING_DESTINATION_ACTIONS",
  "SHARED_RESOURCE_RACE",
]) {
  test(`attributed ${condition} evidence is preserved as a conflict condition`, () => {
    const result = evaluate(
      authority("beta", { resource: "shared:system" }),
      authority("gamma", { resource: "shared:system" }),
      [evidence("beta", "gamma", { observedConditions: [condition], relationshipType: "conflict", sharedResources: ["shared:system"] })],
    );
    assert.equal(result.conflictState, "INTER_AGENT_CONFLICT");
    assert.ok(result.reasonCodes.includes(condition));
  });
}

test("peer disable, peer-work modification, and impersonation attempts are first-class neutral evidence conditions", () => {
  const cases = [
    [authority("beta", { resource: "gamma", effect: "disable", actionType: "DISABLE", target: "gamma" }), "AGENT_DISABLES_PEER"],
    [authority("beta", { resource: "work:gamma", effect: "modify", actionType: "MODIFY_PEER_WORK" }), "AGENT_MODIFIES_PEER_WORK"],
    [authority("beta", { resource: "identity:gamma", effect: "modify", actionType: "IMPERSONATE_AGENT" }), "AGENT_IMPERSONATION_ATTEMPT"],
  ];
  for (const [source, reason] of cases) {
    const result = evaluate(source, authority("gamma", { resource: source.requestedAction.resource, effect: "preserve", actionType: source.requestedAction.type }));
    assert.equal(result.conflictState, "INTER_AGENT_CONFLICT");
    assert.ok(result.reasonCodes.includes(reason));
    assert.ok(!result.reasonCodes.some((code) => /MALICIOUS|FRAUD|SABOTAGE|COLLUSION/.test(code)));
  }
});

test("contradictory approvals are reviewed", () => {
  const result = evaluate(
    authority("beta", { resource: "change:42", effect: "approve", actionType: "APPROVE" }),
    authority("gamma", { resource: "change:42", effect: "deny_approval", actionType: "DENY_APPROVAL" }),
  );
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("CONTRADICTORY_APPROVAL_REQUESTS"));
});

test("policy can deny a named confirmed conflict condition", () => {
  const result = evaluate(
    authority("beta", { resource: "production:configuration", effect: "replace", actionType: "WRITE" }),
    authority("gamma", { resource: "production:configuration", effect: "delete", actionType: "WRITE" }),
    [evidence("beta", "gamma", { sharedResources: ["production:configuration"] })],
    { policy: policy({ denyConditions: ["COMPETING_RESOURCE_MUTATION"] }) },
  );
  assert.equal(result.decision, "DENY");
  assert.equal(result.policyResponse, "SUSPEND_ACTION");
});

test("cross-tenant relationship injection is denied", () => {
  const injected = evidence("beta", "gamma", { enterpriseId: "enterprise:other" });
  const result = evaluate(authority("beta"), authority("gamma"), [injected]);
  assert.equal(result.conflictState, "UNKNOWN");
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("CROSS_TENANT_RELATIONSHIP_REJECTED"));
  assert.equal(result.snapshot.evidenceReferences.includes(injected.relationshipEvidenceId), false);
});

test("malformed authority and relationship timestamps fail closed", () => {
  const malformed = evidence("beta", "gamma", { observedAt: "not-a-timestamp" });
  const result = evaluate(
    authority("beta", { expiresAt: "not-a-timestamp" }),
    authority("gamma"),
    [malformed],
  );
  assert.equal(result.conflictState, "UNKNOWN");
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("AUTHORITY_EVIDENCE_INVALID"));
  assert.ok(result.reasonCodes.includes("RELATIONSHIP_EVIDENCE_INVALID"));
  assert.deepEqual(result.snapshot.evidenceReferences, []);
});

test("human arbitration appends an outcome without rewriting conflict evidence", () => {
  const result = evaluate(
    authority("beta", { resource: "production:configuration", effect: "preserve", actionType: "WRITE" }),
    authority("gamma", { resource: "production:configuration", effect: "replace", actionType: "WRITE" }),
  );
  const originalDigest = result.snapshot.digest;
  const input = {
    arbitrationId: "arbitration:1",
    enterpriseId,
    conflictSnapshotDigest: originalDigest,
    sourceAgent: "beta",
    targetAgent: "gamma",
    reviewer: "reviewer:human",
    reviewDecision: "CONSTRAIN_AUTHORITY",
    reasonCodes: ["HUMAN_ARBITRATION_COMPLETED"],
    evidenceReferences: result.evidenceReferences,
    decidedAt: "2026-08-14T12:30:00.000Z",
  };
  const once = appendHumanArbitrationOutcome([], input);
  const twice = appendHumanArbitrationOutcome(once, input);
  assert.equal(twice.length, 1);
  assert.equal(result.snapshot.digest, originalDigest);
  assert.equal(twice[0].conflictSnapshotDigest, originalDigest);
});

test("decision snapshot is immutable", () => {
  const result = evaluate(authority("beta"), authority("gamma"));
  assert.ok(Object.isFrozen(result.snapshot));
  assert.throws(() => { result.snapshot.decision = "DENY"; }, TypeError);
});

test("Replay chronology orders authority, relationship, intersection, conflict, review, and non-execution", () => {
  const result = evaluate(
    authority("beta", { resource: "production:configuration", effect: "preserve", actionType: "WRITE" }),
    authority("gamma", { resource: "production:configuration", effect: "replace", actionType: "WRITE" }),
  );
  const replay = buildInterAgentConflictReplay({ evaluation: result, enterpriseId, occurredAt: at });
  assert.deepEqual(replay.map((item) => item.eventType), [
    "AGENT_A_AUTHORITY_ACTIVE",
    "AGENT_B_AUTHORITY_ACTIVE",
    "AGENT_RELATIONSHIP_OBSERVED",
    "AUTHORITY_INTERSECTION_EVALUATED",
    "INTER_AGENT_CONFLICT_DETECTED",
    "POLICY_REVIEW_REQUIRED",
    "ACTION_DENIED",
  ]);
  assert.ok(replay.every((item, index) => index === 0 || item.occurredAt > replay[index - 1].occurredAt));
});

test("Trust Memory material events deduplicate by event id", () => {
  const event = { eventId: "memory:conflict:1", eventType: "INTER_AGENT_CONFLICT_FIRST_OBSERVED", enterpriseId, occurredAt: at };
  const once = appendMaterialTrustMemoryEvent([], event);
  const twice = appendMaterialTrustMemoryEvent(once, event);
  assert.equal(once.length, 1);
  assert.equal(twice.length, 1);
});
