import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluateAuthorityGraph } from "../lib/core/authority-graph.ts";
import { normalizeEntityIdentity } from "../lib/core/entity-identity.ts";
import {
  buildRc2LivingTrustDemo,
  createGovernedControlAction,
  createTrustMemoryTombstone,
  createTrustMemoryTombstoneEvent,
  deriveLivingTrustProfile,
  evaluateContinuousAuthorization,
  mapProfileToComplianceEvidence,
  queryLivingTrustProfiles,
} from "../lib/trust/living-trust-profile.ts";
import { explainTrustChange } from "../lib/trust-memory/trust-evolution.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const demo = buildRc2LivingTrustDemo();

test("Living Trust Profile is contextual, multidimensional and derived without a universal score", () => {
  const profile = demo.profile;
  assert.equal(profile.profileKey.tenantId, "tenant:rc2-demo");
  assert.equal(profile.profileKey.workflowId, "workflow:regulated-payment");
  assert.equal(profile.profileKey.purpose, "regulated_payment_review");
  assert.equal(profile.universalTransferable, false);
  assert.equal(profile.calculatedPersistence, "derived_not_persisted");
  assert.deepEqual(Object.keys(profile.dimensionalAssurance).sort(), ["authority_assurance", "behavioural_consistency", "credential_assurance", "decision_confidence", "evidence_quality", "governance_status", "identity_assurance", "runtime_integrity"]);
  for (const item of Object.values(profile.dimensionalAssurance)) {
    for (const field of ["state", "reason", "sourceEvidence", "lastChanged", "expiry", "limitation", "reviewerStatus"]) assert.ok(field in item, `${item.name}:${field}`);
  }
  assert.equal("score" in profile, false);
  assert.doesNotMatch(Object.keys(profile).join(" "), /fraud|reputation|score/i);
  assert.doesNotMatch(profile.currentPosture, /fraud|reputation/i);
});

test("the same entity receives different outcomes in different workflow contexts", () => {
  const assessedAt = "2026-07-16T12:00:00.000Z";
  const deniedAuthority = evaluateAuthorityGraph({ tenantId: "tenant:rc2-demo", subjectId: "agent:treasury-review", workflowId: "workflow:privileged-infrastructure", action: "approve_payment", purpose: "regulated_payment_review", grants: demo.grants, evaluatedAt: assessedAt });
  const second = deriveLivingTrustProfile({
    key: { tenantId: "tenant:rc2-demo", entityId: "agent:treasury-review", entityType: "ai_agent", workflowId: "workflow:privileged-infrastructure", purpose: "regulated_payment_review", requestedAction: "approve_payment", policyVersion: "payment-policy:2.1", assessedAt },
    entity: normalizeEntityIdentity({ id: "agent:treasury-review", type: "ai_agent", tenant_id: "tenant:rc2-demo", verification_status: "verified", evidence_refs: ["evidence:agent-registry"] }),
    authority: deniedAuthority,
    minimumEvidence: 1,
  });
  assert.notEqual(demo.profile.currentPosture, second.currentPosture);
  assert.equal(second.currentPosture, "block");
  assert.notEqual(demo.profile.profileKey.workflowId, second.profileKey.workflowId);
});

test("authority attenuates actions, prohibitions and delegation depth", () => {
  const broadened = structuredClone(demo.grants);
  broadened[1].permittedActions.push("change_beneficiary");
  broadened[1].scope.push("change_beneficiary");
  broadened[1].prohibitedActions = [];
  const result = evaluateAuthorityGraph({ tenantId: "tenant:rc2-demo", subjectId: "agent:treasury-review", workflowId: "workflow:regulated-payment", action: "approve_payment", purpose: "regulated_payment_review", resource: "invoice:approved-vendors", approvals: ["finance_owner"], policyVersion: "payment-policy:2.1", grants: broadened, evaluatedAt: "2026-07-16T12:00:00.000Z" });
  assert.equal(result.decision, "DENY");
  assert.ok(result.checks.some((check) => check.name === "authority attenuation" && !check.passed));

  const tooDeep = structuredClone(demo.grants);
  tooDeep.push({ ...structuredClone(tooDeep[1]), id: "authority:agent-subagent", grantorId: "agent:treasury-review", grantorType: "ai_agent", granteeId: "agent:subagent", granteeType: "ai_agent", parentGrantId: "authority:human-agent" });
  assert.equal(evaluateAuthorityGraph({ tenantId: "tenant:rc2-demo", subjectId: "agent:subagent", workflowId: "workflow:regulated-payment", action: "approve_payment", purpose: "regulated_payment_review", resource: "invoice:approved-vendors", approvals: ["finance_owner"], policyVersion: "payment-policy:2.1", grants: tooDeep, evaluatedAt: "2026-07-16T12:00:00.000Z" }).decision, "DENY");
});

test("agent-to-agent and agent-to-machine delegation work only inside inherited authority", () => {
  const grants = structuredClone(demo.grants);
  grants[0].maxDelegationDepth = 3;
  grants[1].maxDelegationDepth = 2;
  grants.push({ ...structuredClone(grants[1]), id: "authority:agent-subagent", grantorId: "agent:treasury-review", grantorType: "ai_agent", granteeId: "agent:subagent", granteeType: "ai_agent", parentGrantId: "authority:human-agent", maxDelegationDepth: 1 });
  grants.push({ ...structuredClone(grants[1]), id: "authority:agent-machine", grantorId: "agent:subagent", grantorType: "ai_agent", granteeId: "machine:payment-api", granteeType: "machine_identity", parentGrantId: "authority:agent-subagent", maxDelegationDepth: 0 });
  const request = { tenantId: "tenant:rc2-demo", workflowId: "workflow:regulated-payment", action: "approve_payment", purpose: "regulated_payment_review", resource: "invoice:approved-vendors", approvals: ["finance_owner"], policyVersion: "payment-policy:2.1", grants, evaluatedAt: "2026-07-16T12:00:00.000Z" };
  assert.equal(evaluateAuthorityGraph({ ...request, subjectId: "agent:subagent" }).decision, "ALLOW");
  assert.equal(evaluateAuthorityGraph({ ...request, subjectId: "machine:payment-api" }).decision, "ALLOW");
});

test("expired and revoked delegation fail closed", () => {
  const expired = structuredClone(demo.grants);
  expired[1].expiresAt = "2026-07-16T10:00:00.000Z";
  const revoked = structuredClone(demo.grants);
  revoked[1].revokedAt = "2026-07-16T11:00:00.000Z";
  const request = { tenantId: "tenant:rc2-demo", subjectId: "agent:treasury-review", workflowId: "workflow:regulated-payment", action: "approve_payment", purpose: "regulated_payment_review", resource: "invoice:approved-vendors", approvals: ["finance_owner"], policyVersion: "payment-policy:2.1", evaluatedAt: "2026-07-16T12:00:00.000Z" };
  assert.equal(evaluateAuthorityGraph({ ...request, grants: expired }).decision, "DENY");
  assert.equal(evaluateAuthorityGraph({ ...request, grants: revoked }).decision, "DENY");
});

test("runtime changes trigger reauthorization, threshold approval and action-scope blocking", () => {
  assert.equal(demo.authorization.outcome, "require_approval");
  for (const trigger of ["requested_action_changed", "workflow_stage_changed", "runtime_risk_changed", "transaction_threshold_crossed"]) assert.ok(demo.authorization.triggers.includes(trigger));
  assert.equal(demo.authorization.enforcementPath, "existing_trust_enforcement");

  const outOfScope = evaluateAuthorityGraph({ tenantId: "tenant:rc2-demo", subjectId: "agent:treasury-review", workflowId: "workflow:regulated-payment", action: "change_beneficiary", purpose: "regulated_payment_review", resource: "invoice:approved-vendors", approvals: ["finance_owner"], policyVersion: "payment-policy:2.1", grants: demo.grants, evaluatedAt: "2026-07-16T12:00:00.000Z" });
  const blocked = evaluateContinuousAuthorization({ previous: null, current: { requestedAction: "change_beneficiary", tool: "payments_api", resource: "invoice:approved-vendors", workflowStage: "approval", delegationChainVersion: "delegation:1", runtimeRisk: "low", policyVersion: "payment-policy:2.1" }, profile: demo.profile, authority: outOfScope, evaluatedAt: "2026-07-16T12:00:00.000Z" });
  assert.equal(blocked.outcome, "block");
});

test("provider evidence expiry requires step-up", () => {
  const result = evaluateContinuousAuthorization({ previous: null, current: { requestedAction: "approve_payment", tool: "payments_api", resource: "invoice:approved-vendors", workflowStage: "approval", delegationChainVersion: "delegation:1", runtimeRisk: "low", providerEvidenceExpiresAt: "2026-07-16T11:00:00.000Z", policyVersion: "payment-policy:2.1" }, profile: demo.profile, authority: demo.profile.activeAuthority.reference ? evaluateAuthorityGraph({ tenantId: "tenant:rc2-demo", subjectId: "agent:treasury-review", workflowId: "workflow:regulated-payment", action: "approve_payment", purpose: "regulated_payment_review", resource: "invoice:approved-vendors", approvals: ["finance_owner"], policyVersion: "payment-policy:2.1", grants: demo.grants, evaluatedAt: "2026-07-16T12:00:00.000Z" }) : null, evaluatedAt: "2026-07-16T12:00:00.000Z" });
  assert.equal(result.outcome, "step_up");
});

test("trust decay, recovery and all dimensional changes remain explainable", () => {
  const decayed = explainTrustChange({ trustStateBefore: "established", trustStateAfter: "established", confidenceBefore: 0.8, confidenceAfter: 0.6, evidenceRefs: ["evidence:freshness-expired"], reason: "Provider evidence freshness window expired." });
  const recovered = explainTrustChange({ trustStateBefore: "review_required", trustStateAfter: "recovered", confidenceBefore: 0.5, confidenceAfter: 0.72, governanceRefs: ["governance:review"], reviewedOutcomeRef: "review:approved", reason: "Accountable review restored constrained authority." });
  assert.equal(decayed.classification, "decayed");
  assert.equal(recovered.classification, "recovered");
  assert.ok(decayed.drivers.length && recovered.drivers.length);
});

test("governed kill switch proof never claims external execution without a receipt", () => {
  assert.equal(demo.control.executionState, "recorded");
  assert.match(demo.control.limitation, /not claimed/i);
  const confirmed = createGovernedControlAction({ action: "terminate_session", actor: "human:owner", reason: "Approved containment", scope: ["session:1"], affectedEntity: "agent:1", affectedWorkflow: "workflow:1", policy: "policy:1", evidence: ["evidence:risk"], replayReference: "replay:1", recoveryRequirements: ["review"], externalExecutionReceipt: "runtime-receipt:1" });
  assert.equal(confirmed.executionState, "externally_confirmed");
});

test("retention tombstones preserve audit continuity and legal hold blocks removal", () => {
  const policy = { tenantId: "tenant:a", retentionDays: 30, evidenceExpiryDays: 7, subjectAccessRequestState: "none", deletionRequestState: "approved", legalHold: false, redactionRequired: true, providerReferenceDeletion: "requested", approvedBy: "privacy:owner", policyVersion: "retention:1" };
  const tombstone = createTrustMemoryTombstone({ policy, sourceEventReference: "memory:event:1", action: "redacted", actor: "privacy:owner", reason: "Approved minimization request", createdAt: "2026-07-16T12:00:00.000Z" });
  const event = createTrustMemoryTombstoneEvent({ tombstone, workflowId: "workflow:1", actorId: "human:1", actorType: "human", currentState: "review_required" });
  assert.equal(tombstone.rawValueRetained, false);
  assert.equal(tombstone.auditPreserved, true);
  assert.equal(event.event_kind, "retention_tombstone");
  assert.throws(() => createTrustMemoryTombstone({ policy: { ...policy, legalHold: true }, sourceEventReference: "memory:event:1", action: "redacted", actor: "privacy:owner", reason: "Request" }), /legal hold/i);
});

test("tenant isolation and observed-evidence queries fail safely", () => {
  assert.throws(() => deriveLivingTrustProfile({ key: { ...demo.profile.profileKey, tenantId: "tenant:other" }, entity: normalizeEntityIdentity({ id: demo.profile.entityId, type: "ai_agent", tenant_id: "tenant:rc2-demo" }), authority: evaluateAuthorityGraph({ tenantId: "tenant:other", subjectId: demo.profile.entityId, workflowId: demo.profile.workflowContext.workflowId, action: demo.profile.workflowContext.requestedAction, purpose: demo.profile.purpose, grants: [] }) }), /tenant-scoped entity/i);
  const queries = queryLivingTrustProfiles([demo.profile]);
  assert.match(queries.boundary, /do not forecast/i);
  assert.equal(Array.isArray(queries.entitiesWithIncompleteEvidence()), true);
});

test("compliance mappings expose evidence, gaps, owner, date and certification limitation", () => {
  const mappings = mapProfileToComplianceEvidence(demo.profile, "2026-07-16");
  assert.deepEqual(mappings.map((item) => item.framework), ["EU AI Act", "NIST AI RMF", "ISO/IEC 42001", "ISO 27001", "DORA", "GDPR", "Customer policies"]);
  for (const item of mappings) {
    assert.ok(Array.isArray(item.supportingEvidence));
    assert.ok(Array.isArray(item.missingEvidence));
    assert.ok(item.responsibleOwner && item.reviewDate);
    assert.match(item.limitation, /does not claim certification/i);
  }
});

test("RC2 reuses protected routes, append-only memory and complete documentation", async () => {
  const [workspace, demoPage, migration, rc2Migration, packageJson] = await Promise.all([read("app/workspace/[id]/page.tsx"), read("app/demo/trust-execution-flow/page.tsx"), read("supabase/migrations/202607160001_release_1_rc1_provider_evidence_gate.sql"), read("supabase/migrations/202607160002_release_1_rc2_living_trust_privacy.sql"), read("package.json")]);
  assert.match(workspace, /LivingTrustProfileView/);
  assert.match(demoPage, /buildRc2LivingTrustDemo/);
  assert.match(migration, /trust_memory_append_only/);
  assert.match(rc2Migration, /tenant scoped read governance_policies/);
  assert.match(rc2Migration, /record_trust_memory_tombstone/);
  assert.match(rc2Migration, /grant execute.*service_role/i);
  assert.doesNotMatch(packageJson, /living-trust.*page|trust-dna.*page/i);
  const docs = ["docs/RC2_LIVING_TRUST_IMPLEMENTATION_AUDIT.md", "docs/LIVING_TRUST_PROFILE.md", "docs/TRUST_DNA_PRODUCT_CONCEPT.md", "docs/CONTINUOUS_AUTHORIZATION.md", "docs/AUTHORIZATION_PROPAGATION.md", "docs/TRUST_MEMORY_RETENTION_AND_PRIVACY.md", "docs/COMPETITIVE_POSITIONING_TRUSTFLOW_AND_GRC.md", "docs/demos/RC2_LIVING_TRUST_AND_RUNTIME_AUTHORIZATION.md", "docs/SPRINT_13_2_ACCEPTANCE.md", "docs/releases/RELEASE_1_0_RC2.md"];
  const contents = await Promise.all(docs.map(read));
  assert.equal(contents.length, 10);
  assert.match(contents[0], /Implementation Audit/);
  assert.match(contents[7], /Test Mode/);
});
