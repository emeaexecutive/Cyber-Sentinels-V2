import { clampScore } from "../scoring/index.ts";
import type { TrustDimension } from "./TrustDimension.ts";

export type TrustExplanation = {
  overallScore: number;
  overallConfidence: number;
  evidenceCompleteness: number;
  evidenceUsed: string[];
  evidenceMissing: string[];
  riskIndicators: string[];
  recommendedActions: string[];
  explanation: string[];
};

export class TrustExplainer {
  explain(dimensions: TrustDimension[]): TrustExplanation {
    const weight = dimensions.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    const supportedWeight = dimensions
      .filter((item) => !item.evidenceMissing)
      .reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    const overallScore = weight
      ? clampScore(
          dimensions.reduce((sum, item) => sum + item.score * Math.max(0, item.weight), 0) /
            weight,
        )
      : 0;
    const overallConfidence = weight
      ? clampScore(
          dimensions.reduce(
            (sum, item) => sum + item.confidence * Math.max(0, item.weight),
            0,
          ) / weight,
        )
      : 0;
    const evidenceCompleteness = weight ? clampScore((supportedWeight / weight) * 100) : 0;
    const evidenceUsed = [...new Set(dimensions.flatMap((item) => item.evidenceIds))].sort();
    const evidenceMissing = dimensions
      .filter((item) => item.evidenceMissing)
      .map((item) => item.name);
    const riskIndicators = [...new Set(dimensions.flatMap((item) => item.riskIndicators))].sort();
    const recommendedActions = [
      ...new Set(dimensions.flatMap((item) => item.recommendedActions)),
    ];
    return {
      overallScore,
      overallConfidence,
      evidenceCompleteness,
      evidenceUsed,
      evidenceMissing,
      riskIndicators,
      recommendedActions,
      explanation: [
        `Overall Trust Score is ${overallScore}/100 from ${dimensions.length} weighted dimensions.`,
        `Confidence is ${overallConfidence}% and weighted evidence completeness is ${evidenceCompleteness}%.`,
        `${evidenceUsed.length} distinct evidence item(s) were used; ${evidenceMissing.length} dimension(s) are missing evidence.`,
        ...dimensions.map((item) => `${item.name}: ${item.reason}`),
      ],
    };
  }
}
