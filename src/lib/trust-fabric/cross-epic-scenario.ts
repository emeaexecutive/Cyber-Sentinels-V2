import { criticalContradictionScenario } from "../scope-continuity/scenarios.ts";
import { hashCanonical } from "../trust-core/hash.ts";
import { createDecisionEnvelope, evaluateEnterpriseTrust } from "./control-plane.ts";
import { evaluateTrustContract } from "./contracts.ts";
import { projectEnterpriseTrustTimeline } from "./timeline.ts";
import type { EnterpriseTrustTimelineItem, FabricReference, FabricTrustState, TimelineCategory, TrustContract } from "./types.ts";

const ids = {
  enterpriseId: "11111111-1111-4111-8111-111111111111",
  contextId: "22222222-2222-4222-8222-222222222222",
  leaseId: "33333333-3333-4333-8333-333333333333",
  attestationId: "44444444-4444-4444-8444-444444444444",
  correlationId: "55555555-5555-4555-8555-555555555555",
  incidentId: "77777777-7777-4777-8777-777777777777",
  reviewerDecisionId: "88888888-8888-4888-8888-888888888888",
  correctiveActionId: "99999999-9999-4999-8999-999999999999",
  packageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  contractId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
} as const;

const reference = (type: string, id: string, version?: string): FabricReference => ({ type, id, ...(version ? { version } : {}) });

function timelineCategory(stage: string): TimelineCategory {
  if (stage.includes("environment") || stage.includes("attestation")) return "ENVIRONMENT";
  if (stage.includes("scope") || stage.includes("target") || stage.includes("action") || stage.includes("contradiction")) return "SCOPE";
  if (stage.includes("incident") || stage.includes("containment") || stage.includes("awareness") || stage.includes("provider_ack")) return "INCIDENT";
  if (stage.includes("reviewer")) return "REVIEW";
  if (stage.includes("corrective")) return "CORRECTIVE_ACTION";
  if (stage.includes("package")) return "REGULATOR";
  if (stage.includes("trust")) return "TRUST_STATE";
  return "POLICY";
}

export function epic2627CrossEpicScenario() {
  const scope = criticalContradictionScenario();
  const scopeDecisionId = scope.decision.id;
  const canonicalReferences = {
    enterpriseId: scope.input.declaration.enterpriseId,
    executionContextId: scope.input.declaration.id,
    scopeAuthorizationLeaseId: scope.input.authorization.id,
    environmentAttestationIds: scope.input.attestations.map((item) => item.id),
    scopeContinuityDecisionId: scopeDecisionId,
    correlationId: scope.decision.correlationId,
  };
  const incident = {
    id: ids.incidentId,
    enterpriseId: ids.enterpriseId,
    state: "specialist_review_required",
    occurrenceAt: "2026-07-31T12:00:00.000Z",
    detectionAt: "2026-07-31T12:00:03.000Z",
    organizationAwarenessAt: "2026-07-31T12:04:00.000Z",
    technicalClassification: "production_boundary_contradiction",
    operationalScreening: "potential_regulatory_relevance_requires_specialist_review",
    legalConclusion: null,
    references: canonicalReferences,
    containment: {
      requestedAt: "2026-07-31T12:05:00.000Z",
      providerAcknowledgedAt: "2026-07-31T12:06:00.000Z",
      confirmedAt: null,
      independentlyConfirmedAt: null,
      state: "provider_acknowledged_not_confirmed",
    },
  } as const;
  const evidenceSnapshotContent = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    incidentId: incident.id,
    capturedAt: incident.detectionAt,
    executionContextId: canonicalReferences.executionContextId,
    scopeAuthorizationLeaseId: canonicalReferences.scopeAuthorizationLeaseId,
    scopeContinuityDecisionId: canonicalReferences.scopeContinuityDecisionId,
    environmentAttestationVersions: scope.input.attestations.map((attestation) => ({ id: attestation.id, version: "immutable-record-v1", digest: hashCanonical(attestation) })),
    sourceEvidenceVersions: scope.decision.evidenceReferences.map((evidenceReference) => ({ evidenceReference, version: "canonical-source-v1", digest: hashCanonical({ evidenceReference, version: "canonical-source-v1" }) })),
    missingEvidence: ["independent_containment_confirmation"],
  } as const;
  const evidenceSnapshot = { ...evidenceSnapshotContent, snapshotDigest: hashCanonical(evidenceSnapshotContent) };
  const reviewerDecision = {
    id: ids.reviewerDecisionId,
    incidentId: incident.id,
    reviewerRole: "compliance_reviewer",
    organizationalAuthority: "authority:incident-reviewer",
    decision: "retain_for_specialist_review",
    decidedAt: "2026-07-31T12:10:00.000Z",
    evidenceReferences: [scopeDecisionId, ...canonicalReferences.environmentAttestationIds],
  } as const;
  const correctiveAction = {
    id: ids.correctiveActionId,
    incidentId: incident.id,
    action: "isolate_execution_and_rotate_runtime_authority",
    state: "in_progress",
    completionEvidenceReferences: [],
    effectivenessState: "unknown",
    linkedContradictionReferences: scope.decision.contradictions.map((item) => item.id),
  } as const;
  const packageContent = {
    id: ids.packageId,
    incidentId: incident.id,
    version: 1,
    state: "internal_draft",
    canonicalReferences,
    reviewerDecisionId: reviewerDecision.id,
    correctiveActionId: correctiveAction.id,
    evidenceSnapshotId: evidenceSnapshot.id,
    unresolvedUncertainty: [
      "Containment is acknowledged by the provider but is not confirmed.",
      "Regulatory relevance requires specialist review; no legal conclusion is recorded.",
    ],
  } as const;
  const submissionPackage = { ...packageContent, packageDigest: hashCanonical(packageContent) };
  const replay = [
    ...scope.artifacts.replay,
    { id: incident.id, stage: "incident_opened", occurredAt: incident.detectionAt, summary: "A serious-incident record linked the boundary contradiction without duplicating its evidence." },
    { id: `${incident.id}:awareness`, stage: "organization_awareness", occurredAt: incident.organizationAwarenessAt, summary: "Organization awareness was recorded separately from occurrence and detection." },
    { id: `${incident.id}:containment-request`, stage: "containment_requested", occurredAt: incident.containment.requestedAt, summary: "Containment was requested; completion is not implied." },
    { id: `${incident.id}:provider-ack`, stage: "provider_acknowledgement", occurredAt: incident.containment.providerAcknowledgedAt, summary: "The provider acknowledged the request; containment remains unconfirmed." },
    { id: reviewerDecision.id, stage: "reviewer_decision", occurredAt: reviewerDecision.decidedAt, summary: "An authorized reviewer retained the case for specialist review." },
    { id: correctiveAction.id, stage: "corrective_action", occurredAt: "2026-07-31T12:11:00.000Z", summary: "A corrective action was opened with effectiveness still unknown." },
    { id: submissionPackage.id, stage: "internal_draft_package", occurredAt: "2026-07-31T12:12:00.000Z", summary: "A digest-bound internal draft package was formed; no external submission is implied." },
  ].sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt) || left.id.localeCompare(right.id));
  const trustMemory = [
    { source: "scope_continuity", reference: scopeDecisionId, state: scope.artifacts.trustMemory.trustStateAfter, reason: scope.artifacts.trustMemory.reason },
    { source: "serious_incident", reference: incident.id, state: incident.state, reason: incident.operationalScreening },
    { source: "reviewer_decision", reference: reviewerDecision.id, state: reviewerDecision.decision, reason: "Authorized human review recorded." },
    { source: "corrective_action", reference: correctiveAction.id, state: correctiveAction.state, reason: "Effectiveness remains unknown pending evidence." },
  ] as const;
  const subject = { type: "ai_agent" as const, id: scope.input.declaration.subjectId, displayName: "Scope demonstration agent" };
  const identity = {
    subject,
    identityReference: reference("identity", subject.id, "canonical-v1"),
    state: "verified" as const,
    authorityOwner: scope.input.declaration.accountableOwnerId,
  };
  const decision = (state: FabricTrustState, reasonCodes: string[], evidenceReferences: FabricReference[]) => ({ state, reasonCodes, evidenceReferences });
  const scopeEvidence = scope.decision.evidenceReferences.map((id) => reference("evidence", id, "canonical-source-v1"));
  const trustEvaluation = evaluateEnterpriseTrust({
    enterpriseId: ids.enterpriseId,
    subject,
    workflow: { id: scope.input.declaration.workflowId ?? "workflow:scope-demo", objective: scope.input.authorization.authorizedObjective },
    identity: decision("verified", ["IDENTITY_CANONICAL"], [identity.identityReference]),
    authority: decision("verified", ["SIMULATION_ONLY_AUTHORITY_ACTIVE"], [reference("scope_authorization_lease", scope.input.authorization.id)]),
    environment: { ...decision("contested", ["DECLARED_ENVIRONMENT_CONTRADICTED"], scopeEvidence), consistent: false },
    scope: { ...decision(scope.decision.trustImpact.nextState, scope.decision.reasonCodes, scopeEvidence), continuous: false },
    providers: [{ ...decision("contested", ["PROVIDER_ASSERTION_CONTRADICTED"], scopeEvidence), providerId: "attestor:independent-demo" }],
    policy: { id: scope.decision.policyId, version: scope.decision.policyVersion },
    continuousTrust: { ...decision(scope.decision.trustImpact.nextState, ["CONTINUOUS_TRUST_ADVERSE_STATE_PRESERVED"], [reference("scope_continuity_decision", scope.decision.id)]), decisionReference: reference("scope_continuity_decision", scope.decision.id) },
    evidenceCompleteness: "partial",
    contradictions: scope.decision.contradictions.map((item) => ({ id: item.id, state: item.severity === "critical" || item.severity === "emergency" ? "suspended" : "contested", reasonCode: item.reasonCode, evidenceReferences: item.evidenceReferences.map((id) => reference("evidence", id)) })),
    incidents: [{ id: incident.id, state: "suspended", reasonCodes: ["SERIOUS_INCIDENT_OPEN"], evidenceReferences: [reference("incident_snapshot", evidenceSnapshot.id, evidenceSnapshot.snapshotDigest)] }],
    reviewerDecisions: [{ id: reviewerDecision.id, outcome: reviewerDecision.decision, reviewRequired: true, evidenceReferences: reviewerDecision.evidenceReferences.map((id) => reference("canonical_record", id)) }],
    correctiveActions: [{ id: correctiveAction.id, state: correctiveAction.state, evidenceReferences: [] }],
    trustDnaProfileReference: reference("trust_dna", subject.id),
    replayReference: reference("enterprise_trust_timeline", scope.decision.id),
    trustMemoryReference: reference("trust_memory", scope.decision.id),
    evidenceGraphNodeReference: reference("evidence_graph_node", subject.id),
    evaluatedAt: scope.decision.decisionTimestamp,
    correlationId: ids.correlationId,
  });
  const decisionEnvelope = createDecisionEnvelope({
    enterpriseId: ids.enterpriseId, subject, workflow: { id: scope.input.declaration.workflowId ?? "workflow:scope-demo", objective: scope.input.authorization.authorizedObjective },
    decisionType: "scope", outcome: scope.decision.outcome, trustState: trustEvaluation.currentTrustState,
    reasonCodes: trustEvaluation.reasonCodes, evidenceReferences: trustEvaluation.evidenceReferences,
    policyId: scope.decision.policyId, policyVersion: scope.decision.policyVersion,
    evaluator: "scope-continuity-canonical", evaluatorVersion: scope.decision.decisionVersion,
    actorOrSystemAuthority: "system:trust-fabric", humanReviewRequired: true,
    createdAt: scope.decision.decisionTimestamp, supersededDecisionId: null,
    correlationId: ids.correlationId, legalDecisionReference: null,
  });
  const trustContract: TrustContract = {
    contractId: ids.contractId, enterpriseId: ids.enterpriseId, subject, subjectType: subject.type, subjectId: subject.id,
    workflow: { id: scope.input.declaration.workflowId ?? "workflow:scope-demo", objective: scope.input.authorization.authorizedObjective },
    workflowId: scope.input.declaration.workflowId ?? "workflow:scope-demo", authorizedObjective: scope.input.authorization.authorizedObjective,
    requiredIdentityState: "verified", requiredAuthority: ["simulation-only"], requiredEnvironmentState: "verified",
    permittedScope: ["request-target:simulation"], permittedProviders: ["attestor:independent-demo"],
    requiredEvidenceTypes: ["identity", "environment", "scope"], maximumEvidenceAgeSeconds: 900,
    monitoringRequirements: ["continuous_environment_attestation"], humanReviewThresholds: ["critical_contradiction"],
    contradictionPolicy: "pause", incidentThreshold: "critical", issuedAt: "2026-07-31T11:00:00.000Z",
    expiresAt: "2026-07-31T13:00:00.000Z", revokedAt: null, revocationState: "active",
    issuer: "operator:demo-owner", approver: "operator:demo-owner", policyId: scope.decision.policyId,
    policyVersion: scope.decision.policyVersion, evidenceReferences: [reference("scope_authorization_lease", scope.input.authorization.id)], supersedesContractId: null,
  };
  const trustContractEvaluation = evaluateTrustContract({
    contract: trustContract, evaluatedAt: scope.decision.decisionTimestamp, identityState: "verified", authorityState: "verified",
    effectiveAuthority: ["simulation-only"], environmentState: "contested", scopeState: scope.decision.trustImpact.nextState,
    requestedScope: ["request-target:production"], activeProviders: ["attestor:independent-demo"],
    evidence: [{ type: "identity", observedAt: scope.input.declaration.declaredAt, reference: identity.identityReference }, ...scope.input.attestations.map((item) => ({ type: "environment", observedAt: item.observedAt, reference: reference("environment_attestation", item.id, "immutable-record-v1") }))],
    monitoring: ["continuous_environment_attestation"], contradictions: scope.decision.contradictions.map((item) => item.id),
    highestIncidentSeverity: "critical", humanReviewRequired: true, correlationId: ids.correlationId,
  });
  const trustTimeline = projectEnterpriseTrustTimeline([replay.map((event): EnterpriseTrustTimelineItem => {
    const item = event as typeof event & { label?: string; sourceType?: string; sourceIdentity?: string; evidenceStrength?: string; integrityStatus?: EnterpriseTrustTimelineItem["integrityState"]; evidenceReference?: string | null; correlationId?: string };
    return {
      id: item.id, category: timelineCategory(item.stage), source: item.sourceIdentity ?? "cross-epic-canonical-projection",
      sourceType: item.sourceType ?? "canonical_record", sourceAuthority: item.sourceIdentity ?? "system:trust-fabric",
      eventType: item.stage, timestamp: item.occurredAt, timestampConfidence: "confirmed",
      evidenceStrength: item.evidenceStrength ?? "derived", integrityState: item.integrityStatus ?? "unknown",
      enterpriseId: ids.enterpriseId, subject, correlationId: item.correlationId ?? ids.correlationId,
      evidenceReferences: item.evidenceReference ? [reference("evidence", item.evidenceReference)] : [],
      supersedesItemId: null, uncertainty: item.evidenceReference ? [] : ["No direct evidence reference is projected for this summary item."],
      replayClassification: item.label ?? "DECIDED", summary: item.summary,
    };
  })]);
  const trustFabric = { identity, trustEvaluation, decisionEnvelope, trustContract, trustContractEvaluation, trustTimeline };
  const scenario = { ids, canonicalReferences, scope, incident, evidenceSnapshot, reviewerDecision, correctiveAction, submissionPackage, replay, trustMemory, trustFabric };
  return { ...scenario, scenarioDigest: hashCanonical({ canonicalReferences, incident, evidenceSnapshot, reviewerDecision, correctiveAction, submissionPackage, replay, trustMemory, trustFabric }) };
}

export const epic2627ScenarioIds = ids;
