import type { TrustEntityType } from "../types/index.ts";
import {
  enterpriseTrustDimensionNames,
  type EnterpriseTrustDimensionName,
} from "./TrustDimension.ts";

const baseWeights: Record<EnterpriseTrustDimensionName, number> = {
  IDENTITY: 0.14,
  DOCUMENTS: 0.1,
  EMAIL: 0.07,
  PHONE: 0.06,
  DEVICE: 0.08,
  LOCATION: 0.06,
  BEHAVIOUR: 0.1,
  NETWORK: 0.08,
  ENTERPRISE: 0.1,
  HISTORICAL: 0.08,
  AI_BEHAVIOUR: 0.07,
  PROVIDER_CONFIDENCE: 0.06,
};

const entityAdjustments: Partial<
  Record<TrustEntityType, Partial<Record<EnterpriseTrustDimensionName, number>>>
> = {
  HUMAN: { IDENTITY: 1.25, DOCUMENTS: 1.2, AI_BEHAVIOUR: 0.4 },
  AI_AGENT: { AI_BEHAVIOUR: 2.3, BEHAVIOUR: 1.3, DOCUMENTS: 0.45, PHONE: 0.3 },
  DEVICE: { DEVICE: 2, NETWORK: 1.5, BEHAVIOUR: 1.2, DOCUMENTS: 0.25, PHONE: 0.25 },
  ORGANISATION: { ENTERPRISE: 1.8, HISTORICAL: 1.25, NETWORK: 1.15, PHONE: 0.5 },
};

export type TrustWeight = {
  dimension: EnterpriseTrustDimensionName;
  weight: number;
};

export function trustWeightsFor(entityType: TrustEntityType): TrustWeight[] {
  const adjusted = enterpriseTrustDimensionNames.map((dimension) => ({
    dimension,
    weight: baseWeights[dimension] * (entityAdjustments[entityType]?.[dimension] ?? 1),
  }));
  const total = adjusted.reduce((sum, item) => sum + item.weight, 0);
  return adjusted.map((item) => ({
    ...item,
    weight: Math.round((item.weight / total) * 10_000) / 10_000,
  }));
}
