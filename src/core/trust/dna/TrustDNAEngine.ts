import type { EvidenceKind, EvidenceNode } from "../evidence/index.ts";
import { clampScore, confidencePercent, weightedScore } from "../scoring/index.ts";
import type { TrustEntityType } from "../types/index.ts";
import { TrustCalculator } from "./TrustCalculator.ts";
import {
  legacyTrustDimensionNames,
  type LegacyTrustDimensionName,
  type TrustDimension,
} from "./TrustDimension.ts";
import { TrustExplainer } from "./TrustExplainer.ts";
import type {
  TrustDNACalculationInput,
  TrustProfile,
  TrustRiskBand,
  TrustVector,
} from "./TrustProfile.ts";

const legacyWeights: Record<LegacyTrustDimensionName, number> = {
  IDENTITY: 1,
  DEVICE: 0.75,
  BEHAVIOUR: 0.7,
  LOCATION: 0.55,
  DOCUMENT: 0.9,
  COMMUNICATION: 0.65,
  ENTERPRISE: 0.8,
  HISTORICAL: 0.7,
  AI: 0.8,
  HUMAN: 0.8,
};

const legacyKindDimensions: Record<EvidenceKind, LegacyTrustDimensionName[]> = {
  HUMAN: ["IDENTITY", "HUMAN"],
  PASSPORT: ["IDENTITY", "DOCUMENT", "HUMAN"],
  DRIVING_LICENCE: ["IDENTITY", "DOCUMENT", "HUMAN"],
  EMAIL: ["COMMUNICATION", "IDENTITY"],
  PHONE: ["COMMUNICATION", "IDENTITY"],
  CORPORATE_DOMAIN: ["ENTERPRISE", "COMMUNICATION"],
  DEVICE: ["DEVICE"],
  LOCATION: ["LOCATION", "BEHAVIOUR"],
  VPN: ["LOCATION", "DEVICE"],
  BROWSER: ["DEVICE", "BEHAVIOUR"],
  BIOMETRIC: ["IDENTITY", "HUMAN"],
  LIVENESS: ["IDENTITY", "HUMAN"],
  DEEPFAKE_ANALYSIS: ["HUMAN", "AI"],
  AI_AGENT: ["AI", "IDENTITY"],
  ENTERPRISE_POLICY: ["ENTERPRISE"],
  MANUAL_REVIEW: ["HISTORICAL", "ENTERPRISE"],
  RISK_DECISION: ["HISTORICAL", "BEHAVIOUR"],
};

function legacyEvidenceScore(node: EvidenceNode, now: number): number {
  if (node.status === "REVOKED" || node.status === "REJECTED") return 0;
  if (node.status === "INCONCLUSIVE") return 35;
  if (node.status === "EXPIRED" || (node.validUntil && Date.parse(node.validUntil) <= now)) return 20;
  return 100;
}

function riskBand(score: number, confidence: number): TrustRiskBand {
  if (confidence === 0) return "INSUFFICIENT_EVIDENCE";
  if (score >= 75) return "LOW";
  if (score >= 50) return "MODERATE";
  return "HIGH";
}

export class TrustDNAEngine {
  private readonly calculator: TrustCalculator;
  private readonly explainer: TrustExplainer;

  constructor(
    calculator = new TrustCalculator(),
    explainer = new TrustExplainer(),
  ) {
    this.calculator = calculator;
    this.explainer = explainer;
  }

  calculate(input: TrustDNACalculationInput): TrustProfile {
    if (input.entity.tenantId !== input.tenantId) {
      throw new TypeError("Trust DNA entity must belong to the requested tenant.");
    }
    const calculatedAt = new Date(input.calculatedAt ?? Date.now()).toISOString();
    const tenantEvidence = input.evidence.filter(
      (item) => item.tenantId === input.tenantId && item.entityId === input.entity.id,
    );
    const tenantSources = (input.sources ?? []).filter(
      (item) => item.tenantId === input.tenantId,
    );
    const dimensions = this.calculator.calculate(
      input.entity,
      tenantEvidence,
      tenantSources,
      calculatedAt,
    );
    const explained = this.explainer.explain(dimensions);
    const version = (input.previousProfile?.version ?? 0) + 1;
    const profile: TrustProfile = {
      profileId: input.profileId,
      tenantId: input.tenantId,
      entityId: input.entity.id,
      identityId: input.entity.id,
      entityType: input.entity.entityType,
      profileVersion: "trust-dna-v2",
      version,
      overallScore: explained.overallScore,
      overallConfidence: explained.overallConfidence,
      evidenceCompleteness: explained.evidenceCompleteness,
      dimensions,
      dimensionBreakdown: dimensions,
      vector: Object.fromEntries(
        dimensions.map((item) => [item.name, clampScore(item.score)]),
      ) as TrustVector,
      evidenceUsed: explained.evidenceUsed,
      evidenceMissing: explained.evidenceMissing,
      riskIndicators: explained.riskIndicators,
      recommendedActions: explained.recommendedActions,
      riskBand: riskBand(explained.overallScore, explained.overallConfidence),
      explanation: explained.explanation,
      generatedAt: calculatedAt,
      lastRecalculated: calculatedAt,
    };
    return profile;
  }

  recalculate(input: TrustDNACalculationInput): TrustProfile {
    return this.calculate(input);
  }

  build(input: {
    profileId: string;
    tenantId: string;
    identityId: string;
    evidence: EvidenceNode[];
    generatedAt?: string;
    priorDimensions?: Partial<
      Record<
        LegacyTrustDimensionName,
        { score: number; confidence: number; reason: string; recordedAt: string }[]
      >
    >;
  }): TrustProfile {
    const generatedAt = new Date(input.generatedAt ?? Date.now()).toISOString();
    const now = Date.parse(generatedAt);
    const tenantEvidence = input.evidence.filter(
      (item) => item.tenantId === input.tenantId && item.identityId === input.identityId,
    );
    const dimensions = legacyTrustDimensionNames.map((name): TrustDimension => {
      const evidence = tenantEvidence.filter((item) =>
        legacyKindDimensions[item.kind].includes(name),
      );
      const score = evidence.length
        ? weightedScore(
            evidence.map((item) => ({
              score: legacyEvidenceScore(item, now),
              confidence: item.confidence,
              weight: 1,
            })),
          )
        : 0;
      const confidence = evidence.length
        ? confidencePercent(
            evidence.map((item) => ({ score: 0, confidence: item.confidence, weight: 1 })),
          )
        : 0;
      const reasons = evidence.length
        ? evidence.map((item) => `${item.kind}:${item.status}:${item.source}`)
        : ["EVIDENCE_MISSING"];
      return {
        name,
        score,
        confidence,
        weight: legacyWeights[name],
        reason: reasons.join(", "),
        reasons: [...new Set(reasons)],
        lastUpdated: generatedAt,
        evidenceIds: evidence.map((item) => item.id).sort(),
        evidenceMissing: evidence.length === 0,
        riskIndicators: evidence.length ? [] : [`${name}_EVIDENCE_MISSING`],
        recommendedActions: evidence.length ? [] : [`Collect evidence for ${name}.`],
        history: [
          ...(input.priorDimensions?.[name] ?? []),
          { score, confidence, reason: reasons.join(", "), recordedAt: generatedAt },
        ].slice(-100),
      };
    });
    const supported = dimensions.filter((item) => item.confidence > 0);
    const overallConfidence = confidencePercent(
      dimensions.map((item) => ({
        score: item.score,
        confidence: item.confidence / 100,
        weight: item.weight,
      })),
    );
    const overallScore = weightedScore(
      supported.map((item) => ({
        score: item.score,
        confidence: item.confidence / 100,
        weight: item.weight,
      })),
    );
    const vector = Object.fromEntries(
      dimensions.map((item) => [item.name, clampScore(item.score)]),
    ) as TrustVector;
    const evidenceUsed = [...new Set(dimensions.flatMap((item) => item.evidenceIds))].sort();
    const evidenceMissing = dimensions
      .filter((item) => item.evidenceMissing)
      .map((item) => item.name);
    const totalWeight = dimensions.reduce((sum, item) => sum + item.weight, 0);
    const supportedWeight = supported.reduce((sum, item) => sum + item.weight, 0);
    const entityType: TrustEntityType = "IDENTITY";
    return {
      profileId: input.profileId,
      tenantId: input.tenantId,
      entityId: input.identityId,
      identityId: input.identityId,
      entityType,
      profileVersion: "trust-dna-v1",
      version: 1,
      overallScore,
      overallConfidence,
      evidenceCompleteness: totalWeight ? clampScore((supportedWeight / totalWeight) * 100) : 0,
      dimensions,
      dimensionBreakdown: dimensions,
      vector,
      evidenceUsed,
      evidenceMissing,
      riskIndicators: [],
      recommendedActions: evidenceMissing.map((name) => `Collect evidence for ${name}.`),
      riskBand: riskBand(overallScore, overallConfidence),
      explanation: dimensions
        .filter((item) => item.confidence > 0)
        .map(
          (item) =>
            `${item.name} is ${item.score} with ${item.confidence}% confidence because ${item.reasons.join("; ")}.`,
        ),
      generatedAt,
      lastRecalculated: generatedAt,
    };
  }
}
