import { deterministicUuid } from "../trust-core/hash.ts";
import type { IncidentChronologyEvent, ScreeningResult, SeriousIncidentArtifacts, SeriousIncidentAssessmentInput } from "./types.ts";

function chronology(input: Omit<IncidentChronologyEvent, "id">): IncidentChronologyEvent { return { ...input, id: deterministicUuid(input as unknown as Record<string, unknown>) }; }
function authorityRelationship(role:string){return ({model_provider:"PROVIDED_MODEL_FOR",system_provider:"PROVIDED_SYSTEM_FOR",deployer:"DEPLOYED_SYSTEM",agent_developer:"DEVELOPED_AGENT",application_owner:"OWNED_APPLICATION",system_owner:"OWNED_APPLICATION",incident_owner:"OWNED_INCIDENT",evaluation_sponsor:"SPONSORED_EVALUATION",evaluation_operator:"OPERATED_HARNESS",infrastructure_provider:"PROVIDED_INFRASTRUCTURE",sandbox_or_harness_provider:"OPERATED_HARNESS",runtime_security_provider:"MONITORED_RUNTIME",identity_provider:"ISSUED_AUTHORITY",access_provider:"ISSUED_AUTHORITY",affected_customer:"AFFECTED_BY",affected_third_party:"AFFECTED_BY",incident_responder:"RESPONDED_TO",technical_reviewer:"REVIEWED_INCIDENT",security_reviewer:"REVIEWED_INCIDENT",compliance_reviewer:"REVIEWED_INCIDENT",legal_reviewer:"REVIEWED_INCIDENT",data_protection_reviewer:"REVIEWED_INCIDENT",external_adviser:"REVIEWED_INCIDENT",regulator_liaison:"SUBMITTED_PACKAGE",executive_approver:"APPROVED_REPORTING_DECISION"} as Record<string,string>)[role]??"RESPONDED_TO";}

export function buildSeriousIncidentArtifacts(input: SeriousIncidentAssessmentInput, screening: ScreeningResult, correlationId: string): SeriousIncidentArtifacts {
  const common = { enterpriseId: input.enterpriseId, incidentId: input.id, correlationId, ingestedAt: input.clocks.firstCyberSentinelsIngestionAt, supersedesEventId: null };
  const replay: IncidentChronologyEvent[] = [
    chronology({ ...common, eventType: "incident_detected", source: "Cyber Sentinels", sourceType: "runtime_security_observation", sourceAuthority: "technical_evidence", occurredAt: input.clocks.firstDetectionAt, timestampConfidence: "confirmed", orderingConfidence: "high", evidenceReference: input.references.evidenceGraphReference ?? input.evidenceSnapshot.id, integrityState: "verified", classification: "TECHNICAL EVIDENCE", summary: "Incident detection was recorded from attributed technical evidence.", containmentState: null }),
    ...(input.clocks.organizationAwarenessAt ? [chronology({ ...common, eventType: "organization_became_aware" as const, source: input.identity.accountableOrganization, sourceType: "authorized_human_record", sourceAuthority: "organizational_awareness", occurredAt: input.clocks.organizationAwarenessAt, timestampConfidence: "confirmed" as const, orderingConfidence: "high" as const, evidenceReference: null, integrityState: "verified" as const, classification: "REVIEWER DECISION" as const, summary: "Organization awareness was explicitly recorded; it was not inferred from technical detection.", containmentState: null })] : []),
    chronology({ ...common, eventType: "regulator_assessment_started", source: "Cyber Sentinels", sourceType: "deterministic_operational_screening", sourceAuthority: "operational_screening_only", occurredAt: screening.evaluatedAt, timestampConfidence: "confirmed", orderingConfidence: "high", evidenceReference: `screening:${screening.id}`, integrityState: "verified", classification: "CYBER SENTINELS OPERATIONAL SCREENING", summary: `${screening.label}: ${screening.outcome}.`, containmentState: null }),
  ].sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt) || left.id.localeCompare(right.id));

  const authorityLineage = [
    { type: "PROVIDED_MODEL_FOR", from: input.identity.modelProvider, to: input.identity.aiSystemId, evidenceReference: input.evidenceSnapshot.providerEvidenceReferences[0] ?? null, occurredAt: input.evidenceSnapshot.capturedAt },
    { type: "DEPLOYED_SYSTEM", from: input.identity.accountableOrganization, to: input.identity.aiSystemId, evidenceReference: input.identity.deploymentReference, occurredAt: input.createdAt },
    { type: "OWNED_INCIDENT", from: input.identity.incidentOwner, to: input.id, evidenceReference: null, occurredAt: input.createdAt },
    ...input.responsibilityRoles.map((role) => ({ type: authorityRelationship(role.roleType), from: role.partyReference, to: input.id, evidenceReference: role.authorityReference, occurredAt: role.assignedAt })),
  ];
  const nodes = [
    { id: input.id, type: "incident", label: input.regulatoryContext.incidentCategory, metadata: { state: input.state, jurisdiction: input.regulatoryContext.jurisdiction } },
    { id: input.identity.aiSystemId, type: "ai_system", label: input.identity.aiSystemId, metadata: { modelVersion: input.identity.modelVersion, agentVersion: input.identity.agentVersion } },
    { id: input.identity.agentId, type: "ai_agent", label: input.identity.agentId, metadata: { agentVersion: input.identity.agentVersion } },
    ...(input.identity.runtimeSessionReference ? [{ id: input.identity.runtimeSessionReference, type: "runtime", label: input.identity.runtimeSessionReference, metadata: {} }] : []),
    { id: input.identity.modelProvider, type: "provider", label: input.identity.modelProvider, metadata: { attributionOnly: true } },
    { id: "cyber-sentinels-runtime-security", type: "monitor", label: "Cyber Sentinels runtime security", metadata: { attributionOnly: true } },
    { id: input.evidenceSnapshot.id, type: "evidence_snapshot", label: "Evidence at incident", metadata: { capturedAt: input.evidenceSnapshot.capturedAt } },
    { id: screening.id, type: "regulatory_trigger_finding", label: screening.outcome, metadata: { legalConclusion: false, reasonCodes: screening.reasonCodes } },
    ...input.references.affectedSystems.map((id) => ({ id, type: "affected_resource", label: id, metadata: {} })),
    ...input.references.affectedOrganizations.map((id) => ({ id, type: "affected_organization", label: id, metadata: {} })),
    ...(input.references.scopeContinuityDecisionReference ? [{ id: input.references.scopeContinuityDecisionReference, type: "scope_continuity_decision", label: "Scope Continuity decision", metadata: {} }] : []),
    ...(input.evidenceSnapshot.scopeAuthorizationLeaseReference ? [{ id: input.evidenceSnapshot.scopeAuthorizationLeaseReference, type: "scope_authorization_lease", label: "Scope authorization lease", metadata: {} }] : []),
    ...(input.references.environmentAttestationReference ? [{ id: input.references.environmentAttestationReference, type: "environment_attestation", label: "Environment attestation", metadata: {} }] : []),
  ];
  const relationships = [
    { from: input.id, fromType: "incident", to: input.identity.aiSystemId, toType: "ai_system", type: "INVOLVES", evidenceReference: input.identity.deploymentReference },
    { from: input.identity.aiSystemId, fromType: "ai_system", to: input.identity.agentId, toType: "ai_agent", type: "OPERATED_AS", evidenceReference: input.identity.deploymentReference },
    { from: input.id, fromType: "incident", to: input.evidenceSnapshot.id, toType: "evidence_snapshot", type: "OBSERVED_BY", evidenceReference: input.evidenceSnapshot.id },
    { from: input.id, fromType: "incident", to: "cyber-sentinels-runtime-security", toType: "monitor", type: "DETECTED_BY", evidenceReference: input.references.evidenceGraphReference ?? input.evidenceSnapshot.id },
    { from: input.identity.aiSystemId, fromType: "ai_system", to: input.identity.modelProvider, toType: "provider", type: "DERIVED_FROM", evidenceReference: input.identity.deploymentReference },
    { from: screening.id, fromType: "regulatory_trigger_finding", to: input.id, toType: "incident", type: "SUPPORTS_TRIGGER", evidenceReference: `screening:${screening.id}` },
    ...input.references.affectedSystems.map((id) => ({ from: input.id, fromType: "incident", to: id, toType: "affected_resource", type: "AFFECTED", evidenceReference: input.evidenceSnapshot.id })),
    ...input.references.affectedOrganizations.map((id) => ({ from: input.id, fromType: "incident", to: id, toType: "affected_organization", type: "AFFECTED", evidenceReference: input.evidenceSnapshot.id })),
    ...(input.references.scopeContinuityDecisionReference ? [{ from: input.identity.runtimeSessionReference ?? input.identity.agentId, fromType: input.identity.runtimeSessionReference ? "runtime" : "ai_agent", to: input.references.scopeContinuityDecisionReference, toType: "scope_continuity_decision", type: "AUTHORIZED_BY", evidenceReference: input.references.scopeContinuityDecisionReference }] : []),
    ...(input.identity.runtimeSessionReference && input.evidenceSnapshot.scopeAuthorizationLeaseReference ? [{ from: input.identity.runtimeSessionReference, fromType: "runtime", to: input.evidenceSnapshot.scopeAuthorizationLeaseReference, toType: "scope_authorization_lease", type: "AUTHORIZED_BY", evidenceReference: input.evidenceSnapshot.scopeAuthorizationLeaseReference }] : []),
    ...(input.identity.runtimeSessionReference && input.references.environmentAttestationReference ? [{ from: input.identity.runtimeSessionReference, fromType: "runtime", to: input.references.environmentAttestationReference, toType: "environment_attestation", type: "RAN_IN", evidenceReference: input.references.environmentAttestationReference }] : []),
  ];
  return {
    authorityLineage,
    evidenceGraph: { nodes, relationships },
    replay,
    trustMemory: [
      { eventKind: "serious_incident_opened", subject: input.identity.aiSystemId, evidenceReferences: [input.evidenceSnapshot.id], decisionAuthority: input.identity.incidentOwner, reason: input.regulatoryContext.incidentCategory, occurredAt: input.createdAt },
      ...(screening.outcome === "no_known_trigger" ? [] : [{ eventKind: screening.outcome === "specialist_review_required" ? "specialist_review_required" : "potential_regulatory_trigger_identified", subject: input.identity.aiSystemId, evidenceReferences: [`screening:${screening.id}`], decisionAuthority: null, reason: screening.reasonCodes.join(", "), occurredAt: screening.evaluatedAt }]),
    ],
  };
}

export function correctionTrustMemory(input: { incidentId: string; subject: string; originalClassification: string; revisedClassification: string; evidenceReferences: string[]; actor: string; occurredAt: string; supersedesEventId: string }) {
  return { eventKind: "incident_classification_revised", subject: input.subject, enterprise: input.incidentId, evidenceReferences: input.evidenceReferences, decisionAuthority: input.actor, originalClassification: input.originalClassification, revisedClassification: input.revisedClassification, reason: "Later evidence revised attribution; the earlier record remains preserved.", occurredAt: input.occurredAt, supersedesEventId: input.supersedesEventId };
}
