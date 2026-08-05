import { hashCanonical } from "../trust-core/hash.ts";
import type { ApprovedTrustAction, EnterpriseTrustPattern, TrustRecommendation } from "./types.ts";

export const approvedTrustActionCatalogue: readonly ApprovedTrustAction[] = [
  { actionType: "step_up_verification", policyReference: "policy:trust-learning-actions/1.0", description: "Require approved step-up verification before policy reevaluation." },
  { actionType: "request_additional_evidence", policyReference: "policy:trust-learning-actions/1.0", description: "Request evidence already defined by the applicable policy." },
  { actionType: "human_review", policyReference: "policy:trust-learning-actions/1.0", description: "Route the case to an authorized human reviewer." },
  { actionType: "provider_recheck", policyReference: "policy:trust-learning-actions/1.0", description: "Requery an approved provider through its existing adapter." },
  { actionType: "pause_workflow", policyReference: "policy:trust-learning-actions/1.0", description: "Request a policy-controlled workflow pause pending review." },
] as const;

const preferences: Record<string, ApprovedTrustAction["actionType"][]> = {
  authority: ["human_review", "request_additional_evidence", "pause_workflow"],
  provider: ["provider_recheck", "request_additional_evidence", "human_review"],
  evidence: ["request_additional_evidence", "step_up_verification", "human_review"],
  workflow: ["human_review", "step_up_verification", "pause_workflow"],
  outcome: ["human_review", "request_additional_evidence", "pause_workflow"],
};

function family(patternType: string) {
  if (/authority|delegation|scope|revocation/.test(patternType)) return "authority";
  if (/provider/.test(patternType)) return "provider";
  if (/evidence|integrity|attribution|identity/.test(patternType)) return "evidence";
  if (/outcome|cost|consumption|restoration/.test(patternType)) return "outcome";
  return "workflow";
}

export function recommendApprovedActions(pattern: EnterpriseTrustPattern, options: { aiGenerated?: boolean; modelReference?: string | null } = {}): TrustRecommendation[] {
  return preferences[family(pattern.patternType)].map((actionType, index) => {
    const approved = approvedTrustActionCatalogue.find((action) => action.actionType === actionType)!;
    const source = {
      approvedActionType: approved.actionType,
      rankingBasis: `Catalogue rank ${index + 1} for ${family(pattern.patternType)} patterns; reviewer and policy approval remain required.`,
      evidenceReferences: pattern.evidenceReferences,
      policyReference: approved.policyReference,
      uncertainty: pattern.uncertainty,
      reviewerRequired: true as const,
      aiGenerated: options.aiGenerated ?? false,
      modelReference: options.modelReference ?? null,
      executable: false as const,
    };
    return { ...source, digest: hashCanonical(source) };
  });
}
