import type { TrustEntity, TrustEvidence, TrustSource } from "../types/index.ts";
import type { TrustDimension, TrustDimensionName } from "./TrustDimension.ts";

export type TrustVector = Partial<Record<TrustDimensionName, number>>;
export type TrustRiskBand = "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_EVIDENCE";

export type TrustProfile = {
  profileId: string;
  tenantId: string;
  entityId: string;
  identityId: string;
  entityType: TrustEntity["entityType"];
  profileVersion: "trust-dna-v1" | "trust-dna-v2";
  version: number;
  overallScore: number;
  overallConfidence: number;
  evidenceCompleteness: number;
  dimensions: TrustDimension[];
  dimensionBreakdown: TrustDimension[];
  vector: TrustVector;
  evidenceUsed: string[];
  evidenceMissing: string[];
  riskIndicators: string[];
  recommendedActions: string[];
  riskBand: TrustRiskBand;
  explanation: string[];
  generatedAt: string;
  lastRecalculated: string;
};

export type TrustDNACalculationInput = {
  profileId: string;
  tenantId: string;
  entity: TrustEntity;
  evidence: TrustEvidence[];
  sources?: TrustSource[];
  calculatedAt?: string;
  previousProfile?: TrustProfile | null;
};
