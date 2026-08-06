import { evaluateTrustDecisionHealth } from "./health.ts";
import type { CanonicalReference, CanonicalTrustDecision, ExecutiveDecisionReport } from "./types.ts";

export type DesignPartnerStage = {
  stage: "CANDIDATE" | "IDENTITY" | "AUTHORITY" | "EVIDENCE" | "DECISION" | "REPLAY" | "TRUST_MEMORY" | "TRUST_JOURNEY" | "RECOVERY" | "EXECUTIVE_SUMMARY";
  status: "PRESERVED" | "NOT_RECORDED";
  reference: CanonicalReference | null;
};

export function buildDesignPartnerDemonstration(decision: CanonicalTrustDecision, executiveReport: ExecutiveDecisionReport): DesignPartnerStage[] {
  const firstEvidence = decision.supportingEvidence[0]?.canonicalReference ?? null;
  return [
    { stage: "CANDIDATE", status: "PRESERVED", reference: decision.trustObjectReference },
    { stage: "IDENTITY", status: firstEvidence ? "PRESERVED" : "NOT_RECORDED", reference: firstEvidence },
    { stage: "AUTHORITY", status: "PRESERVED", reference: decision.authorityLineageReference },
    { stage: "EVIDENCE", status: "PRESERVED", reference: decision.evidenceGraphReference },
    { stage: "DECISION", status: "PRESERVED", reference: { system: "TRUST_FABRIC", id: decision.decisionId, version: decision.schemaVersion } },
    { stage: "REPLAY", status: "PRESERVED", reference: decision.replayReference },
    { stage: "TRUST_MEMORY", status: "PRESERVED", reference: decision.trustMemoryReference },
    { stage: "TRUST_JOURNEY", status: "PRESERVED", reference: decision.journeyReference },
    { stage: "RECOVERY", status: decision.recoveryReference ? "PRESERVED" : "NOT_RECORDED", reference: decision.recoveryReference },
    { stage: "EXECUTIVE_SUMMARY", status: "PRESERVED", reference: { system: "TRUST_FABRIC", id: `${executiveReport.decisionId}:${executiveReport.audience}` } },
  ];
}

export type InvestorDecisionDemonstration = {
  retainedDecisions: number;
  replayLinked: number;
  reviewerEnriched: number;
  recovered: number;
  cumulativeEvidenceItems: number;
  cumulativeEvolutionEvents: number;
  compoundingMechanism: string;
  modelIndependence: string;
};

export function buildInvestorDecisionDemonstration(decisions: CanonicalTrustDecision[]): InvestorDecisionDemonstration {
  return {
    retainedDecisions: decisions.length,
    replayLinked: decisions.filter((decision) => Boolean(decision.replayReference.id)).length,
    reviewerEnriched: decisions.filter((decision) => Boolean(decision.humanReviewer)).length,
    recovered: decisions.filter((decision) => evaluateTrustDecisionHealth(decision).state === "RECOVERED").length,
    cumulativeEvidenceItems: new Set(decisions.flatMap((decision) => decision.supportingEvidence.map((item) => item.evidenceId))).size,
    cumulativeEvolutionEvents: decisions.reduce((total, decision) => total + decision.evolution.length, 0),
    compoundingMechanism: "Each preserved decision adds attributable evidence, policy, authority, reviewer, replay and outcome context to enterprise-owned operational history.",
    modelIndependence: "The asset remains valuable if foundation models are free because the scarce capability is the enterprise's governed, replayable and attributable decision history, not access to a model.",
  };
}
