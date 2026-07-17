import { ORI_FEATURE_SCHEMA_VERSION, ORI_THRESHOLDS_V1 } from "./constants.ts";
import { ORI_FEATURE_REGISTRY_BY_ID, ORI_FEATURE_REGISTRY_V1 } from "./feature-registry.ts";
import type { OriInferenceInput } from "./types.ts";

export type OriFeatureValidationResult = {
  valid: boolean;
  errors: string[];
  missingFeatureIds: string[];
  evidenceCoverage: number;
};

export function validateOriFeatures(input: OriInferenceInput): OriFeatureValidationResult {
  const errors: string[] = [];
  const ids = input.features.map((feature) => feature.featureId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`duplicate_features:${[...new Set(duplicates)].sort().join(",")}`);
  if (input.featureSchemaVersion !== ORI_FEATURE_SCHEMA_VERSION) errors.push("incompatible_input_schema");

  for (const candidate of input.features) {
    const definition = ORI_FEATURE_REGISTRY_BY_ID.get(candidate.featureId);
    if (!definition || !definition.active) {
      errors.push(`unknown_or_inactive_feature:${candidate.featureId}`);
      continue;
    }
    if (candidate.schemaVersion !== ORI_FEATURE_SCHEMA_VERSION) errors.push(`incompatible_feature_schema:${candidate.featureId}`);
    if (candidate.sourceTenantId !== input.tenantId || candidate.sourceTrustSessionId !== input.trustSessionId) {
      errors.push(`feature_scope_mismatch:${candidate.featureId}`);
    }
    if (!candidate.sourceEvidenceIds.length || candidate.sourceEvidenceIds.some((id) => !id.trim())) {
      errors.push(`missing_evidence_reference:${candidate.featureId}`);
    }
    const value = candidate.value;
    if (definition.dataType === "boolean" && typeof value !== "boolean") errors.push(`invalid_boolean:${candidate.featureId}`);
    if (definition.dataType === "integer" && (typeof value !== "number" || !Number.isInteger(value))) {
      errors.push(`invalid_integer:${candidate.featureId}`);
    }
    if (definition.dataType === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
      errors.push(`invalid_number:${candidate.featureId}`);
    }
    if (definition.dataType === "category" && !definition.allowedValues?.includes(String(value))) {
      errors.push(`invalid_category:${candidate.featureId}`);
    }
    if (typeof value === "number" && definition.minimum != null && value < definition.minimum) errors.push(`below_minimum:${candidate.featureId}`);
    if (typeof value === "number" && definition.maximum != null && value > definition.maximum) errors.push(`above_maximum:${candidate.featureId}`);
  }

  const missingFeatureIds = ORI_FEATURE_REGISTRY_V1
    .filter((definition) => !ids.includes(definition.id))
    .map((definition) => definition.id)
    .sort();
  const requiredMissing = ORI_FEATURE_REGISTRY_V1
    .filter((definition) => definition.required && !ids.includes(definition.id))
    .map((definition) => definition.id);
  if (requiredMissing.length) errors.push(`missing_required_features:${requiredMissing.join(",")}`);
  const evidenceCoverage = Number((new Set(ids.filter((id) => ORI_FEATURE_REGISTRY_BY_ID.has(id))).size / ORI_FEATURE_REGISTRY_V1.length).toFixed(6));
  if (evidenceCoverage < ORI_THRESHOLDS_V1.minimumFeatureCoverage) errors.push("insufficient_feature_coverage");
  return { valid: errors.length === 0, errors: [...new Set(errors)].sort(), missingFeatureIds, evidenceCoverage };
}
