import type { TrustHistory } from "./TrustHistory.ts";

export const enterpriseTrustDimensionNames = [
  "IDENTITY",
  "DOCUMENTS",
  "EMAIL",
  "PHONE",
  "DEVICE",
  "LOCATION",
  "BEHAVIOUR",
  "NETWORK",
  "ENTERPRISE",
  "HISTORICAL",
  "AI_BEHAVIOUR",
  "PROVIDER_CONFIDENCE",
] as const;

export const legacyTrustDimensionNames = [
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

export const trustDimensionNames = enterpriseTrustDimensionNames;

export type EnterpriseTrustDimensionName = (typeof enterpriseTrustDimensionNames)[number];
export type LegacyTrustDimensionName = (typeof legacyTrustDimensionNames)[number];
export type TrustDimensionName = EnterpriseTrustDimensionName | LegacyTrustDimensionName;

export type TrustDimension = {
  name: TrustDimensionName;
  score: number;
  confidence: number;
  weight: number;
  reason: string;
  reasons: string[];
  lastUpdated: string;
  evidenceIds: string[];
  evidenceMissing: boolean;
  riskIndicators: string[];
  recommendedActions: string[];
  history: TrustHistory[];
};
