import { clampScore } from "../scoring/index.ts";
import type { TrustEntity, TrustEvidence, TrustSource } from "../types/index.ts";
import {
  enterpriseTrustDimensionNames,
  type EnterpriseTrustDimensionName,
  type TrustDimension,
} from "./TrustDimension.ts";
import { trustWeightsFor } from "./TrustWeight.ts";

const evidenceMatchers: Record<EnterpriseTrustDimensionName, RegExp> = {
  IDENTITY: /identity|human|biometric|liveness|kyc|passport|document/i,
  DOCUMENTS: /document|passport|licen[cs]e|credential|certificate/i,
  EMAIL: /email|mailbox|domain/i,
  PHONE: /phone|mobile|sms|telecom/i,
  DEVICE: /device|browser|hardware|endpoint|fingerprint/i,
  LOCATION: /location|geo|country|region|travel/i,
  BEHAVIOUR: /behavio|activity|session|interaction|anomaly|risk_decision/i,
  NETWORK: /network|vpn|proxy|ip_|ip$|asn|connection/i,
  ENTERPRISE: /enterprise|organisation|organization|employment|corporate|policy/i,
  HISTORICAL: /history|historical|manual_review|audit|prior|decision/i,
  AI_BEHAVIOUR: /ai_|ai agent|model|prompt|autonomy|deepfake|agent/i,
  PROVIDER_CONFIDENCE: /.*/,
};

const negativeStatuses = new Set(["REJECTED", "REVOKED", "FAILED", "INVALID", "DENIED", "FRAUD"]);
const uncertainStatuses = new Set(["INCONCLUSIVE", "PENDING", "UNKNOWN", "REVIEW"]);
const positiveStatuses = new Set(["VALID", "VERIFIED", "PASSED", "APPROVED", "TRUSTED", "ACTIVE"]);

function statusOf(evidence: TrustEvidence): string {
  return String(evidence.metadata.status ?? evidence.metadata.result ?? "").trim().toUpperCase();
}

function scoreOf(evidence: TrustEvidence): number {
  const explicit = Number(evidence.metadata.score);
  if (Number.isFinite(explicit)) return clampScore(explicit);
  const status = statusOf(evidence);
  if (negativeStatuses.has(status)) return 0;
  if (uncertainStatuses.has(status)) return 45;
  if (positiveStatuses.has(status) || evidence.metadata.verified === true) return 100;
  if (evidence.metadata.verified === false) return 20;
  return clampScore(50 + Math.max(0, Math.min(1, evidence.confidence)) * 50);
}

function providerFactor(provider: string, sources: TrustSource[]): number {
  const source = sources.find((item) => item.provider === provider);
  if (!source) return 0.85;
  if (source.health === "HEALTHY") return 1;
  if (source.health === "DEGRADED") return 0.7;
  if (source.health === "UNAVAILABLE" || source.health === "MISCONFIGURED") return 0.25;
  return 0.6;
}

function label(dimension: EnterpriseTrustDimensionName): string {
  return dimension.replaceAll("_", " ").toLowerCase();
}

export class TrustCalculator {
  calculate(
    entity: TrustEntity,
    evidence: TrustEvidence[],
    sources: TrustSource[],
    calculatedAt: string,
  ): TrustDimension[] {
    const weights = Object.fromEntries(
      trustWeightsFor(entity.entityType).map((item) => [item.dimension, item.weight]),
    ) as Record<EnterpriseTrustDimensionName, number>;

    return enterpriseTrustDimensionNames.map((name): TrustDimension => {
      const matched = evidence.filter((item) =>
        name === "PROVIDER_CONFIDENCE"
          ? Boolean(item.provider)
          : evidenceMatchers[name].test(`${item.evidenceType} ${item.source}`),
      );
      if (!matched.length) {
        const dimensionLabel = label(name);
        return {
          name,
          score: 0,
          confidence: 0,
          weight: weights[name],
          reason: `No current ${dimensionLabel} evidence is available.`,
          reasons: ["EVIDENCE_MISSING"],
          lastUpdated: calculatedAt,
          evidenceIds: [],
          evidenceMissing: true,
          riskIndicators: [`${name}_EVIDENCE_MISSING`],
          recommendedActions: [`Collect or refresh ${dimensionLabel} evidence.`],
          history: [],
        };
      }

      const weightedConfidence = matched.map((item) =>
        Math.max(0, Math.min(1, item.confidence)) * providerFactor(item.provider, sources),
      );
      const confidenceTotal = weightedConfidence.reduce((sum, value) => sum + value, 0);
      const score = confidenceTotal
        ? clampScore(
            matched.reduce(
              (sum, item, index) => sum + scoreOf(item) * weightedConfidence[index],
              0,
            ) / confidenceTotal,
          )
        : 0;
      const confidence = clampScore((confidenceTotal / matched.length) * 100);
      const types = [...new Set(matched.map((item) => item.evidenceType))].sort();
      const negative = matched.filter((item) => negativeStatuses.has(statusOf(item)));
      const unavailableProviders = [
        ...new Set(
          matched
            .filter((item) => providerFactor(item.provider, sources) <= 0.25)
            .map((item) => item.provider),
        ),
      ];
      const riskIndicators = [
        ...negative.map((item) => `${name}_${statusOf(item) || "NEGATIVE"}`),
        ...unavailableProviders.map((provider) => `PROVIDER_UNAVAILABLE:${provider}`),
        ...(score < 50 ? [`${name}_LOW_SCORE`] : []),
      ];
      const reason = `${matched.length} evidence item(s) (${types.join(", ")}) produce a ${score} score with ${confidence}% confidence.`;
      return {
        name,
        score,
        confidence,
        weight: weights[name],
        reason,
        reasons: [
          reason,
          ...matched.map((item) => `${item.evidenceType}:${statusOf(item) || "OBSERVED"}:${item.provider}`),
        ],
        lastUpdated: matched
          .map((item) => item.createdAt)
          .sort((left, right) => right.localeCompare(left))[0] ?? calculatedAt,
        evidenceIds: matched.map((item) => item.id).sort(),
        evidenceMissing: false,
        riskIndicators: [...new Set(riskIndicators)].sort(),
        recommendedActions: [
          ...(negative.length ? [`Review ${negative.length} negative ${label(name)} result(s).`] : []),
          ...(unavailableProviders.length
            ? [`Restore provider availability: ${unavailableProviders.join(", ")}.`]
            : []),
          ...(score < 50 ? [`Require accountable review of the ${label(name)} dimension.`] : []),
        ],
        history: [],
      };
    });
  }
}
