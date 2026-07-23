import type { EvidenceNode } from "../evidence/index.ts";
import type { TrustProfile } from "../dna/index.ts";
import { weightedScore } from "../scoring/index.ts";

export type HumanOverride = {
  actorId: string;
  decision: "APPROVE" | "DENY" | "REVIEW";
  reason: string;
  occurredAt: string;
} | null;

export type TrustDecision = {
  decision: "TRUST" | "CHALLENGE" | "DENY" | "REVIEW";
  confidence: number;
  evidenceUsed: string[];
  evidenceMissing: string[];
  risk: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
  recommendations: string[];
  humanOverride: HumanOverride;
  explanation: string[];
};

export class DecisionIntelligenceEngine {
  explain(
    profile: TrustProfile,
    evidence: EvidenceNode[],
    humanOverride: HumanOverride = null,
  ): TrustDecision {
    const supported = profile.dimensions.filter((dimension) => dimension.confidence > 0);
    const score = weightedScore(
      supported.map((dimension) => ({
        score: dimension.score,
        confidence: dimension.confidence / 100,
        weight: dimension.weight,
      })),
    );
    const evidenceUsed = [...new Set(supported.flatMap((dimension) => dimension.evidenceIds))].sort();
    const evidenceMissing = profile.dimensions
      .filter((dimension) => dimension.confidence === 0)
      .map((dimension) => dimension.name);
    const revoked = evidence.some((item) => item.status === "REVOKED");
    const rejected = evidence.some((item) => item.status === "REJECTED");
    let decision: TrustDecision["decision"] =
      revoked || rejected || score < 35
        ? "DENY"
        : score < 60 || profile.overallConfidence < 50
          ? "CHALLENGE"
          : evidenceMissing.length > 5
            ? "REVIEW"
            : "TRUST";
    if (humanOverride) {
      decision =
        humanOverride.decision === "APPROVE"
          ? "TRUST"
          : humanOverride.decision === "DENY"
            ? "DENY"
            : "REVIEW";
    }
    return {
      decision,
      confidence: profile.overallConfidence,
      evidenceUsed,
      evidenceMissing,
      risk: profile.riskBand === "INSUFFICIENT_EVIDENCE" ? "UNKNOWN" : profile.riskBand,
      recommendations: [
        ...(evidenceMissing.length ? [`Collect evidence for: ${evidenceMissing.join(", ")}.`] : []),
        ...(decision === "CHALLENGE" ? ["Require step-up verification."] : []),
        ...(decision === "DENY" ? ["Route to accountable human review before restoring trust."] : []),
      ],
      humanOverride,
      explanation: [
        ...profile.explanation,
        `Decision ${decision} is based on ${evidenceUsed.length} evidence item(s) and ${evidenceMissing.length} missing dimension(s).`,
        ...(humanOverride ? [`Human override by ${humanOverride.actorId}: ${humanOverride.reason}`] : []),
      ],
    };
  }
}
