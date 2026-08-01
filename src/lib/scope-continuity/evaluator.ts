import { evaluateAuthorityGraph, type AuthorityGrant } from "../../../lib/core/authority-graph.ts";
import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import { normalizeReasonCodes } from "../trust-core/reason-codes.ts";
import { isIndependentEvidence } from "./evidence.ts";
import { validateScopeContinuityInput } from "./validation.ts";
import type { ContextContradictionEvent, ContradictionSeverity, ContradictionType, EnvironmentAttestation, ScopeAuthorizationEvaluation, ScopeContinuityDecision, ScopeContinuityEvaluationInput, ScopeDecisionOutcome, ScopeTrustState } from "./types.ts";

const outcomeRank: Record<ScopeDecisionOutcome, number> = {
  allow: 0,
  allow_with_reduced_trust: 1,
  require_human_approval: 2,
  pause: 3,
  deny: 4,
  revoke_scope: 5,
};

function maximumOutcome(left: ScopeDecisionOutcome, right: ScopeDecisionOutcome) {
  return outcomeRank[left] >= outcomeRank[right] ? left : right;
}

function leaseGrant(input: ScopeContinuityEvaluationInput): AuthorityGrant {
  const lease = input.authorization;
  return {
    id: lease.id,
    tenantId: lease.enterpriseId,
    grantorId: lease.approverId,
    grantorType: lease.approverType,
    granteeId: lease.subjectId,
    granteeType: lease.subjectType,
    scope: lease.permittedActions,
    purpose: lease.authorizedObjective,
    permittedActions: lease.permittedActions,
    prohibitedActions: [],
    resourceScope: lease.permittedTargets,
    approvalRequirements: [],
    policyVersion: input.policy.policyVersion,
    evidenceReference: lease.authorityReference ?? undefined,
    maxDelegationDepth: 0,
    issuedAt: lease.issuedAt,
    expiresAt: lease.expiresAt,
    revokedAt: lease.revokedAt,
    evidenceRefs: lease.evidenceReferences,
  };
}

export function evaluateScopeAuthorization(input: ScopeContinuityEvaluationInput): ScopeAuthorizationEvaluation {
  const grant = leaseGrant(input);
  const graph = evaluateAuthorityGraph({
    tenantId: input.declaration.enterpriseId,
    subjectId: input.declaration.subjectId,
    workflowId: input.declaration.workflowId ?? input.declaration.executionId ?? "execution",
    action: input.request.action,
    purpose: input.request.objective,
    requestedScope: [input.request.action],
    resource: input.request.targetIdentifier,
    policyVersion: input.policy.policyVersion,
    grants: [grant],
    evaluatedAt: input.evaluatedAt,
  });
  const reasons = graph.checks.filter((check) => !check.passed).map((check) => `AUTHORITY_${check.name.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_")}`);
  return { grant, allowed: graph.valid, reasonCodes: normalizeReasonCodes(reasons) };
}

function conflicts(provider: EnvironmentAttestation, independent: EnvironmentAttestation) {
  return provider.observedEnvironmentClass !== independent.observedEnvironmentClass
    || (provider.internetReachable !== null && independent.internetReachable !== null && provider.internetReachable !== independent.internetReachable)
    || (provider.productionReachable !== null && independent.productionReachable !== null && provider.productionReachable !== independent.productionReachable)
    || (provider.isolationControlState !== "unknown" && independent.isolationControlState !== "unknown" && provider.isolationControlState !== independent.isolationControlState);
}

function trustState(outcome: ScopeDecisionOutcome, contradictions: ContextContradictionEvent[], independentCurrent: boolean): ScopeTrustState {
  if (outcome === "revoke_scope") return "revoked";
  if (contradictions.some((item) => item.type === "provider_assertion_contradicted")
    && !contradictions.some((item) => ["critical", "emergency"].includes(item.severity))) return "contested";
  if (outcome === "deny" || outcome === "pause") return "suspended";
  if (outcome !== "allow" || contradictions.length || !independentCurrent) return "degraded";
  return "verified";
}

export function evaluateScopeContinuity(raw: ScopeContinuityEvaluationInput): ScopeContinuityDecision {
  const input = validateScopeContinuityInput(raw);
  const now = Date.parse(input.evaluatedAt);
  const decisionId = deterministicUuid({ enterpriseId: input.declaration.enterpriseId, executionContextId: input.declaration.id, authorizationId: input.authorization.id, request: input.request, policyId: input.policy.policyId, policyVersion: input.policy.policyVersion, evaluatedAt: input.evaluatedAt });
  const contradictions: ContextContradictionEvent[] = [];
  const missingEvidence: string[] = [];
  const reasonCodes: string[] = [];
  let outcome: ScopeDecisionOutcome = "allow";

  const addContradiction = (type: ContradictionType, severity: ContradictionSeverity, reasonCode: string, evidenceReferences: string[], requestedOutcome: ScopeDecisionOutcome) => {
    const normalizedRefs = [...new Set(evidenceReferences)].sort();
    contradictions.push({
      id: deterministicUuid({ decisionId, type, reasonCode, evidenceReferences: normalizedRefs }),
      enterpriseId: input.declaration.enterpriseId,
      executionContextId: input.declaration.id,
      decisionId,
      type,
      severity,
      reasonCode,
      evidenceReferences: normalizedRefs,
      detectedBy: "scope-continuity-policy-engine",
      detectedAt: input.evaluatedAt,
    });
    reasonCodes.push(reasonCode);
    outcome = maximumOutcome(outcome, requestedOutcome);
  };

  const declarationCurrent = Date.parse(input.declaration.validFrom) <= now && Date.parse(input.declaration.validUntil) > now;
  if (!declarationCurrent) {
    addContradiction("agent_context_ambiguity_detected", "critical", "DECLARATION_NOT_CURRENT", [input.declaration.evidenceReference], "deny");
  }

  const authorization = evaluateScopeAuthorization(input);
  if (!authorization.allowed) {
    reasonCodes.push(...authorization.reasonCodes, "SCOPE_AUTHORIZATION_INVALID");
    outcome = maximumOutcome(outcome, input.authorization.revokedAt ? "revoke_scope" : "deny");
  }
  if (input.authorization.consumedActionCount >= input.authorization.maximumActionCount) {
    reasonCodes.push("SCOPE_ACTION_LIMIT_EXHAUSTED");
    outcome = maximumOutcome(outcome, "deny");
  }
  if (!input.authorization.permittedEnvironments.includes(input.declaration.environmentClass)) {
    reasonCodes.push("DECLARED_ENVIRONMENT_NOT_AUTHORIZED");
    outcome = maximumOutcome(outcome, "deny");
  }
  if (input.request.tool && !input.authorization.permittedTools.includes(input.request.tool)) {
    reasonCodes.push("TOOL_OUTSIDE_AUTHORIZED_SCOPE");
    outcome = maximumOutcome(outcome, "deny");
  }
  if (input.request.dataClassification && !input.authorization.dataClassificationBoundary.includes(input.request.dataClassification)) {
    reasonCodes.push("DATA_CLASSIFICATION_OUTSIDE_SCOPE");
    outcome = maximumOutcome(outcome, "deny");
  }
  if (!input.authorization.permittedTargets.includes(input.request.targetIdentifier)) {
    reasonCodes.push("TARGET_OUTSIDE_AUTHORIZED_SCOPE");
    outcome = maximumOutcome(outcome, "deny");
  }
  if (!input.declaration.permittedTargetIdentifiers.includes(input.request.targetIdentifier)) {
    reasonCodes.push("TARGET_OUTSIDE_DECLARED_SCOPE");
    outcome = maximumOutcome(outcome, "deny");
  }
  if (!input.authorization.permittedEnvironments.includes(input.request.targetEnvironmentClass)) {
    reasonCodes.push("TARGET_ENVIRONMENT_OUTSIDE_AUTHORIZED_SCOPE");
    outcome = maximumOutcome(outcome, "deny");
  }
  if (!input.declaration.productionAccessExpected && input.request.targetEnvironmentClass === "production") {
    addContradiction("unexpected_production_access", "critical", "PRODUCTION_TARGET_NOT_EXPECTED", [input.declaration.evidenceReference, ...input.authorization.evidenceReferences], input.policy.criticalContradictionOutcome);
  }

  const currentAttestations = input.attestations.filter((item) => {
    const age = now - Date.parse(item.observedAt);
    return item.freshness === "current" && age >= 0 && age <= input.policy.maximumAttestationAgeSeconds * 1000;
  });
  const staleAttestations = input.attestations.filter((item) => !currentAttestations.includes(item));
  if (staleAttestations.length) {
    addContradiction("stale_attestation", "material", "ATTESTATION_STALE", staleAttestations.map((item) => item.evidenceReference), input.policy.staleAttestationOutcome);
  }

  for (const required of input.authorization.requiredAttestationTypes) {
    if (!currentAttestations.some((item) => item.attestationSourceType === required)) missingEvidence.push(`attestation:${required}`);
  }
  const independentCurrent = currentAttestations.some(isIndependentEvidence);
  if (input.policy.requireIndependentAttestation && !independentCurrent) missingEvidence.push("attestation:independent");
  if (missingEvidence.length) {
    addContradiction("missing_required_attestation", "material", "REQUIRED_ATTESTATION_MISSING", [], input.policy.missingAttestationOutcome);
    if (!independentCurrent) addContradiction("independent_detection_absent", "material", "INDEPENDENT_ATTESTATION_MISSING", [], input.policy.missingAttestationOutcome);
  }

  const observations = currentAttestations.filter((item) => ["runtime_observation", "independent_attestation"].includes(item.attestationSourceType));
  if (observations.length) {
    const unsafeEvidence = observations.filter((item) => input.declaration.environmentClass === "simulation" && (item.observedEnvironmentClass === "production" || item.productionReachable === true));
    if (unsafeEvidence.length) addContradiction("declared_simulation_observed_production", "critical", "SIMULATION_OBSERVED_PRODUCTION", [input.declaration.evidenceReference, ...unsafeEvidence.map((item) => item.evidenceReference)], input.policy.criticalContradictionOutcome);
    const internetEvidence = observations.filter((item) => !input.declaration.internetAccessExpected && item.internetReachable === true);
    if (internetEvidence.length) addContradiction("unexpected_internet_access", "critical", "INTERNET_REACHABILITY_UNEXPECTED", [input.declaration.evidenceReference, ...internetEvidence.map((item) => item.evidenceReference)], input.policy.unexpectedInternetOutcome);
    const productionEvidence = observations.filter((item) => !input.declaration.productionAccessExpected && item.productionReachable === true);
    if (productionEvidence.length) addContradiction("unexpected_production_access", "critical", "PRODUCTION_REACHABILITY_UNEXPECTED", [input.declaration.evidenceReference, ...productionEvidence.map((item) => item.evidenceReference)], input.policy.criticalContradictionOutcome);
    const unapprovedObserved = [...new Set(observations.flatMap((item) => item.observedTargetIdentifiers).filter((target) => !input.authorization.permittedTargets.includes(target)))];
    if (unapprovedObserved.length) {
      addContradiction("unapproved_target_reachable", "critical", "UNAPPROVED_TARGET_REACHABLE", observations.filter((item) => item.observedTargetIdentifiers.some((target) => unapprovedObserved.includes(target))).map((item) => item.evidenceReference), input.policy.criticalContradictionOutcome);
    }
    const absentIsolation = observations.filter((item) => item.isolationControlState === "absent" && input.declaration.environmentClass !== "production");
    if (absentIsolation.length) addContradiction("isolation_configuration_drift", "material", "ISOLATION_CONTROL_DRIFT", absentIsolation.map((item) => item.evidenceReference), "pause");
  }

  if (currentAttestations.some((item) => item.monitoringState === "unavailable")) {
    addContradiction("monitoring_unavailable", "material", "MONITORING_UNAVAILABLE", currentAttestations.filter((item) => item.monitoringState === "unavailable").map((item) => item.evidenceReference), input.policy.monitoringUnavailableOutcome);
  }

  const providerAssertions = currentAttestations.filter((item) => item.attestationSourceType === "provider_assertion");
  const independent = currentAttestations.filter(isIndependentEvidence);
  for (const provider of providerAssertions) {
    const contradiction = independent.find((item) => conflicts(provider, item));
    if (contradiction) {
      addContradiction("provider_assertion_contradicted", "material", "PROVIDER_ASSERTION_CONTRADICTED", [provider.evidenceReference, contradiction.evidenceReference], input.authorization.contradictionResponsePolicy);
    }
  }

  const priorAllowed = input.previousDecision && ["allow", "allow_with_reduced_trust"].includes(input.previousDecision.outcome);
  if (priorAllowed && contradictions.some((item) => ["material", "critical", "emergency"].includes(item.severity))) {
    reasonCodes.push("MATERIAL_CONTRADICTION_AFTER_ALLOW");
    outcome = maximumOutcome(outcome, input.policy.contradictionAfterAllowOutcome);
  }

  if (outcome === "allow" && (!independentCurrent || contradictions.length > 0)) outcome = "allow_with_reduced_trust";
  const normalizedReasons = normalizeReasonCodes(reasonCodes.length ? reasonCodes : ["SCOPE_CONTEXT_CONSISTENT"]);
  const nextState = trustState(outcome, contradictions, independentCurrent);
  const evidenceReferences = [...new Set([input.declaration.evidenceReference, ...input.authorization.evidenceReferences, ...input.attestations.map((item) => item.evidenceReference)])].sort();
  const unsigned = {
    id: decisionId,
    enterpriseId: input.declaration.enterpriseId,
    executionContextId: input.declaration.id,
    declarationReference: input.declaration.evidenceReference,
    attestationReferences: input.attestations.map((item) => item.id).sort(),
    authorizationReference: input.authorization.authorityReference ?? input.authorization.id,
    requestedAction: input.request,
    evidenceAvailability: missingEvidence.length ? "insufficient" as const : staleAttestations.length || !independentCurrent ? "degraded" as const : "sufficient" as const,
    contradictions: contradictions.sort((left, right) => left.reasonCode.localeCompare(right.reasonCode) || left.id.localeCompare(right.id)),
    outcome,
    humanReviewRequired: ["require_human_approval", "pause"].includes(outcome),
    reasonCodes: normalizedReasons,
    missingEvidence: [...new Set(missingEvidence)].sort(),
    evidenceReferences,
    trustImpact: { priorState: input.previousDecision?.trustImpact.nextState ?? null, nextState, reasonCodes: normalizedReasons },
    decisionTimestamp: input.evaluatedAt,
    decisionVersion: "scope-continuity-decision-v1",
    policyId: input.policy.policyId,
    policyVersion: input.policy.policyVersion,
    correlationId: input.correlationId,
  };
  return { ...unsigned, decisionHash: hashCanonical(unsigned as unknown as Record<string, unknown>) };
}
