export const evidenceKinds = [
  "HUMAN",
  "PASSPORT",
  "DRIVING_LICENCE",
  "EMAIL",
  "PHONE",
  "CORPORATE_DOMAIN",
  "DEVICE",
  "LOCATION",
  "VPN",
  "BROWSER",
  "BIOMETRIC",
  "LIVENESS",
  "DEEPFAKE_ANALYSIS",
  "AI_AGENT",
  "ENTERPRISE_POLICY",
  "MANUAL_REVIEW",
  "RISK_DECISION",
] as const;

export type EvidenceKind = (typeof evidenceKinds)[number];
export type EvidenceStatus = "VALID" | "INCONCLUSIVE" | "REJECTED" | "EXPIRED" | "REVOKED";
export type EvidenceRelationshipType =
  | "SUPPORTS"
  | "CONTRADICTS"
  | "DERIVED_FROM"
  | "OBSERVED_BY"
  | "VERIFIED_BY"
  | "APPLIES_TO"
  | "SUPERSEDES"
  | "REVOKES"
  | "RESULTED_IN";

export type EvidenceNode = {
  id: string;
  tenantId: string;
  identityId: string;
  kind: EvidenceKind;
  label: string;
  confidence: number;
  status: EvidenceStatus;
  source: string;
  verifier: string;
  observedAt: string;
  validUntil: string | null;
  payloadHash: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type EvidenceRelationship = {
  id: string;
  tenantId: string;
  fromNodeId: string;
  toNodeId: string;
  type: EvidenceRelationshipType;
  confidence: number;
  source: string;
  observedAt: string;
  createdAt: string;
};

export type EvidenceHistory = {
  identityId: string;
  tenantId: string;
  nodes: EvidenceNode[];
  generatedAt: string;
};

export interface EvidenceRepository {
  findNode(tenantId: string, evidenceId: string): Promise<EvidenceNode | null>;
  findNodesByIdentity(tenantId: string, identityId: string, limit: number): Promise<EvidenceNode[]>;
  findRelationships(tenantId: string, nodeIds: string[], limit: number): Promise<EvidenceRelationship[]>;
  saveNode(node: EvidenceNode): Promise<void>;
  saveRelationship(relationship: EvidenceRelationship): Promise<void>;
}

const referencePattern = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const deniedMetadata = /address|biometric|credential|document|email|ip|payload|phone|secret|token/i;

export function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) throw new TypeError("Evidence confidence must be finite.");
  return Math.max(0, Math.min(1, value));
}

export function sanitizeEvidenceMetadata(
  value: Record<string, unknown>,
): EvidenceNode["metadata"] {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !deniedMetadata.test(key))
      .filter((entry): entry is [string, string | number | boolean | null] => {
        const item = entry[1];
        return item === null || ["string", "number", "boolean"].includes(typeof item);
      }),
  );
}

export function validateEvidenceNode(node: EvidenceNode): EvidenceNode {
  for (const [field, value] of [
    ["id", node.id],
    ["tenantId", node.tenantId],
    ["identityId", node.identityId],
    ["source", node.source],
    ["verifier", node.verifier],
  ] as const) {
    if (!referencePattern.test(value)) throw new TypeError(`${field} is invalid.`);
  }
  if (!evidenceKinds.includes(node.kind)) throw new TypeError("Evidence kind is invalid.");
  if (!hashPattern.test(node.payloadHash)) throw new TypeError("Evidence payloadHash must be SHA-256.");
  const observedAt = new Date(node.observedAt);
  if (Number.isNaN(observedAt.getTime())) throw new TypeError("Evidence observedAt is invalid.");
  if (node.validUntil && Number.isNaN(new Date(node.validUntil).getTime())) {
    throw new TypeError("Evidence validUntil is invalid.");
  }
  return {
    ...node,
    confidence: normalizeConfidence(node.confidence),
    observedAt: observedAt.toISOString(),
    validUntil: node.validUntil ? new Date(node.validUntil).toISOString() : null,
    metadata: sanitizeEvidenceMetadata(node.metadata),
  };
}
