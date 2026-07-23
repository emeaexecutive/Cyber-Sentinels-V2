import type { TrustProfile } from "../dna/index.ts";
import type { EvidenceHistory, EvidenceNode } from "../evidence/index.ts";
import type { EvidenceGraph } from "../graph/index.ts";
import type { TrustDecision } from "../intelligence/index.ts";
import type { ReplayTimeline } from "../replay/index.ts";

export type TrustIntelligenceRequestContext = {
  enterpriseId: string;
  correlationId?: string;
  signal?: AbortSignal;
};

export interface TrustIntelligenceSDK {
  getEvidence(
    evidenceId: string,
    context: TrustIntelligenceRequestContext,
  ): Promise<EvidenceNode>;
  getEvidenceGraph(
    identityId: string,
    context: TrustIntelligenceRequestContext,
  ): Promise<EvidenceGraph>;
  getEvidenceHistory(
    identityId: string,
    context: TrustIntelligenceRequestContext,
  ): Promise<EvidenceHistory>;
  getTrustDNA(
    identityId: string,
    context: TrustIntelligenceRequestContext,
  ): Promise<TrustProfile>;
  getReplay(
    identityId: string,
    context: TrustIntelligenceRequestContext,
  ): Promise<ReplayTimeline>;
  explainDecision(
    identityId: string,
    context: TrustIntelligenceRequestContext,
  ): Promise<TrustDecision>;
}

export type TrustIntelligenceWebhookEvent = {
  schemaVersion: "trust-intelligence-webhook-v1";
  eventId: string;
  eventType:
    | "evidence.recorded"
    | "trust.updated"
    | "decision.recorded"
    | "risk.detected"
    | "human.override";
  tenantId: string;
  identityId: string;
  occurredAt: string;
  resourceUrl: string;
  payloadHash: string;
};

export type GraphQLReadyNode<TType extends string, TValue> = {
  id: string;
  type: TType;
  tenantId: string;
  value: TValue;
};

export type OpenAPIOperation = {
  operationId: string;
  method: "GET" | "POST";
  path: string;
  authenticated: true;
  tenantHeader: "X-Enterprise-Id";
  responseSchema: string;
};

export const trustIntelligenceOpenAPIOperations: OpenAPIOperation[] = [
  { operationId: "getEvidence", method: "GET", path: "/api/evidence/{id}", authenticated: true, tenantHeader: "X-Enterprise-Id", responseSchema: "EvidenceNode" },
  { operationId: "getEvidenceGraph", method: "GET", path: "/api/evidence/graph/{identity}", authenticated: true, tenantHeader: "X-Enterprise-Id", responseSchema: "EvidenceGraph" },
  { operationId: "getEvidenceHistory", method: "GET", path: "/api/evidence/history/{identity}", authenticated: true, tenantHeader: "X-Enterprise-Id", responseSchema: "EvidenceHistory" },
  { operationId: "getTrustDNA", method: "GET", path: "/api/trust-dna/{identity}", authenticated: true, tenantHeader: "X-Enterprise-Id", responseSchema: "TrustProfile" },
  { operationId: "getReplay", method: "GET", path: "/api/replay/{identity}", authenticated: true, tenantHeader: "X-Enterprise-Id", responseSchema: "ReplayTimeline" },
  { operationId: "explainTrustDecision", method: "GET", path: "/api/trust-intelligence/decision/{identity}", authenticated: true, tenantHeader: "X-Enterprise-Id", responseSchema: "TrustDecision" },
];
