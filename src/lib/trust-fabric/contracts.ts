import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import { strongestAdverseState } from "./control-plane.ts";
import type { FabricTrustState, TrustContractEvaluation, TrustContractEvaluationInput, TrustContractOutcome } from "./types.ts";

const rank: Record<FabricTrustState, number> = { verified: 0, degraded: 1, contested: 2, suspended: 3, revoked: 4 };
const incidentRank = { none: 0, material: 1, critical: 2, emergency: 3 } as const;
const thresholdRank = { material: 1, critical: 2, emergency: 3 } as const;

export function evaluateTrustContract(input: TrustContractEvaluationInput): TrustContractEvaluation {
  const reasons: string[] = [];
  let outcome: TrustContractOutcome = "satisfied";
  const state = strongestAdverseState([input.identityState, input.authorityState, input.environmentState, input.scopeState]);
  if (input.contract.revocationState === "revoked" || input.authorityState === "revoked") {
    outcome = "revoked"; reasons.push(input.contract.revocationState === "revoked" ? "CONTRACT_REVOKED" : "AUTHORITY_REVOKED");
  } else if (new Date(input.evaluatedAt).getTime() >= new Date(input.contract.expiresAt).getTime()) {
    outcome = "breached"; reasons.push("CONTRACT_EXPIRED");
  } else {
    if (rank[input.identityState] > rank[input.contract.requiredIdentityState]) reasons.push("IDENTITY_REQUIREMENT_UNSATISFIED");
    if (!input.contract.requiredAuthority.every((authority) => input.effectiveAuthority.includes(authority))) reasons.push("AUTHORITY_REQUIREMENT_UNSATISFIED");
    if (rank[input.environmentState] > rank[input.contract.requiredEnvironmentState]) reasons.push("ENVIRONMENT_REQUIREMENT_UNSATISFIED");
    if (!input.requestedScope.every((scope) => input.contract.permittedScope.includes(scope))) reasons.push("SCOPE_OUTSIDE_CONTRACT");
    if (!input.activeProviders.every((provider) => input.contract.permittedProviders.includes(provider))) reasons.push("PROVIDER_OUTSIDE_CONTRACT");
    const types = new Set(input.evidence.map((item) => item.type));
    const missing = input.contract.requiredEvidenceTypes.filter((type) => !types.has(type));
    if (missing.length) reasons.push("REQUIRED_EVIDENCE_MISSING");
    const maximumAge = input.contract.maximumEvidenceAgeSeconds * 1000;
    if (input.evidence.some((item) => new Date(input.evaluatedAt).getTime() - new Date(item.observedAt).getTime() > maximumAge)) reasons.push("EVIDENCE_STALE");
    if (!input.contract.monitoringRequirements.every((item) => input.monitoring.includes(item))) reasons.push("MONITORING_REQUIREMENT_UNSATISFIED");
    if (incidentRank[input.highestIncidentSeverity] >= thresholdRank[input.contract.incidentThreshold]) reasons.push("INCIDENT_THRESHOLD_REACHED");
    if (input.contradictions.length) reasons.push("ACTIVE_CONTRADICTION");
    if (input.humanReviewRequired) reasons.push("HUMAN_REVIEW_REQUIRED");

    const breachReasons = ["IDENTITY_REQUIREMENT_UNSATISFIED", "AUTHORITY_REQUIREMENT_UNSATISFIED", "ENVIRONMENT_REQUIREMENT_UNSATISFIED", "SCOPE_OUTSIDE_CONTRACT", "PROVIDER_OUTSIDE_CONTRACT", "INCIDENT_THRESHOLD_REACHED"];
    if (reasons.some((reason) => breachReasons.includes(reason))) outcome = "breached";
    else if (reasons.includes("ACTIVE_CONTRADICTION") && input.contract.contradictionPolicy === "breach") outcome = "breached";
    else if (reasons.includes("ACTIVE_CONTRADICTION") && input.contract.contradictionPolicy === "pause") outcome = "paused";
    else if (reasons.includes("EVIDENCE_STALE")) outcome = "paused";
    else if (reasons.includes("HUMAN_REVIEW_REQUIRED") || (reasons.includes("ACTIVE_CONTRADICTION") && input.contract.contradictionPolicy === "review")) outcome = "review_required";
    else if (reasons.length) outcome = "satisfied_with_degraded_evidence";
  }
  const evidenceReferences = input.evidence.map((item) => item.reference);
  const digestInput = { contractId: input.contract.contractId, enterpriseId: input.contract.enterpriseId, outcome, trustState: state, reasonCodes: [...new Set(reasons)].sort(), evidenceReferences, evaluatedAt: input.evaluatedAt, correlationId: input.correlationId };
  const deterministicDigest = hashCanonical(digestInput);
  return { ...digestInput, evaluationId: deterministicUuid({ contractId: input.contract.contractId, deterministicDigest }), deterministicDigest };
}
