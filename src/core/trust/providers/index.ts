import type { EvidenceKind, EvidenceStatus } from "../evidence/index.ts";

export type TrustProviderRequest = {
  tenantId: string;
  identityId: string;
  correlationId: string;
  evidenceKind: EvidenceKind;
  input: Record<string, unknown>;
};

export type TrustProviderResult = {
  provider: string;
  tenantId: string;
  identityId: string;
  status: EvidenceStatus;
  confidence: number;
  evidenceKind: EvidenceKind;
  reference: string;
  observedAt: string;
  expiresAt: string | null;
  limitations: string[];
  attributes: Record<string, string | number | boolean | null>;
};

export type TrustProviderHealth = {
  provider: string;
  state: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "MISCONFIGURED";
  checkedAt: string;
  latencyMs: number | null;
  reason: string;
};

export interface TrustProvider {
  readonly id: string;
  verify(request: TrustProviderRequest): Promise<TrustProviderResult>;
  health(): Promise<TrustProviderHealth>;
  confidence(result: TrustProviderResult): number;
  cost(): Promise<{ amount: number; currency: string; unit: string } | null>;
  latency(): Promise<number | null>;
}

export function normalizeTrustProviderResult(result: TrustProviderResult): TrustProviderResult {
  if (!Number.isFinite(result.confidence)) throw new TypeError("Provider confidence must be finite.");
  return {
    ...result,
    confidence: Math.max(0, Math.min(1, result.confidence)),
    observedAt: new Date(result.observedAt).toISOString(),
    expiresAt: result.expiresAt ? new Date(result.expiresAt).toISOString() : null,
    attributes: Object.fromEntries(
      Object.entries(result.attributes).filter(
        (entry): entry is [string, string | number | boolean | null] =>
          entry[1] === null || ["string", "number", "boolean"].includes(typeof entry[1]),
      ),
    ),
  };
}
