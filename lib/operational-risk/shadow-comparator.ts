import type { OriAuthoritativeDecision, OriComparisonCategory, OriInferenceOutput } from "./types.ts";

export function compareOriWithAuthoritativeDecision(
  inference: OriInferenceOutput | null,
  authoritativeDecision: OriAuthoritativeDecision
): OriComparisonCategory {
  if (!authoritativeDecision || ["insufficient_evidence", "insufficient evidence"].includes(authoritativeDecision)) {
    return "AUTHORITATIVE_DECISION_UNAVAILABLE";
  }
  if (!inference) return "NOT_COMPARABLE";
  if (inference.abstain || inference.recommendation === "ABSTAIN") return "ORI_ABSTAINED";
  const oriCautious = inference.recommendation === "STEP_UP" || inference.recommendation === "HUMAN_REVIEW";
  const authoritativeCautious = ["review", "step_up", "escalate", "block"].includes(authoritativeDecision);
  if (!oriCautious && !authoritativeCautious) return "AGREED_LOW_RISK";
  if (oriCautious && authoritativeCautious) return "AGREED_REVIEW";
  if (oriCautious) return "ORI_MORE_CAUTIONARY";
  if (authoritativeCautious) return "ORI_LESS_CAUTIONARY";
  return "NOT_COMPARABLE";
}
