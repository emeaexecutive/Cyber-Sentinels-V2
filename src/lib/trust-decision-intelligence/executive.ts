import { evaluateTrustDecisionHealth } from "./health.ts";
import type { CanonicalTrustDecision, CitedStatement, ExecutiveAudience, ExecutiveDecisionReport } from "./types.ts";

export function buildExecutiveDecisionReport(input: {
  decision: CanonicalTrustDecision;
  audience: ExecutiveAudience;
  recommendedNextActions: CitedStatement[];
  asOf?: string;
}): ExecutiveDecisionReport {
  const evidenceIds = new Set(input.decision.supportingEvidence.map((item) => item.evidenceId));
  for (const action of input.recommendedNextActions) {
    if (!action.text.trim() || !action.evidenceIds.length || action.evidenceIds.some((id) => !evidenceIds.has(id))) {
      throw new TypeError("Executive recommendations must be non-empty and grounded in preserved evidence.");
    }
  }
  return {
    audience: input.audience,
    decisionId: input.decision.decisionId,
    health: evaluateTrustDecisionHealth(input.decision, input.asOf).state,
    whatHappened: input.decision.decisionOutcome.effect,
    why: input.decision.explanation.why,
    businessImpact: input.decision.businessContext.impact,
    operationalImpact: input.decision.operationalContext.impact,
    remainingUncertainty: input.decision.knownUnknowns.filter((item) => item.resolutionState === "OPEN"),
    recommendedNextActions: input.recommendedNextActions,
    replayReference: input.decision.replayReference,
    generatedFromEvidenceOnly: true,
  };
}
export function buildExecutiveMode(input: {
  decision: CanonicalTrustDecision;
  recommendedNextActions: CitedStatement[];
  asOf?: string;
}): Record<ExecutiveAudience, ExecutiveDecisionReport> {
  const audiences: ExecutiveAudience[] = ["BOARD", "CEO", "CISO", "AUDIT", "LEGAL", "RISK", "OPERATIONS", "FINANCE"];
  return Object.fromEntries(audiences.map((audience) => [audience, buildExecutiveDecisionReport({ ...input, audience })])) as Record<ExecutiveAudience, ExecutiveDecisionReport>;
}
