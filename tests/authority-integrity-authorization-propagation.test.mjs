import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AUTHORITY_INTEGRITY_INVARIANT_TEMPLATES,
  appendAuthorityIntegrityEvidence,
  evaluateAuthorityIntegrity,
  mapProviderNeutralIdentityAuthorityEvidence,
} from "../lib/trust-fabric/authority-integrity.ts";
import { hashCanonical } from "../src/lib/trust-core/hash.ts";

const tenantId = "10000000-0000-4000-8000-000000000001";
const now = "2026-08-24T12:00:00.000Z";

function parameterPolicy(overrides = {}) {
  return {
    parameterName: "tenant_id",
    parameterCategory: "tenant_boundary",
    allowedProvenanceClasses: ["authority_bound", "runtime_derived"],
    materiality: "critical",
    required: true,
    modelVisible: false,
    mutableAfterApproval: false,
    defaultState: "server_resolved",
    ...overrides,
  };
}

function toolSchema(policies = [parameterPolicy()], overrides = {}) {
  const parameterSchema = policies;
  const securityCriticalFields = policies.filter((item) => item.parameterCategory !== "ordinary_input").map((item) => item.parameterName);
  return {
    toolId: "tool:repository",
    toolVersion: "2.0.0",
    parameterSchema,
    securityCriticalFields,
    schemaDigest: hashCanonical({ parameterSchema, securityCriticalFields }),
    sourceProvider: "capability_registry",
    reviewedAt: now,
    ...overrides,
  };
}

function parameter(overrides = {}) {
  return {
    tool: "tool:repository",
    toolVersion: "2.0.0",
    parameterName: "tenant_id",
    parameterCategory: "tenant_boundary",
    parameterProvenance: "authority_bound",
    valueDigestOrMaskedValue: "sha256:" + "a".repeat(64),
    materiality: "critical",
    timestamp: now,
    evidenceProvider: "authority_service",
    policyReference: "policy:authority:7",
    configurationPinning: "identity_context_derived",
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    enterpriseId: tenantId,
    actionId: "action:001",
    actionTimestamp: now,
    principalReference: "human:alice",
    agentPassportReference: "agent-passport:alpha",
    authorityLineageReference: "authority:alpha:7",
    capabilityProvenanceReference: "capability:repo:2",
    toolSchema: toolSchema(),
    parameters: [parameter()],
    modelProposalDigest: "b".repeat(64),
    finalParametersDigest: "c".repeat(64),
    runtimeParametersDigest: "d".repeat(64),
    trustedContextDigest: "e".repeat(64),
    tenant: {
      authoritativeTenant: tenantId,
      authoritativeWorkspace: tenantId,
      sourceIdentity: "session:alice",
      runtimeTenant: tenantId,
      requestedTenant: tenantId,
      modelSuppliedTenant: null,
      destinationTenant: tenantId,
    },
    credentialDestination: {
      credentialReference: "credential:repo-read",
      credentialOwnerTenant: tenantId,
      approvedDestinations: ["https://git.example.test"],
      requestedDestination: "https://git.example.test",
      actualDestination: "https://git.example.test",
      proxyOrIntermediary: null,
      proxyProvenance: null,
      redirectChain: [],
    },
    runtime: {
      runtimeProvider: "runtime_provider",
      runtimeInstance: "runtime:eu-1",
      runtimeSession: "runtime-session:001",
      policyReference: "runtime-policy:9",
      authorityCeiling: ["repository:read"],
      delegatedChildRuntime: null,
      credentialReference: "credential:repo-read",
      enforcementDecision: "ALLOW",
      enforcementResult: "ENFORCED",
      observedExecution: "repository:read",
      destinationOutcome: "ACCEPTED",
      overriddenParameterNames: [],
    },
    authorizationChanges: [],
    delegatedSubject: {
      originatingHuman: "human:alice",
      originatingSystem: null,
      organization: "organization:acme",
      agent: "agent:alpha",
      delegatedSubject: "customer:42",
      actingSubject: "agent:alpha",
      delegationEvidence: "delegation:001",
      task: "read_repository",
      purpose: "support_case",
      authorizationDecision: "ALLOW",
    },
    policyReference: "policy:authority:7",
    trustInvariantReferences: ["SECURITY_BOUNDARY_PARAMETERS_ARE_NOT_MODEL_CONTROLLED"],
    outcomeEvidenceReferences: ["outcome:001"],
    remediationEvidenceReferences: [],
    ...overrides,
  };
}

function findingCodes(assessment) {
  return assessment.findings.map((item) => item.code);
}

test("ordinary model-controlled task input is not treated as a security-boundary finding", () => {
  const policy = parameterPolicy({ parameterName: "query", parameterCategory: "ordinary_input", allowedProvenanceClasses: ["model_controlled"], materiality: "ordinary", modelVisible: true, mutableAfterApproval: true });
  const assessment = evaluateAuthorityIntegrity(input({ toolSchema: toolSchema([policy]), parameters: [parameter({ parameterName: "query", parameterCategory: "ordinary_input", parameterProvenance: "model_controlled", materiality: "ordinary" })] }));
  assert.deepEqual(assessment.findings, []);
});

test("authority-bound tenant passes while a model tenant override becomes evidence, not a malicious label", () => {
  const valid = evaluateAuthorityIntegrity(input());
  assert.equal(findingCodes(valid).includes("TENANT_BOUNDARY_MISMATCH"), false);
  const override = evaluateAuthorityIntegrity(input({ tenant: { ...input().tenant, requestedTenant: "tenant:other", modelSuppliedTenant: "tenant:other" } }));
  assert.ok(findingCodes(override).includes("TENANT_BOUNDARY_MISMATCH"));
  assert.equal(override.findings[0].malicious, false);
});

test("model-controlled security fields cover tenant, production, and privilege boundaries", () => {
  for (const [parameterName, parameterCategory] of [["tenant_id", "tenant_boundary"], ["production_environment", "environment_boundary"], ["privilege", "privilege_boundary"]]) {
    const policy = parameterPolicy({ parameterName, parameterCategory });
    const assessment = evaluateAuthorityIntegrity(input({ toolSchema: toolSchema([policy]), parameters: [parameter({ parameterName, parameterCategory, parameterProvenance: "model_controlled", configurationPinning: "model_selectable" })] }));
    assert.ok(findingCodes(assessment).includes("MODEL_CONTROLLED_SECURITY_BOUNDARY"));
  }
});

test("runtime-derived override fixes a model proposal without making the model authoritative", () => {
  const assessment = evaluateAuthorityIntegrity(input({ parameters: [parameter({ parameterProvenance: "model_controlled", configurationPinning: "model_selectable" })], runtime: { ...input().runtime, overriddenParameterNames: ["tenant_id"] } }));
  assert.equal(findingCodes(assessment).includes("MODEL_CONTROLLED_SECURITY_BOUNDARY"), false);
});

test("model-controlled consent bypass and post-approval material change require reapproval", () => {
  const policy = parameterPolicy({ parameterName: "bypass_confirmation", parameterCategory: "consent_boundary" });
  const assessment = evaluateAuthorityIntegrity(input({
    toolSchema: toolSchema([policy]),
    parameters: [parameter({ parameterName: "bypass_confirmation", parameterCategory: "consent_boundary", parameterProvenance: "model_controlled" })],
    humanApproval: { consentRequired: true, consentSource: "signed_human_intent", humanIdentityReference: "human:alice", approvalTimestamp: now, approvedAction: "read_repository", approvedParameterDigest: "1".repeat(64), finalParameterDigest: "2".repeat(64), bypassCapableParameter: "bypass_confirmation", parameterProvenance: "model_controlled", executionResult: null, signedIntentReference: "intent:001" },
  }));
  assert.ok(findingCodes(assessment).includes("CONSENT_BOUNDARY_MODEL_CONTROLLED"));
  assert.ok(assessment.requiredActions.includes("REAPPROVAL_REQUIRED"));
});

test("model-controlled proxy and credential routing outside authority-bound destinations are distinct findings", () => {
  const assessment = evaluateAuthorityIntegrity(input({ credentialDestination: { ...input().credentialDestination, requestedDestination: "https://git.example.test", actualDestination: "https://evil.example.test", proxyOrIntermediary: "proxy:model", proxyProvenance: "model_controlled" } }));
  for (const code of ["MODEL_CONTROLLED_PROXY", "CREDENTIAL_DESTINATION_CHANGED", "CREDENTIAL_SENT_OUTSIDE_BOUND_DESTINATION"]) assert.ok(findingCodes(assessment).includes(code));
  assert.equal(JSON.stringify(assessment).includes("Bearer "), false);
});

test("a material tool schema change triggers revalidation and reapproval", () => {
  const previous = toolSchema([parameterPolicy({ parameterName: "query", parameterCategory: "ordinary_input", allowedProvenanceClasses: ["model_controlled"], materiality: "ordinary", modelVisible: true })], { toolVersion: "1.0.0" });
  const assessment = evaluateAuthorityIntegrity(input({ previousToolSchema: previous }));
  assert.ok(findingCodes(assessment).includes("TOOL_SECURITY_SCHEMA_CHANGE"));
  assert.ok(assessment.requiredActions.includes("REVALIDATION_REQUIRED"));
  assert.ok(assessment.requiredActions.includes("REAPPROVAL_REQUIRED"));
});

function authorizationChange(overrides = {}) {
  return {
    changeId: "change:001",
    changeType: "credential_revoked",
    subjectReference: "agent:alpha",
    effectiveAt: "2026-08-24T11:00:00.000Z",
    receivingProvider: "runtime_provider",
    policyReevaluation: "reevaluation:001",
    privilegeAttenuation: "attenuation:001",
    credentialRefreshOrRevocation: "credential-revocation:001",
    runtimeObservation: "old_authority_rejected",
    destinationObservation: "old_authority_rejected",
    providerReportedApplied: true,
    independentlyConfirmed: true,
    postChangeUseObservedAt: "2026-08-24T11:01:00.000Z",
    evidenceReferences: ["evidence:revocation", "evidence:destination"],
    ...overrides,
  };
}

test("revocation is complete only when destination evidence rejects old authority", () => {
  const rejected = evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange()] }));
  assert.equal(rejected.propagationState, "independently_confirmed");
  assert.equal(findingCodes(rejected).includes("STALE_AUTHORITY_STILL_ACTIVE"), false);
  const accepted = evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange({ runtimeObservation: "old_authority_accepted", destinationObservation: "old_authority_accepted", independentlyConfirmed: false })] }));
  assert.equal(accepted.propagationState, "failed");
  assert.ok(findingCodes(accepted).includes("STALE_AUTHORITY_STILL_ACTIVE"));
});

test("provider acknowledgement alone is not propagation complete", () => {
  const assessment = evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange({ runtimeObservation: "not_observed", destinationObservation: "not_observed", independentlyConfirmed: false })] }));
  assert.equal(assessment.propagationState, "provider_reports_applied");
  assert.notEqual(assessment.propagationState, "independently_confirmed");
});

test("delegated subject continuity is preserved or explicitly found lost", () => {
  assert.equal(findingCodes(evaluateAuthorityIntegrity(input())).includes("DELEGATED_SUBJECT_CONTEXT_LOST"), false);
  const lost = evaluateAuthorityIntegrity(input({ delegatedSubject: { ...input().delegatedSubject, originatingHuman: null, delegationEvidence: null, delegatedSubject: null } }));
  assert.ok(findingCodes(lost).includes("DELEGATED_SUBJECT_CONTEXT_LOST"));
});

test("conflicting provider observations remain conflicting evidence", () => {
  const assessment = evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange({ runtimeObservation: "conflicting", destinationObservation: "conflicting", independentlyConfirmed: false })] }));
  assert.equal(assessment.propagationState, "conflicting");
});

test("retrospective review separates action-time knowledge from later advisory evidence", () => {
  const assessment = evaluateAuthorityIntegrity(input({ retrospectiveReview: { advisoryReference: "advisory:2026-77", affectedToolId: "tool:repository", affectedVersions: ["2.0.0"], affectedParameters: ["tenant_id"], knownAtActionTime: ["tenant_id authority-bound"], becameKnownLater: ["tool exposed tenant_id to model"], discoveredAt: "2026-09-01T00:00:00.000Z" } }));
  assert.ok(findingCodes(assessment).includes("RETROSPECTIVE_TOOL_AUTHORITY_REVIEW_RECOMMENDED"));
  assert.deepEqual(assessment.actionTimeEvidence.retrospectiveReview.knownAtActionTime, ["tenant_id authority-bound"]);
  assert.deepEqual(assessment.actionTimeEvidence.retrospectiveReview.becameKnownLater, ["tool exposed tenant_id to model"]);
});

test("action-time evidence is immutable and later evidence appends without rewriting history", () => {
  const first = evaluateAuthorityIntegrity(input());
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.actionTimeEvidence.parameters), true);
  assert.throws(() => { first.actionTimeEvidence.parameters[0].parameterProvenance = "model_controlled"; }, TypeError);
  const second = evaluateAuthorityIntegrity(input({ actionId: "action:002", actionTimestamp: "2026-08-24T13:00:00.000Z" }));
  const history = appendAuthorityIntegrityEvidence([first], second);
  assert.equal(history.length, 2);
  assert.equal(history[0], first);
});

test("raw credentials and secret-like bearer values are rejected", () => {
  assert.throws(() => evaluateAuthorityIntegrity({ ...input(), tokenValue: "not-allowed" }), /Raw secrets are forbidden/);
  assert.throws(() => evaluateAuthorityIntegrity(input({ modelProposalDigest: "Bearer abcdefghijklmnopqrstuvwxyz" })), /Secret-like values are forbidden/);
});

test("assessment tenant scope fails closed while requested tenant mismatches remain reviewable evidence", () => {
  assert.throws(() => evaluateAuthorityIntegrity(input({ enterpriseId: "10000000-0000-4000-8000-000000000099" })), /AUTHORITY_INTEGRITY_TENANT_SCOPE_MISMATCH/);
  const requestedMismatch = evaluateAuthorityIntegrity(input({ tenant: { ...input().tenant, requestedTenant: "tenant:other" } }));
  assert.ok(findingCodes(requestedMismatch).includes("TENANT_BOUNDARY_MISMATCH"));
});

test("existing Evidence Graph, Replay, and Trust Memory projections carry authority context", () => {
  const assessment = evaluateAuthorityIntegrity(input({ authorizationChanges: [authorizationChange()], remediationEvidenceReferences: ["remediation:001"] }));
  for (const nodeType of ["PRINCIPAL", "DELEGATION", "AGENT", "AUTHORITY", "TOOL", "TOOL_VERSION", "PARAMETER", "PARAMETER_PROVENANCE", "CREDENTIAL", "RUNTIME", "DESTINATION", "ACTION", "AUTHORIZATION_CHANGE", "REMEDIATION", "OUTCOME"]) assert.ok(assessment.graphProjection.nodes.some((node) => node.nodeType === nodeType), nodeType);
  assert.ok(assessment.replayEvents.some((event) => event.eventType === "AUTHORIZATION_CHANGE_PROPAGATION_OBSERVED"));
  assert.ok(assessment.trustMemoryEvents.some((event) => event.eventType === "AUTHORIZATION_DOWNGRADE_PROPAGATED"));
  assert.equal(new Set(assessment.trustMemoryEvents.map((event) => event.eventId)).size, assessment.trustMemoryEvents.length);
});

test("recommended Trust Invariant templates remain disabled by default", () => {
  assert.equal(AUTHORITY_INTEGRITY_INVARIANT_TEMPLATES.length, 12);
  assert.ok(AUTHORITY_INTEGRITY_INVARIANT_TEMPLATES.every((item) => item.recommended && item.enabledByDefault === false));
});

test("AIMS/WIMSE-compatible categories map to existing surfaces without unsupported claims", () => {
  const mapped = mapProviderNeutralIdentityAuthorityEvidence({ category: "authorization_change", providerId: "identity_provider", subjectReference: "agent:alpha", evidenceReference: "event:revoked", evidenceDigest: "f".repeat(64), observedAt: now });
  assert.equal(mapped.existingSurfaceMappings.authorityLineage, true);
  assert.equal(mapped.existingSurfaceMappings.evidenceGraph, true);
  assert.equal(mapped.existingSurfaceMappings.replay, true);
  assert.equal(mapped.existingSurfaceMappings.trustMemory, true);
  assert.deepEqual(mapped.claims, { aimsImplementation: false, ietfCompliance: false, wimseImplementation: false, spiffeImplementation: false });
});

test("migration extends existing canonical artifacts without new tables or stores", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260824181053_authority_integrity_authorization_propagation.sql", import.meta.url), "utf8");
  assert.doesNotMatch(migration, /create\s+table/i);
  for (const name of ["extend_canonical_trust_transaction_graph_v1", "append_canonical_trust_transaction_replay_v1", "emit_canonical_trust_transaction_memory_v1"]) assert.match(migration, new RegExp(name));
  for (const table of ["evidence_graph_nodes", "evidence_graph_edges", "trust_replay_sessions", "canonical_trust_transaction_events", "trust_memory_index"]) assert.match(migration, new RegExp(table));
  assert.equal((migration.match(/security definer set search_path=''/g) ?? []).length, 3);
  assert.doesNotMatch(migration, /search_path\s*=\s*public/i);
  assert.equal((migration.match(/extensions\.digest\(/g) ?? []).length, 4);
  assert.match(migration, /revoke all on function[\s\S]*from public,anon,authenticated/);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/);
});
