import { ORI_FEATURE_REGISTRY_BY_ID } from "./feature-registry.ts";
import { normalizeFeatureForModel } from "./feature-normalizer.ts";
import type { OriContribution, OriFeatureValue, OriModelArtifact } from "./types.ts";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function logistic(value: number) {
  return 1 / (1 + Math.exp(-value));
}

export function runOriLogisticModel(artifact: OriModelArtifact, features: OriFeatureValue[]) {
  const contributions: OriContribution[] = [];
  let logit = artifact.intercept;
  for (const candidate of features) {
    const coefficient = artifact.coefficients[candidate.featureId];
    const definition = ORI_FEATURE_REGISTRY_BY_ID.get(candidate.featureId);
    if (coefficient == null || !definition) continue;
    const normalized = clamp01(normalizeFeatureForModel(definition, candidate.value));
    const contribution = Number((normalized * coefficient).toFixed(8));
    logit += contribution;
    contributions.push({
      featureId: candidate.featureId,
      direction: contribution >= 0 ? "RISK_INCREASING" : "RISK_REDUCING",
      contribution,
      explanation: `${definition.name} ${contribution >= 0 ? "increased" : "reduced"} the shadow risk score under model ${artifact.modelVersion}.`,
    });
  }
  contributions.sort(
    (left, right) => Math.abs(right.contribution) - Math.abs(left.contribution) || left.featureId.localeCompare(right.featureId)
  );
  return { score: Number(clamp01(logistic(logit)).toFixed(8)), logit: Number(logit.toFixed(8)), contributions };
}
