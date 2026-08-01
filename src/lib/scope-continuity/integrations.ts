import { deterministicUuid } from "../trust-core/hash.ts";
import type { ScopeContinuityArtifacts, ScopeContinuityDecision, ScopeContinuityEvaluationInput, ScopeReplayItem } from "./types.ts";

function replayItem(input: Omit<ScopeReplayItem, "id">): ScopeReplayItem {
  return { ...input, id: deterministicUuid(input as unknown as Record<string, unknown>) };
}

function replayClassification(attestation: ScopeContinuityEvaluationInput["attestations"][number]): Pick<ScopeReplayItem, "stage" | "label"> {
  if (attestation.attestationSourceType === "provider_assertion") return { stage: "provider_assertion", label: "ASSERTED" };
  if (attestation.attestationSourceType === "operator_assertion") return { stage: "operator_assertion", label: "ASSERTED" };
  if (attestation.attestationSourceType === "harness_configuration") return { stage: "configuration_assertion", label: "CONFIGURED" };
  if (attestation.attestationSourceType === "independent_attestation") return { stage: "independent_attestation", label: "INDEPENDENTLY_ATTESTED" };
  return { stage: "runtime_observation", label: "OBSERVED" };
}

export function buildScopeContinuityArtifacts(input: ScopeContinuityEvaluationInput, decision: ScopeContinuityDecision): ScopeContinuityArtifacts {
  const declaration = input.declaration;
  const authorization = input.authorization;
  const common = { enterpriseId: declaration.enterpriseId, executionContextId: declaration.id, correlationId: decision.correlationId };
  const replay: ScopeReplayItem[] = [
    replayItem({ ...common, stage: "declared_environment", label: "ASSERTED", sourceType: declaration.declarationSourceType, sourceIdentity: declaration.declarationSourceId, occurredAt: declaration.declaredAt, evidenceStrength: "asserted", integrityStatus: declaration.integrityMetadata.status, evidenceReference: declaration.evidenceReference, summary: `Environment declared as ${declaration.environmentClass}.`, evidenced: true }),
    ...(declaration.testHarnessProvider ? [replayItem({ ...common, stage: "configuration_assertion" as const, label: "CONFIGURED" as const, sourceType: "harness_configuration", sourceIdentity: declaration.testHarnessProvider, occurredAt: declaration.declaredAt, evidenceStrength: "configured" as const, integrityStatus: declaration.integrityMetadata.status, evidenceReference: declaration.evidenceReference, summary: "Test harness configuration was attributed to its declared provider.", evidenced: true })] : []),
    ...input.attestations.map((item) => replayItem({ ...common, ...replayClassification(item), sourceType: item.attestationSourceType, sourceIdentity: item.attestationSourceId, occurredAt: item.observedAt, evidenceStrength: item.evidenceStrength, integrityStatus: item.integrityMetadata.status, evidenceReference: item.evidenceReference, summary: `${item.observationType} recorded ${item.observedEnvironmentClass} context.`, evidenced: true })),
    replayItem({ ...common, stage: "authorized_scope", label: "ASSERTED", sourceType: "authority_grant", sourceIdentity: authorization.approverId, occurredAt: authorization.issuedAt, evidenceStrength: "asserted", integrityStatus: "verified", evidenceReference: authorization.authorityReference ?? authorization.id, summary: `Scope authorized for ${authorization.authorizedObjective}.`, evidenced: true }),
    replayItem({ ...common, stage: "requested_action", label: "OBSERVED", sourceType: "action_request", sourceIdentity: declaration.subjectId, occurredAt: input.request.requestedAt, evidenceStrength: "observed", integrityStatus: "verified", evidenceReference: null, summary: `Requested action ${input.request.action}.`, evidenced: true }),
    replayItem({ ...common, stage: "requested_target", label: "OBSERVED", sourceType: "action_request", sourceIdentity: declaration.subjectId, occurredAt: input.request.requestedAt, evidenceStrength: "observed", integrityStatus: "verified", evidenceReference: null, summary: `Requested target ${input.request.targetIdentifier}.`, evidenced: true }),
    ...decision.contradictions.map((item) => replayItem({ ...common, stage: "contradiction", label: "INFERRED", sourceType: "scope_continuity_policy", sourceIdentity: item.detectedBy, occurredAt: item.detectedAt, evidenceStrength: "observed", integrityStatus: "verified", evidenceReference: item.evidenceReferences[0] ?? null, summary: `${item.type} (${item.severity}).`, evidenced: true })),
    replayItem({ ...common, stage: "scope_decision", label: "DECIDED", sourceType: "deterministic_policy_engine", sourceIdentity: "scope-continuity-policy-engine", occurredAt: decision.decisionTimestamp, evidenceStrength: "observed", integrityStatus: "verified", evidenceReference: `decision:${decision.id}`, summary: `Scope decision: ${decision.outcome}.`, evidenced: true }),
    replayItem({ ...common, stage: "trust_change", label: "DECIDED", sourceType: "continuous_trust", sourceIdentity: "scope-continuity-policy-engine", occurredAt: decision.decisionTimestamp, evidenceStrength: "observed", integrityStatus: "verified", evidenceReference: `decision:${decision.id}`, summary: `Trust state: ${decision.trustImpact.nextState}.`, evidenced: true }),
    ...(decision.humanReviewRequired ? [replayItem({ ...common, stage: "human_review" as const, label: "DECIDED" as const, sourceType: "governance_requirement", sourceIdentity: "scope-continuity-policy-engine", occurredAt: decision.decisionTimestamp, evidenceStrength: "observed" as const, integrityStatus: "verified" as const, evidenceReference: `decision:${decision.id}`, summary: "Human review is required; no reviewer action is implied.", evidenced: false })] : []),
  ].sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt) || left.id.localeCompare(right.id));

  const authorityLineage: ScopeContinuityArtifacts["authorityLineage"] = [
    { type: "DECLARED_BY", from: declaration.id, to: declaration.accountableOwnerId, evidenceReference: declaration.evidenceReference, occurredAt: declaration.declaredAt },
    ...(declaration.testHarnessProvider ? [{ type: "CONFIGURED_BY" as const, from: declaration.id, to: declaration.testHarnessProvider, evidenceReference: declaration.evidenceReference, occurredAt: declaration.declaredAt }] : []),
    { type: "AUTHORIZED_BY", from: authorization.id, to: authorization.approverId, evidenceReference: authorization.authorityReference ?? authorization.id, occurredAt: authorization.issuedAt },
    { type: "REQUESTS_ACCESS_TO", from: declaration.subjectId, to: input.request.targetIdentifier, evidenceReference: null, occurredAt: input.request.requestedAt },
    ...input.attestations.map((item) => ({ type: item.attestationSourceType === "independent_attestation" ? "ATTESTED_BY" as const : "OBSERVED_BY" as const, from: item.id, to: item.attestationSourceId, evidenceReference: item.evidenceReference, occurredAt: item.observedAt })),
    ...decision.contradictions.map((item) => ({ type: "DETECTED_BY" as const, from: item.id, to: item.detectedBy, evidenceReference: item.evidenceReferences[0] ?? null, occurredAt: item.detectedAt })),
  ];

  const nodes = [
    { id: declaration.id, type: "execution_context", label: "Execution context", metadata: { environmentClass: declaration.environmentClass } },
    { id: authorization.id, type: "authorization", label: "Scope authorization", metadata: { objective: authorization.authorizedObjective } },
    ...input.attestations.map((item) => ({ id: item.id, type: "evidence", label: item.observationType, metadata: { sourceType: item.attestationSourceType, evidenceStrength: item.evidenceStrength, providerIdentity: item.providerOrThirdPartyIdentity ?? null } })),
    ...decision.contradictions.map((item) => ({ id: item.id, type: "contradiction", label: item.type, metadata: { severity: item.severity } })),
    { id: decision.id, type: "decision", label: decision.outcome, metadata: { reasonCodes: decision.reasonCodes, trustState: decision.trustImpact.nextState } },
  ];
  const relationships = [
    { from: declaration.id, to: authorization.id, type: "REQUIRES", evidenceReference: declaration.evidenceReference },
    ...input.attestations.map((item) => ({ from: item.id, to: declaration.id, type: decision.contradictions.length ? "CONTRADICTS" : "SATISFIES", evidenceReference: item.evidenceReference })),
    ...decision.contradictions.map((item) => ({ from: item.id, to: decision.id, type: "RESULTED_IN", evidenceReference: item.evidenceReferences[0] ?? null })),
    { from: decision.id, to: authorization.id, type: decision.outcome === "revoke_scope" ? "REVOKES" : "AUTHORIZED_BY", evidenceReference: authorization.authorityReference ?? authorization.id },
  ];

  const canonicalTrustState = decision.trustImpact.nextState === "verified" ? "VERIFIED" : decision.trustImpact.nextState === "contested" ? "CHALLENGED" : decision.trustImpact.nextState === "revoked" ? "REVOKED" : "BLOCKED";
  return {
    authorityLineage,
    replay,
    evidenceGraph: { nodes, relationships },
    trustMemory: {
      eventKind: decision.outcome === "revoke_scope" ? "authority_revoked" : decision.contradictions.length ? "runtime_change" : "trust_confirmed",
      trustStateBefore: decision.trustImpact.priorState ?? "unknown",
      trustStateAfter: decision.trustImpact.nextState,
      evidenceReferences: decision.evidenceReferences,
      authorityReferences: [decision.authorizationReference],
      reason: decision.reasonCodes.join(", "),
    },
    canonicalTrustState,
  };
}
