import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sanitizeEvidenceMetadata,
  validateEvidenceNode,
  type EvidenceKind,
  type EvidenceNode,
  type EvidenceRelationship,
  type EvidenceRelationshipType,
  type EvidenceRepository,
  type EvidenceStatus,
} from "./index.ts";

function repositoryFailure(operation: string, error: unknown): never {
  console.error("Trust Intelligence repository operation failed.", {
    operation,
    code: (error as { code?: string })?.code ?? "UNKNOWN",
  });
  throw Object.assign(new Error("Trust Intelligence data could not be loaded safely."), {
    status: 500,
    code: "TRUST_INTELLIGENCE_PERSISTENCE_FAILED",
  });
}

function nodeFromRow(row: Record<string, unknown>): EvidenceNode {
  return validateEvidenceNode({
    id: String(row.node_id),
    tenantId: String(row.tenant_id),
    identityId: String(row.identity_id),
    kind: String(row.evidence_type) as EvidenceKind,
    label: String(row.label),
    confidence: Number(row.confidence),
    status: String(row.status) as EvidenceStatus,
    source: String(row.source),
    verifier: String(row.verifier),
    observedAt: String(row.observed_at),
    validUntil: row.valid_until ? String(row.valid_until) : null,
    payloadHash: String(row.payload_hash),
    metadata: sanitizeEvidenceMetadata((row.metadata as Record<string, unknown>) ?? {}),
    createdAt: String(row.created_at),
  });
}

function relationshipFromRow(row: Record<string, unknown>): EvidenceRelationship {
  return {
    id: String(row.relationship_id),
    tenantId: String(row.tenant_id),
    fromNodeId: String(row.from_node_id),
    toNodeId: String(row.to_node_id),
    type: String(row.relationship_type) as EvidenceRelationshipType,
    confidence: Number(row.confidence),
    source: String(row.source),
    observedAt: String(row.observed_at),
    createdAt: String(row.created_at),
  };
}

export function createEvidenceRepository(client: SupabaseClient): EvidenceRepository {
  return {
    async findNode(tenantId, evidenceId) {
      const result = await client
        .from("evidence_nodes")
        .select("node_id,tenant_id,identity_id,evidence_type,label,confidence,status,source,verifier,observed_at,valid_until,payload_hash,metadata,created_at")
        .eq("tenant_id", tenantId)
        .eq("node_id", evidenceId)
        .maybeSingle();
      if (result.error) repositoryFailure("find evidence node", result.error);
      return result.data ? nodeFromRow(result.data as Record<string, unknown>) : null;
    },

    async findNodesByIdentity(tenantId, identityId, limit) {
      const result = await client
        .from("evidence_nodes")
        .select("node_id,tenant_id,identity_id,evidence_type,label,confidence,status,source,verifier,observed_at,valid_until,payload_hash,metadata,created_at")
        .eq("tenant_id", tenantId)
        .eq("identity_id", identityId)
        .order("observed_at", { ascending: false })
        .order("node_id", { ascending: false })
        .limit(limit);
      if (result.error) repositoryFailure("find identity evidence", result.error);
      return (result.data ?? []).map((row) => nodeFromRow(row as Record<string, unknown>));
    },

    async findRelationships(tenantId, nodeIds, limit) {
      if (!nodeIds.length) return [];
      const result = await client
        .from("evidence_relationships")
        .select("relationship_id,tenant_id,from_node_id,to_node_id,relationship_type,confidence,source,observed_at,created_at")
        .eq("tenant_id", tenantId)
        .in("from_node_id", nodeIds)
        .in("to_node_id", nodeIds)
        .order("observed_at", { ascending: true })
        .limit(limit);
      if (result.error) repositoryFailure("find evidence relationships", result.error);
      return (result.data ?? []).map((row) =>
        relationshipFromRow(row as Record<string, unknown>),
      );
    },

    async saveNode(rawNode) {
      const node = validateEvidenceNode(rawNode);
      const result = await client.from("evidence_nodes").insert({
        node_id: node.id,
        tenant_id: node.tenantId,
        identity_id: node.identityId,
        evidence_type: node.kind,
        label: node.label,
        confidence: node.confidence,
        status: node.status,
        source: node.source,
        verifier: node.verifier,
        observed_at: node.observedAt,
        valid_until: node.validUntil,
        payload_hash: node.payloadHash,
        metadata: node.metadata,
      });
      if (result.error) repositoryFailure("save evidence node", result.error);
    },

    async saveRelationship(relationship) {
      const result = await client.from("evidence_relationships").insert({
        relationship_id: relationship.id,
        tenant_id: relationship.tenantId,
        from_node_id: relationship.fromNodeId,
        to_node_id: relationship.toNodeId,
        relationship_type: relationship.type,
        confidence: relationship.confidence,
        source: relationship.source,
        observed_at: relationship.observedAt,
      });
      if (result.error) repositoryFailure("save evidence relationship", result.error);
    },
  };
}
