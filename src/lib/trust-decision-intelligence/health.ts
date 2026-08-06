import { validateCanonicalTrustDecision } from "./object.ts";
import type { CanonicalTrustDecision, TrustDecisionHealth } from "./types.ts";

export type TrustDecisionHealthAssessment = {
  state: TrustDecisionHealth;
  assessedAt: string;
  reasons: string[];
  decisionId: string;
};

export function evaluateTrustDecisionHealth(
  decision: CanonicalTrustDecision,
  asOf = new Date().toISOString(),
): TrustDecisionHealthAssessment {
  const assessedAt = new Date(asOf).toISOString();
  try {
    validateCanonicalTrustDecision(decision);
  } catch (error) {
    return {
      state: "INCOMPLETE",
      assessedAt,
      reasons: [error instanceof Error ? error.message : "The decision record is incomplete."],
      decisionId: String(decision?.decisionId ?? "not-recorded"),
    };
  }
  if (decision.supersededDecision) return { state: "SUPERSEDED", assessedAt, reasons: [`Superseded by ${decision.supersededDecision.id}.`], decisionId: decision.decisionId };
  if (decision.decisionOutcome.expiresAt && Date.parse(decision.decisionOutcome.expiresAt) <= Date.parse(assessedAt)) return { state: "EXPIRED", assessedAt, reasons: [`Outcome expired at ${decision.decisionOutcome.expiresAt}.`], decisionId: decision.decisionId };
  if (decision.decisionOutcome.state === "PENDING") return { state: "PENDING", assessedAt, reasons: ["The enterprise outcome remains pending."], decisionId: decision.decisionId };

  const later = decision.evolution.slice(1);
  const contradictions = later.filter((entry) => entry.contradictsOriginal || entry.stage === "CORRECTION" && entry.resultingDecisionType && entry.resultingDecisionType !== decision.decisionType);
  if (contradictions.length) return { state: "CONTRADICTED", assessedAt, reasons: contradictions.map((entry) => entry.summary.text), decisionId: decision.decisionId };
  const recoveries = later.filter((entry) => entry.stage === "RECOVERY");
  if (decision.recoveryReference || recoveries.length) return { state: "RECOVERED", assessedAt, reasons: recoveries.map((entry) => entry.summary.text).concat(decision.recoveryReference ? [`Recovery reference ${decision.recoveryReference.id} is preserved.`] : []), decisionId: decision.decisionId };
  if (later.some((entry) => entry.stage !== "FINAL_ENTERPRISE_OUTCOME" || entry.resultingDecisionType && entry.resultingDecisionType !== decision.decisionType)) return { state: "CHANGED", assessedAt, reasons: later.map((entry) => entry.summary.text), decisionId: decision.decisionId };
  return { state: "STABLE", assessedAt, reasons: ["No correction, contradiction, recovery, expiry or supersession is recorded."], decisionId: decision.decisionId };
}
