import type { OriFeatureDefinition } from "./types.ts";

export function clipApprovedExtractedCount(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) throw new Error("invalid_extracted_count");
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}

export function constrainApprovedExtractedRatio(value: number) {
  if (!Number.isFinite(value)) throw new Error("invalid_extracted_ratio");
  return Number(Math.max(0, Math.min(1, value)).toFixed(6));
}

export function normalizeFeatureForModel(definition: OriFeatureDefinition, value: boolean | number | string) {
  if (definition.dataType === "boolean") return value === true ? 1 : 0;
  if (definition.dataType === "category") {
    const index = definition.allowedValues?.indexOf(String(value)) ?? -1;
    return index < 0 ? 0 : index / Math.max(1, (definition.allowedValues?.length ?? 1) - 1);
  }
  const numeric = Number(value);
  if (definition.minimum == null || definition.maximum == null || definition.maximum === definition.minimum) {
    return numeric;
  }
  return (numeric - definition.minimum) / (definition.maximum - definition.minimum);
}
