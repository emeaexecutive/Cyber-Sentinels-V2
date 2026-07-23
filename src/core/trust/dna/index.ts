import type { EvidenceKind, EvidenceNode } from "../evidence/index.ts";
import { clampScore, confidencePercent, weightedScore } from "../scoring/index.ts";

export const trustDimensionNames = [
  "IDENTITY",
  "DEVICE",
  "BEHAVIOUR",
  "LOCATION",
  "DOCUMENT",
  "COMMUNICATION",
  "ENTERPRISE",
  "HISTORICAL",
  "AI",
  "HUMAN",
] as const;
export type TrustDimensionName = (typeof trustDimensionNames)[number];

export type TrustHistory = {
  score: number;
  confidence: number;
  reason: string;
  recordedAt: string;
};

export type TrustDimension = {
  name: TrustDimensionName;
  score: number;
  confidence: number;
  weight: number;
  reasons: string[];
  evidenceIds: string[];
  history: TrustHistory[];
};

export type TrustVector = Record<TrustDimensionName, number>;

export type TrustProfile = {
  profileId: string;
  tenantId: string;
  identityId: string;
  dimensions: TrustDimension[];
  vector: TrustVector;
  overallConfidence: number;
  riskBand: "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_EVIDENCE";
  explanation: string[];
  generatedAt: string;
};

const weights: Record<TrustDimensionName, number> = {
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

const kindDimensions: Record<EvidenceKind, TrustDimensionName[]> = {
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

function evidenceScore(node: EvidenceNode, now: number): number {
  if (node.status === "REVOKED" || node.status === "REJECTED") return 0;
  if (node.status === "INCONCLUSIVE") return 35;
  if (node.status === "EXPIRED" || (node.validUntil && Date.parse(node.validUntil) <= now)) return 20;
  return 100;
}

export class TrustDNAEngine {
  build(
    input: {
      profileId: string;
      tenantId: string;
      identityId: string;
      evidence: EvidenceNode[];
      generatedAt?: string;
      priorDimensions?: Partial<Record<TrustDimensionName, TrustHistory[]>>;
    },
  ): TrustProfile {
    const generatedAt = new Date(input.generatedAt ?? Date.now()).toISOString();
    const now = Date.parse(generatedAt);
    const tenantEvidence = input.evidence.filter(
      (item) => item.tenantId === input.tenantId && item.identityId === input.identityId,
    );
    const dimensions = trustDimensionNames.map((name): TrustDimension => {
      const evidence = tenantEvidence.filter((item) => kindDimensions[item.kind].includes(name));
      const score = evidence.length
        ? weightedScore(
            evidence.map((item) => ({
              score: evidenceScore(item, now),
              confidence: item.confidence,
              weight: 1,
            })),
          )
        : 0;
      const confidence = evidence.length
        ? confidencePercent(evidence.map((item) => ({ score: 0, confidence: item.confidence, weight: 1 })))
        : 0;
      const reasons = evidence.length
        ? evidence.map((item) => `${item.kind}:${item.status}:${item.source}`)
        : ["EVIDENCE_MISSING"];
      return {
        name,
        score,
        confidence,
        weight: weights[name],
        reasons: [...new Set(reasons)],
        evidenceIds: evidence.map((item) => item.id).sort(),
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
    const weighted = weightedScore(
      supported.map((item) => ({
        score: item.score,
        confidence: item.confidence / 100,
        weight: item.weight,
      })),
    );
    const vector = Object.fromEntries(
      dimensions.map((item) => [item.name, clampScore(item.score)]),
    ) as TrustVector;
    const riskBand = !supported.length
      ? "INSUFFICIENT_EVIDENCE"
      : weighted >= 75
        ? "LOW"
        : weighted >= 50
          ? "MODERATE"
          : "HIGH";
    return {
      profileId: input.profileId,
      tenantId: input.tenantId,
      identityId: input.identityId,
      dimensions,
      vector,
      overallConfidence,
      riskBand,
      explanation: dimensions
        .filter((item) => item.confidence > 0)
        .map((item) => `${item.name} is ${item.score} with ${item.confidence}% confidence because ${item.reasons.join("; ")}.`),
      generatedAt,
    };
  }
}
