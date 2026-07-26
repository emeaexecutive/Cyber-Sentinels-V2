import type {
  EvidenceHistory,
  EvidenceNode,
  EvidenceRelationship,
  EvidenceRepository,
} from "../evidence/index.ts";

export type EvidenceGraph = {
  tenantId: string;
  identityId: string;
  nodes: EvidenceNode[];
  relationships: EvidenceRelationship[];
  generatedAt: string;
  truncated: boolean;
};

export interface EvidenceGraphAPI {
  getEvidence(tenantId: string, evidenceId: string): Promise<EvidenceNode | null>;
  getGraph(tenantId: string, identityId: string, limit?: number): Promise<EvidenceGraph>;
  getHistory(tenantId: string, identityId: string, limit?: number): Promise<EvidenceHistory>;
}

function boundedLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError("Evidence graph limit is invalid.");
  return Math.min(value, 500);
}

export class EvidenceGraphService implements EvidenceGraphAPI {
  private readonly repository: EvidenceRepository;

  constructor(repository: EvidenceRepository) {
    this.repository = repository;
  }

  getEvidence(tenantId: string, evidenceId: string) {
    return this.repository.findNode(tenantId, evidenceId);
  }

  async getGraph(tenantId: string, identityId: string, requestedLimit = 200): Promise<EvidenceGraph> {
    const limit = boundedLimit(requestedLimit);
    const nodes = await this.repository.findNodesByIdentity(tenantId, identityId, limit + 1);
    const selected = nodes.slice(0, limit);
    const relationships = await this.repository.findRelationships(
      tenantId,
      selected.map((node) => node.id),
      limit,
    );
    const nodeIds = new Set(selected.map((node) => node.id));
    const safeRelationships = relationships.filter(
      (relationship) =>
        relationship.tenantId === tenantId &&
        nodeIds.has(relationship.fromNodeId) &&
        nodeIds.has(relationship.toNodeId),
    );
    return {
      tenantId,
      identityId,
      nodes: selected.filter((node) => node.tenantId === tenantId),
      relationships: safeRelationships,
      generatedAt: new Date().toISOString(),
      truncated: nodes.length > limit,
    };
  }

  async getHistory(tenantId: string, identityId: string, requestedLimit = 200): Promise<EvidenceHistory> {
    const nodes = await this.repository.findNodesByIdentity(
      tenantId,
      identityId,
      boundedLimit(requestedLimit),
    );
    return {
      tenantId,
      identityId,
      nodes: nodes
        .filter((node) => node.tenantId === tenantId)
        .sort((left, right) => left.observedAt.localeCompare(right.observedAt)),
      generatedAt: new Date().toISOString(),
    };
  }
}

export * from "./service.ts";
