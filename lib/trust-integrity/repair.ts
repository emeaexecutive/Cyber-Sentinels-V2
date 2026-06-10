import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type TrustIntegrityRepairAction =
  | "audit"
  | "rebuild_timelines"
  | "rebuild_relationships"
  | "regenerate_receipts"
  | "repair_replay_ordering"
  | "run_all";

type AnyRow = Record<string, unknown>;

type TableRead = {
  table: string;
  available: boolean;
  rows: AnyRow[];
  error?: string;
};

export type TrustIntegritySummary = {
  generatedAt: string;
  unavailableTables: string[];
  counts: Record<string, number>;
  issues: Record<string, number>;
};

export type TrustIntegrityRepairResult = {
  action: TrustIntegrityRepairAction;
  summary: TrustIntegritySummary;
  repaired: Record<string, number>;
  warnings: string[];
};

const readLimit = 500;

const subjectTables = [
  "trust_cases",
  "evidence_files",
  "governance_actions",
  "notifications",
  "verification_receipts",
  "evidence_chains",
  "trust_relationships",
  "trust_timeline_events",
  "trust_replay_sessions",
  "interview_sessions",
  "interview_risk_events",
  "candidate_profiles",
  "recruiter_profiles",
  "agents",
  "ai_agents",
  "agent_activity",
  "trust_reports",
] as const;

function rowId(row: AnyRow) {
  return typeof row.id === "string" ? row.id : "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function metadata(row: AnyRow) {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? (row.metadata as AnyRow)
    : {};
}

function metadataId(row: AnyRow, key: string) {
  return stringValue(metadata(row)[key]);
}

function subjectKey(subjectType: unknown, subjectId: unknown) {
  const type = stringValue(subjectType);
  const id = stringValue(subjectId);

  return type && id ? `${type}:${id}` : "";
}

function timelineKey(row: AnyRow) {
  return `${stringValue(row.event_type)}:${subjectKey(row.subject_type, row.subject_id)}`;
}

function relationshipKey(row: AnyRow) {
  return [
    stringValue(row.source_type),
    stringValue(row.source_id),
    stringValue(row.relationship_type),
    stringValue(row.target_type),
    stringValue(row.target_id),
  ].join(":");
}

function compact<T>(items: Array<T | null | undefined>) {
  return items.filter(Boolean) as T[];
}

async function readTable(
  supabase: SupabaseClient,
  table: string,
  orderColumn = "created_at"
): Promise<TableRead> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderColumn, { ascending: false })
      .limit(readLimit);

    if (error) {
      return { table, available: false, rows: [], error: error.message };
    }

    return { table, available: true, rows: (data ?? []) as AnyRow[] };
  } catch (error) {
    return {
      table,
      available: false,
      rows: [],
      error: error instanceof Error ? error.message : "Table read failed.",
    };
  }
}

async function readIntegrityTables(supabase: SupabaseClient) {
  const reads = await Promise.all(subjectTables.map((table) => readTable(supabase, table)));

  return Object.fromEntries(reads.map((read) => [read.table, read])) as Record<string, TableRead>;
}

function rows(reads: Record<string, TableRead>, table: string) {
  return reads[table]?.rows ?? [];
}

function tableUnavailable(reads: Record<string, TableRead>) {
  return Object.values(reads)
    .filter((read) => !read.available)
    .map((read) => `${read.table}${read.error ? `: ${read.error}` : ""}`);
}

function hasSubjectEvent(events: AnyRow[], eventType: string, subjectType: unknown, subjectId: unknown) {
  const key = `${eventType}:${subjectKey(subjectType, subjectId)}`;

  return events.some((event) => timelineKey(event) === key);
}

function hasMetadataEvent(events: AnyRow[], eventType: string, metadataKey: string, id: string) {
  return events.some(
    (event) =>
      stringValue(event.event_type) === eventType &&
      metadataId(event, metadataKey) === id
  );
}

function hasRelationship(relationships: AnyRow[], relationship: AnyRow) {
  return relationships.some((row) => relationshipKey(row) === relationshipKey(relationship));
}

export async function auditTrustIntegrity(): Promise<TrustIntegritySummary> {
  const supabase = createServiceRoleClient();
  const reads = await readIntegrityTables(supabase);
  const timeline = rows(reads, "trust_timeline_events");
  const relationships = rows(reads, "trust_relationships");
  const receipts = rows(reads, "verification_receipts");
  const chains = rows(reads, "evidence_chains");
  const governance = rows(reads, "governance_actions");
  const replay = rows(reads, "trust_replay_sessions");
  const notifications = rows(reads, "notifications");
  const sessions = rows(reads, "interview_sessions");
  const riskEvents = rows(reads, "interview_risk_events");
  const candidates = rows(reads, "candidate_profiles");
  const recruiters = rows(reads, "recruiter_profiles");
  const agents = [...rows(reads, "agents"), ...rows(reads, "ai_agents")];
  const activity = rows(reads, "agent_activity");
  const validSessionIds = new Set(sessions.map(rowId).filter(Boolean));
  const validCandidateIds = new Set(candidates.map(rowId).filter(Boolean));
  const validRecruiterIds = new Set(recruiters.map(rowId).filter(Boolean));
  const validAgentIds = new Set(agents.map(rowId).filter(Boolean));
  const chainSubjects = new Set(chains.map((chain) => subjectKey(chain.subject_type, chain.subject_id)).filter(Boolean));

  return {
    generatedAt: new Date().toISOString(),
    unavailableTables: tableUnavailable(reads),
    counts: Object.fromEntries(
      Object.entries(reads).map(([table, read]) => [table, read.available ? read.rows.length : 0])
    ),
    issues: {
      receipts_missing_evidence_chain: receipts.filter(
        (receipt) => !chainSubjects.has(subjectKey(receipt.subject_type, receipt.subject_id))
      ).length,
      receipts_missing_timeline: receipts.filter(
        (receipt) => !hasSubjectEvent(timeline, "verification_receipt_issued", receipt.subject_type, receipt.subject_id)
      ).length,
      governance_missing_timeline: governance.filter(
        (action) => !hasMetadataEvent(timeline, "governance_action_created", "governance_action_id", rowId(action))
      ).length,
      replay_missing_subject: replay.filter((event) => !subjectKey(event.subject_type, event.subject_id)).length,
      replay_missing_timeline: replay.filter(
        (event) => !hasMetadataEvent(timeline, "replay_snapshot_recorded", "trust_replay_session_id", rowId(event))
      ).length,
      relationships_missing_target: relationships.filter(
        (relationship) => !stringValue(relationship.target_type) || !stringValue(relationship.target_id)
      ).length,
      duplicate_relationships: relationships.length - new Set(relationships.map(relationshipKey)).size,
      duplicate_notifications: notifications.length - new Set(
        notifications.map((notification) =>
          [
            stringValue(notification.user_id),
            stringValue(notification.notification_type),
            stringValue(notification.title),
            metadataId(notification, "subject_id"),
            metadataId(notification, "governance_action_id"),
          ].join(":")
        )
      ).size,
      interview_sessions_missing_candidate: sessions.filter((session) => {
        const candidateId = stringValue(session.candidate_id) || stringValue(session.candidate_profile_id);
        return candidateId && !validCandidateIds.has(candidateId);
      }).length,
      interview_sessions_missing_recruiter: sessions.filter((session) => {
        const recruiterId = stringValue(session.recruiter_profile_id);
        return recruiterId && !validRecruiterIds.has(recruiterId);
      }).length,
      risk_events_missing_session: riskEvents.filter(
        (event) => !validSessionIds.has(stringValue(event.interview_session_id))
      ).length,
      agent_activity_missing_agent: activity.filter(
        (event) => !validAgentIds.has(stringValue(event.agent_id))
      ).length,
    },
  };
}

async function insertRows(supabase: SupabaseClient, table: string, inserts: AnyRow[]) {
  if (!inserts.length) return 0;
  const { error } = await supabase.from(table).insert(inserts);

  if (error) {
    throw new Error(`${table} insert failed: ${error.message}`);
  }

  return inserts.length;
}

async function rebuildTimelines(supabase: SupabaseClient, reads: Record<string, TableRead>) {
  const timeline = rows(reads, "trust_timeline_events");
  const receiptEvents = rows(reads, "verification_receipts").filter(
    (receipt) => !hasSubjectEvent(timeline, "verification_receipt_issued", receipt.subject_type, receipt.subject_id)
  );
  const chainEvents = rows(reads, "evidence_chains").filter(
    (chain) => !hasSubjectEvent(timeline, "evidence_chain_created", chain.subject_type, chain.subject_id)
  );
  const governanceEvents = rows(reads, "governance_actions").filter(
    (action) => !hasMetadataEvent(timeline, "governance_action_created", "governance_action_id", rowId(action))
  );
  const replayEvents = rows(reads, "trust_replay_sessions").filter(
    (replay) => subjectKey(replay.subject_type, replay.subject_id) &&
      !hasMetadataEvent(timeline, "replay_snapshot_recorded", "trust_replay_session_id", rowId(replay))
  );

  return insertRows(supabase, "trust_timeline_events", [
    ...receiptEvents.map((receipt) => ({
      subject_type: receipt.subject_type,
      subject_id: receipt.subject_id,
      event_type: "verification_receipt_issued",
      event_title: "Verification receipt issued",
      event_summary: receipt.receipt_summary ?? "Verification receipt backfilled for timeline continuity.",
      actor_type: "human_governance",
      actor_id: receipt.issued_by ?? null,
      metadata: { ...receipt, repair_source: "trust_integrity_repair" },
      severity: "info",
      created_at: receipt.issued_at ?? new Date().toISOString(),
    })),
    ...chainEvents.map((chain) => ({
      subject_type: chain.subject_type,
      subject_id: chain.subject_id,
      event_type: "evidence_chain_created",
      event_title: "Evidence chain created",
      event_summary: chain.chain_summary ?? "Evidence chain backfilled for timeline continuity.",
      actor_type: "evidence_chain_registry",
      actor_id: null,
      metadata: { ...chain, repair_source: "trust_integrity_repair" },
      severity: "info",
      created_at: chain.created_at ?? new Date().toISOString(),
    })),
    ...governanceEvents.map((action) => ({
      subject_type: action.subject_type,
      subject_id: action.subject_id,
      event_type: "governance_action_created",
      event_title: "Governance action created",
      event_summary: action.resolution_notes ?? "Governance action backfilled for timeline continuity.",
      actor_type: "governance_engine",
      actor_id: action.assigned_to ?? null,
      metadata: {
        governance_action_id: action.id,
        policy_id: action.policy_id,
        action_status: action.action_status,
        repair_source: "trust_integrity_repair",
      },
      severity: stringValue(action.action_status) === "escalated" ? "review" : "info",
      created_at: action.created_at ?? new Date().toISOString(),
    })),
    ...replayEvents.map((replay) => ({
      subject_type: replay.subject_type,
      subject_id: replay.subject_id,
      event_type: "replay_snapshot_recorded",
      event_title: "Replay snapshot recorded",
      event_summary: replay.replay_summary ?? "Replay snapshot backfilled for timeline continuity.",
      actor_type: replay.generated_by ?? "trust_replay",
      actor_id: null,
      metadata: {
        trust_replay_session_id: replay.id,
        generated_by: replay.generated_by,
        repair_source: "trust_integrity_repair",
      },
      severity: "info",
      created_at: replay.created_at ?? new Date().toISOString(),
    })),
  ]);
}

async function rebuildRelationships(supabase: SupabaseClient, reads: Record<string, TableRead>) {
  const relationships = rows(reads, "trust_relationships");
  const desired = compact([
    ...rows(reads, "verification_receipts").map((receipt) =>
      subjectKey(receipt.subject_type, receipt.subject_id)
        ? {
            source_type: "verification_receipt",
            source_id: receipt.id,
            relationship_type: "verified_by",
            target_type: receipt.subject_type,
            target_id: receipt.subject_id,
            confidence_level: receipt.confidence_level ?? "medium",
            explanation: "Verification receipt is linked to its operational trust subject.",
            created_at: receipt.issued_at ?? new Date().toISOString(),
          }
        : null
    ),
    ...rows(reads, "evidence_chains").map((chain) =>
      subjectKey(chain.subject_type, chain.subject_id)
        ? {
            source_type: "evidence_chain",
            source_id: chain.id,
            relationship_type: "linked_to",
            target_type: chain.subject_type,
            target_id: chain.subject_id,
            confidence_level: "medium",
            explanation: "Evidence chain is linked to its operational trust subject.",
            created_at: chain.created_at ?? new Date().toISOString(),
          }
        : null
    ),
    ...rows(reads, "governance_actions").map((action) =>
      subjectKey(action.subject_type, action.subject_id)
        ? {
            source_type: "governance_action",
            source_id: action.id,
            relationship_type: "escalated_to",
            target_type: action.subject_type,
            target_id: action.subject_id,
            confidence_level: stringValue(action.action_status) === "escalated" ? "high" : "medium",
            explanation: "Governance action is linked to the workflow subject it governs.",
            created_at: action.created_at ?? new Date().toISOString(),
          }
        : null
    ),
    ...rows(reads, "interview_risk_events").map((event) =>
      stringValue(event.interview_session_id)
        ? {
            source_type: "interview_risk_event",
            source_id: event.id,
            relationship_type: "generated_signal",
            target_type: "interview_session",
            target_id: event.interview_session_id,
            confidence_level: event.escalation_required ? "high" : "medium",
            explanation: "Interview risk event is linked to its interview session.",
            created_at: event.created_at ?? new Date().toISOString(),
          }
        : null
    ),
  ]).filter((relationship) => !hasRelationship(relationships, relationship));

  return insertRows(supabase, "trust_relationships", desired);
}

async function regenerateReceipts(supabase: SupabaseClient, reads: Record<string, TableRead>) {
  const receipts = rows(reads, "verification_receipts");
  const receiptSubjects = new Set(receipts.map((receipt) => subjectKey(receipt.subject_type, receipt.subject_id)));
  const missingInterviewReceipts = rows(reads, "interview_sessions").filter(
    (session) => !receiptSubjects.has(subjectKey("interview_session", session.id))
  );

  return insertRows(
    supabase,
    "verification_receipts",
    missingInterviewReceipts.map((session) => ({
      subject_type: "interview_session",
      subject_id: session.id,
      receipt_type: "interview_integrity_review_backfilled",
      verification_status: session.integrity_status ?? session.session_status ?? "pending",
      confidence_level: stringValue(session.risk_level) === "high" ? "Elevated Risk" : "In Review",
      issued_by: session.user_id ?? null,
      receipt_summary:
        "Interview integrity receipt was backfilled to preserve operational trust continuity. Human review remains authoritative.",
      evidence_snapshot: {
        interview_session_id: session.id,
        candidate_profile_id: session.candidate_profile_id ?? session.candidate_id ?? null,
        recruiter_profile_id: session.recruiter_profile_id ?? null,
        repair_source: "trust_integrity_repair",
      },
      issued_at: session.created_at ?? new Date().toISOString(),
    }))
  );
}

async function repairReplayOrdering(supabase: SupabaseClient, reads: Record<string, TableRead>) {
  const replay = rows(reads, "trust_replay_sessions");
  const replaySubjects = new Set(replay.map((event) => subjectKey(event.subject_type, event.subject_id)).filter(Boolean));
  const missingInterviewReplay = rows(reads, "interview_sessions").filter(
    (session) => !replaySubjects.has(subjectKey("interview_session", session.id))
  );

  return insertRows(
    supabase,
    "trust_replay_sessions",
    missingInterviewReplay.map((session) => ({
      subject_type: "interview_session",
      subject_id: session.id,
      replay_summary:
        "Backfilled replay snapshot preserves interview workflow creation, receipt continuity and human-governance review context.",
      generated_by: "trust_integrity_repair",
      created_at: session.created_at ?? new Date().toISOString(),
    }))
  );
}

export async function runTrustIntegrityRepair(
  action: TrustIntegrityRepairAction
): Promise<TrustIntegrityRepairResult> {
  const supabase = createServiceRoleClient();
  const reads = await readIntegrityTables(supabase);
  const repaired: Record<string, number> = {};
  const warnings = tableUnavailable(reads);

  if (action === "rebuild_timelines" || action === "run_all") {
    repaired.timelines = await rebuildTimelines(supabase, reads);
  }

  if (action === "rebuild_relationships" || action === "run_all") {
    repaired.relationships = await rebuildRelationships(supabase, reads);
  }

  if (action === "regenerate_receipts" || action === "run_all") {
    repaired.receipts = await regenerateReceipts(supabase, reads);
  }

  if (action === "repair_replay_ordering" || action === "run_all") {
    repaired.replay = await repairReplayOrdering(supabase, reads);
  }

  return {
    action,
    summary: await auditTrustIntegrity(),
    repaired,
    warnings,
  };
}
