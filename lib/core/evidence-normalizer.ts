export type TrustEvidenceKind =
  | "provider"
  | "runtime"
  | "human_review"
  | "replay"
  | "document"
  | "provenance"
  | "session"
  | "agent_action"
  | "credential";

export type TrustEvidenceSource =
  | "Provider API"
  | "Runtime Intelligence"
  | "Human Review"
  | "Replay"
  | "Document Evidence"
  | "Provenance"
  | "Session Integrity"
  | "Agent Action"
  | "NHI Credential"
  | "Heuristic Baseline"
  | "Unknown";

export type TrustEvidenceInput = {
  id?: string | null;
  kind: TrustEvidenceKind;
  title?: string | null;
  source?: TrustEvidenceSource | string | null;
  confidence?: number | null;
  timestamp?: string | Date | null;
  actorReference?: string | null;
  entityReference?: string | null;
  workflowReference?: string | null;
  replayReference?: string | null;
  trustEngineReference?: string | null;
  evidence?: string[] | string | null;
  limitations?: string[] | string | null;
  metadata?: Record<string, unknown> | null;
};

export type NormalizedTrustEvidence = {
  id: string;
  type: TrustEvidenceKind;
  kind: TrustEvidenceKind;
  title: string;
  confidence: number;
  source: TrustEvidenceSource;
  timestamp: string;
  actor_reference: string | null;
  entity_reference: string | null;
  workflow_reference: string | null;
  replay_reference: string | null;
  trust_engine_reference: string | null;
  evidence: string[];
  limitations: string[];
  metadata: Record<string, unknown>;
  schema_version: 1;
};

const sourceByKind: Record<TrustEvidenceKind, TrustEvidenceSource> = {
  provider: "Provider API",
  runtime: "Runtime Intelligence",
  human_review: "Human Review",
  replay: "Replay",
  document: "Document Evidence",
  provenance: "Provenance",
  session: "Session Integrity",
  agent_action: "Agent Action",
  credential: "NHI Credential",
};

function toList(value?: string[] | string | null) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function toConfidence(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return 0;
  return Math.max(0, Math.min(1, Number(value)));
}

function toTimestamp(value?: string | Date | null) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96) || "evidence";
}

export function normalizeTrustEvidence(input: TrustEvidenceInput): NormalizedTrustEvidence {
  const timestamp = toTimestamp(input.timestamp);
  const title = input.title?.trim() || `${input.kind.replace(/_/g, " ")} evidence`;
  const source = (input.source || sourceByKind[input.kind] || "Unknown") as TrustEvidenceSource;

  return {
    id: input.id?.trim() || `${input.kind}:${slug(title)}:${timestamp}`,
    type: input.kind,
    kind: input.kind,
    title,
    confidence: toConfidence(input.confidence),
    source,
    timestamp,
    actor_reference: input.actorReference ?? null,
    entity_reference: input.entityReference ?? null,
    workflow_reference: input.workflowReference ?? null,
    replay_reference: input.replayReference ?? null,
    trust_engine_reference: input.trustEngineReference ?? null,
    evidence: toList(input.evidence),
    limitations: toList(input.limitations),
    metadata: input.metadata ?? {},
    schema_version: 1,
  };
}

export function normalizeTrustEvidenceBatch(items: TrustEvidenceInput[]) {
  return items.map(normalizeTrustEvidence);
}
