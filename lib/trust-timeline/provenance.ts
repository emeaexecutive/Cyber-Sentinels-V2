export type TimelineSeverity = "info" | "review" | "warning" | "critical";

export type TrustTimelineEvent = {
  id: string;
  subject_type: string | null;
  subject_id: string | null;
  event_type: string;
  event_title: string;
  event_summary: string;
  actor_type: string | null;
  actor_id: string | null;
  metadata: Record<string, any>;
  severity: TimelineSeverity;
  created_at: string | null;
  source: "stored" | "derived";
};

type AnyRow = Record<string, any>;

function value(input: unknown, fallback: string) {
  return input === null || input === undefined || input === "" ? fallback : String(input);
}

function asMetadata(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, any>)
    : {};
}

function severity(input: unknown): TimelineSeverity {
  const normalized = String(input ?? "info").toLowerCase();
  if (["critical", "high"].includes(normalized)) return "critical";
  if (["warning", "medium", "review", "manual_review"].includes(normalized)) return "review";
  if (["low", "info", "medium trust", "high trust"].includes(normalized)) return "info";
  if (normalized.includes("risk") || normalized.includes("review")) return "review";
  return "info";
}

function eventId(prefix: string, row: AnyRow) {
  return `${prefix}:${value(row.id, crypto.randomUUID())}`;
}

function subjectFrom(row: AnyRow, fallbackType: string | null = null, fallbackId: string | null = null) {
  const meta = asMetadata(row.metadata);
  const subjectId =
    row.subject_id ??
    row.passport_id ??
    meta.passport_id ??
    row.agent_id ??
    meta.agent_id ??
    row.verification_case_id ??
    meta.verification_case_id ??
    row.source_id ??
    fallbackId;

  const subjectType =
    row.subject_type ??
    (row.agent_id || meta.agent_id ? "agent" : null) ??
    (row.passport_id || meta.passport_id ? "passport" : null) ??
    row.source_type ??
    fallbackType ??
    (row.verification_case_id || meta.verification_case_id ? "verification_case" : "workflow");

  return {
    subject_type: subjectType,
    subject_id: subjectId ? String(subjectId) : null,
  };
}

export function normalizeStoredTimelineEvent(row: AnyRow): TrustTimelineEvent {
  return {
    id: value(row.id, eventId("timeline", row)),
    subject_type: row.subject_type ? String(row.subject_type) : null,
    subject_id: row.subject_id ? String(row.subject_id) : null,
    event_type: value(row.event_type, "operational_event"),
    event_title: value(row.event_title, "Operational event"),
    event_summary: value(row.event_summary, "Operational provenance event recorded."),
    actor_type: row.actor_type ? String(row.actor_type) : null,
    actor_id: row.actor_id ? String(row.actor_id) : null,
    metadata: asMetadata(row.metadata),
    severity: severity(row.severity),
    created_at: row.created_at ? String(row.created_at) : null,
    source: "stored",
  };
}

function derived(row: Omit<TrustTimelineEvent, "source">): TrustTimelineEvent {
  return { ...row, source: "derived" };
}

export function buildDerivedPassportTimeline(input: {
  passportId: string;
  evidence?: AnyRow[] | null;
  decisions?: AnyRow[] | null;
  signals?: AnyRow[] | null;
  auditLogs?: AnyRow[] | null;
  trustRuns?: AnyRow[] | null;
  relationships?: AnyRow[] | null;
}) {
  const events: TrustTimelineEvent[] = [];

  for (const item of input.evidence ?? []) {
    events.push(derived({
      id: eventId("evidence", item),
      ...subjectFrom(item, "passport", input.passportId),
      event_type: "evidence_uploaded",
      event_title: "Evidence uploaded",
      event_summary: "Evidence was added to the passport workflow for human review.",
      actor_type: value(item.uploaded_by ?? item.owner_email, "user"),
      actor_id: null,
      metadata: item,
      severity: "info",
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  for (const item of input.decisions ?? []) {
    events.push(derived({
      id: eventId("decision", item),
      ...subjectFrom(item, "passport", input.passportId),
      event_type: "governance_decision",
      event_title: "Governance decision recorded",
      event_summary: `Human governance recorded ${value(item.decision, "a decision")} for this workflow.`,
      actor_type: value(item.actor ?? item.decided_by, "human_reviewer"),
      actor_id: null,
      metadata: item,
      severity: severity(item.decision),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  for (const item of input.signals ?? []) {
    events.push(derived({
      id: eventId("signal", item),
      ...subjectFrom(item, "passport", input.passportId),
      event_type: "signal_generated",
      event_title: value(item.event, "Signal generated"),
      event_summary: "A trust signal was generated for operational review.",
      actor_type: "system",
      actor_id: null,
      metadata: item,
      severity: severity(item.risk_level ?? item.event),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  for (const item of input.auditLogs ?? []) {
    events.push(derived({
      id: eventId("audit", item),
      ...subjectFrom(item, "passport", input.passportId),
      event_type: value(item.event_type, "audit_event"),
      event_title: value(item.event_type, "Audit event"),
      event_summary: "Audit activity was recorded for operational provenance.",
      actor_type: value(item.actor, "audit_logger"),
      actor_id: null,
      metadata: item,
      severity: severity(item.event_type),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  for (const item of input.trustRuns ?? []) {
    events.push(derived({
      id: eventId("trust-run", item),
      ...subjectFrom(item, "passport", input.passportId),
      event_type: "trust_score_updated",
      event_title: "Trust score updated",
      event_summary: "The deterministic trust algorithm recalculated this passport's trust status.",
      actor_type: "trust_algorithm_v1",
      actor_id: null,
      metadata: item,
      severity: severity(item.confidence_level),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  for (const item of input.relationships ?? []) {
    events.push(derived({
      id: eventId("relationship", item),
      ...subjectFrom(item, "passport", input.passportId),
      event_type: "relationship_created",
      event_title: "Trust relationship created",
      event_summary: "A trust relationship was recorded for explainable provenance.",
      actor_type: "relationship_registry",
      actor_id: null,
      metadata: item,
      severity: severity(item.confidence_level),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  return sortTimelineEvents(events);
}

export function buildDerivedAgentTimeline(input: {
  agentId: string;
  events?: AnyRow[] | null;
  permissions?: AnyRow[] | null;
  trustRuns?: AnyRow[] | null;
  relationships?: AnyRow[] | null;
}) {
  const timeline: TrustTimelineEvent[] = [];

  for (const item of input.events ?? []) {
    timeline.push(derived({
      id: eventId("agent-event", item),
      ...subjectFrom(item, "agent", input.agentId),
      event_type: value(item.event_type, "agent_activity_detected"),
      event_title: value(item.event_type, "Agent activity detected"),
      event_summary: "Agent activity was recorded for provenance and human governance visibility.",
      actor_type: value(item.actor_type, "agent"),
      actor_id: item.actor_id ? String(item.actor_id) : null,
      metadata: item,
      severity: severity(item.risk_level),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  for (const item of input.permissions ?? []) {
    timeline.push(derived({
      id: eventId("permission", item),
      ...subjectFrom(item, "agent", input.agentId),
      event_type: "governance_decision",
      event_title: "Agent permission recorded",
      event_summary: "An agent permission or governance boundary was recorded.",
      actor_type: value(item.created_by, "governance_operator"),
      actor_id: null,
      metadata: item,
      severity: severity(item.risk_level),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  for (const item of input.trustRuns ?? []) {
    timeline.push(derived({
      id: eventId("agent-trust-run", item),
      ...subjectFrom(item, "agent", input.agentId),
      event_type: "trust_score_updated",
      event_title: "Agent trust score updated",
      event_summary: "The deterministic trust algorithm recalculated this agent's trust status.",
      actor_type: "trust_algorithm_v1",
      actor_id: null,
      metadata: item,
      severity: severity(item.confidence_level),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  for (const item of input.relationships ?? []) {
    timeline.push(derived({
      id: eventId("agent-relationship", item),
      ...subjectFrom(item, "agent", input.agentId),
      event_type: "relationship_created",
      event_title: "Trust relationship created",
      event_summary: "A trust relationship was recorded for explainable provenance.",
      actor_type: "relationship_registry",
      actor_id: null,
      metadata: item,
      severity: severity(item.confidence_level),
      created_at: item.created_at ? String(item.created_at) : null,
    }));
  }

  return sortTimelineEvents(timeline);
}

export function sortTimelineEvents(events: TrustTimelineEvent[]) {
  return [...events].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
}

export function mergeTimelineEvents(
  stored: TrustTimelineEvent[],
  derivedEvents: TrustTimelineEvent[]
) {
  const seen = new Set<string>();
  return sortTimelineEvents([...stored, ...derivedEvents]).filter((event) => {
    const key = [
      event.event_type,
      event.subject_type,
      event.subject_id,
      event.metadata?.id,
      event.created_at,
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function timelineCategory(eventType: string) {
  const normalized = eventType.toLowerCase();
  if (normalized.includes("evidence")) return "evidence";
  if (normalized.includes("agent") || normalized.includes("activity")) return "agents";
  if (normalized.includes("signal") || normalized.includes("anomaly")) return "signals";
  if (normalized.includes("decision") || normalized.includes("review") || normalized.includes("governance")) return "governance";
  if (normalized.includes("passport") || normalized.includes("trust_score")) return "passports";
  return "governance";
}

export function formatTimelineDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
