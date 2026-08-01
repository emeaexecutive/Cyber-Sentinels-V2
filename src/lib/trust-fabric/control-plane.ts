import { hashCanonical, deterministicUuid } from "../trust-core/hash.ts";
import type {
  EnterpriseTrustObject, FabricReference, FabricTrustState, TrustFabricDecisionEnvelope,
  TrustFabricEvaluation, TrustFabricEvaluationInput, FabricDecisionType,
} from "./types.ts";

const rank: Record<FabricTrustState, number> = { verified: 0, degraded: 1, contested: 2, suspended: 3, revoked: 4 };
export function strongestAdverseState(states: FabricTrustState[]): FabricTrustState {
  return states.reduce((strongest, state) => rank[state] > rank[strongest] ? state : strongest, "verified");
}

function unique<T>(values: T[], key: (value: T) => string): T[] {
  return [...new Map(values.map((value) => [key(value), value])).values()];
}

function actionsFor(state: FabricTrustState, review: boolean): string[] {
  if (state === "revoked") return ["prevent further operation", "preserve evidence", "notify the accountable authority"];
  if (state === "suspended") return ["pause the workflow", "preserve evidence", "open human review"];
  if (state === "contested") return ["restrict the workflow", "resolve contradictions", "open human review"];
  if (state === "degraded") return ["collect missing or stale evidence", ...(review ? ["complete human review"] : [])];
  return review ? ["complete required human review"] : ["continue continuous monitoring"];
}

export function evaluateEnterpriseTrust(input: TrustFabricEvaluationInput): TrustFabricEvaluation {
  const componentStates = [input.identity.state, input.authority.state, input.environment.state, input.scope.state, input.continuousTrust.state, ...input.providers.map((provider) => provider.state), ...input.contradictions.map((item) => item.state), ...input.incidents.map((item) => item.state)];
  if (input.evidenceCompleteness !== "complete") componentStates.push("degraded");
  if (!input.environment.consistent || !input.scope.continuous) componentStates.push("contested");
  const currentTrustState = strongestAdverseState(componentStates);
  const decisions = [input.identity, input.authority, input.environment, input.scope, input.continuousTrust, ...input.providers];
  const reasonCodes = [...new Set([
    ...decisions.flatMap((decision) => decision.reasonCodes),
    ...input.contradictions.map((item) => item.reasonCode),
    ...input.incidents.flatMap((item) => item.reasonCodes),
    ...(input.evidenceCompleteness === "complete" ? [] : [`EVIDENCE_${input.evidenceCompleteness.toUpperCase()}`]),
    ...(!input.environment.consistent ? ["ENVIRONMENT_INCONSISTENT"] : []),
    ...(!input.scope.continuous ? ["SCOPE_CONTINUITY_BROKEN"] : []),
  ])].sort();
  const evidenceReferences = unique([
    ...decisions.flatMap((decision) => decision.evidenceReferences),
    ...input.contradictions.flatMap((item) => item.evidenceReferences),
    ...input.incidents.flatMap((item) => item.evidenceReferences),
    ...input.reviewerDecisions.flatMap((item) => item.evidenceReferences),
  ], (reference) => `${reference.type}:${reference.id}:${reference.version ?? ""}`);
  const requiredReviews = input.reviewerDecisions.filter((decision) => decision.reviewRequired);
  const contradictionState = input.contradictions.length ? strongestAdverseState(input.contradictions.map((item) => item.state)) : null;
  const incidentState = input.incidents.length ? strongestAdverseState(input.incidents.map((item) => item.state)) : null;
  const trustObject: EnterpriseTrustObject = {
    enterpriseId: input.enterpriseId, subject: input.subject, identityState: input.identity.state,
    authorityState: input.authority.state, environmentState: input.environment.state, scopeState: input.scope.state,
    evidenceCompleteness: input.evidenceCompleteness, currentTrustState,
    trustDnaProfileReference: input.trustDnaProfileReference ?? null,
    continuousTrustStateReference: input.continuousTrust.decisionReference ?? null,
    contradictionSummary: { count: input.contradictions.length, highestState: contradictionState, references: input.contradictions.map((item) => ({ type: "contradiction", id: item.id })) },
    activeReviewSummary: { count: requiredReviews.length, required: requiredReviews.length > 0, references: requiredReviews.map((item) => ({ type: "review", id: item.id })) },
    incidentSummary: { count: input.incidents.length, highestState: incidentState, references: input.incidents.map((item) => ({ type: "incident", id: item.id })) },
    replayReference: input.replayReference ?? null, trustMemoryReference: input.trustMemoryReference ?? null,
    evidenceGraphNodeReference: input.evidenceGraphNodeReference ?? null, lastEvaluatedAt: input.evaluatedAt,
    policyVersion: input.policy.version, correlationId: input.correlationId,
  };
  return {
    trustObject, currentTrustState, authorityState: input.authority.state,
    environmentConsistency: input.environment.consistent ? "consistent" : "inconsistent",
    scopeContinuityState: input.scope.state, evidenceCompleteness: input.evidenceCompleteness,
    activeContradictions: input.contradictions, activeIncidents: input.incidents, requiredReviews,
    recommendedOperationalActions: actionsFor(currentTrustState, requiredReviews.length > 0), reasonCodes,
    evidenceReferences, replayReference: input.replayReference ?? null, trustMemoryReference: input.trustMemoryReference ?? null,
    legalDecisionReference: input.legalDecisionReference ?? null,
  };
}

export function createDecisionEnvelope(input: Omit<TrustFabricDecisionEnvelope, "decisionId" | "deterministicDigest"> & { decisionType: FabricDecisionType }): TrustFabricDecisionEnvelope {
  if (input.decisionType === "legal_reference" && !input.legalDecisionReference) throw new TypeError("Legal decisions must be externally referenced.");
  const canonical = { ...input, reasonCodes: [...new Set(input.reasonCodes)].sort(), evidenceReferences: unique(input.evidenceReferences, (item: FabricReference) => `${item.type}:${item.id}:${item.version ?? ""}`) };
  const deterministicDigest = hashCanonical(canonical);
  return { ...canonical, decisionId: deterministicUuid({ deterministicDigest, enterpriseId: input.enterpriseId, decisionType: input.decisionType }), deterministicDigest };
}
