import { criticalContradictionScenario } from "../scope-continuity/scenarios.ts";
import { hashCanonical } from "../trust-core/hash.ts";

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
} as const;

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
    environmentAttestationVersions: canonicalReferences.environmentAttestationIds.map((id) => ({ id, version: "immutable-record-v1" })),
    sourceEvidenceVersions: scope.decision.evidenceReferences.map((reference) => ({ reference, version: "canonical-source-v1" })),
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
  const scenario = { ids, canonicalReferences, scope, incident, evidenceSnapshot, reviewerDecision, correctiveAction, submissionPackage, replay, trustMemory };
  return { ...scenario, scenarioDigest: hashCanonical({ canonicalReferences, incident, evidenceSnapshot, reviewerDecision, correctiveAction, submissionPackage, replay, trustMemory }) };
}

export const epic2627ScenarioIds = ids;
