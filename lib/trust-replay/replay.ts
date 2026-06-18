import {
  formatTimelineDate,
  timelineCategory,
  type TrustTimelineEvent,
} from "@/lib/trust-timeline/provenance";
import { buildTrustPosture, latestCreatedAt, type TrustPosture } from "@/lib/trust-posture/posture";

export type ReplayRow = Record<string, any>;

export type ReplaySnapshot = {
  subject_type: string;
  subject_id: string | null;
  as_of: string;
  summary: string;
  evidence: ReplayRow[];
  signals: ReplayRow[];
  decisions: ReplayRow[];
  auditLogs: ReplayRow[];
  relationships: ReplayRow[];
  aiSummaries: ReplayRow[];
  timelineEvents: TrustTimelineEvent[];
  posture: TrustPosture;
};

export type ReplaySession = {
  id: string;
  subject_type: string | null;
  subject_id: string | null;
  replay_summary: string | null;
  generated_by: string | null;
  created_at: string | null;
};

function sortByCreatedAt<T extends { created_at?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const left = a.created_at ? new Date(a.created_at).getTime() : 0;
    const right = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
    if (!Number.isFinite(left)) return 1;
    if (!Number.isFinite(right)) return -1;
    return left - right;
  });
}

export function isAtOrBefore(row: ReplayRow, asOf: string) {
  const rowDate = new Date(String(row.created_at ?? 0)).getTime();
  const asOfDate = new Date(asOf).getTime();
  return Number.isFinite(rowDate) && Number.isFinite(asOfDate) && rowDate <= asOfDate;
}

export function rowMetadata(row: ReplayRow) {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? (row.metadata as Record<string, any>)
    : {};
}

export function subjectMatches(row: ReplayRow, subjectType: string, subjectId: string | null) {
  if (!subjectId) return true;
  const metadata = rowMetadata(row);
  const values = [
    row.subject_id,
    row.passport_id,
    row.agent_id,
    row.verification_case_id,
    row.source_id,
    row.target_id,
    metadata.subject_id,
    metadata.passport_id,
    metadata.agent_id,
    metadata.verification_case_id,
  ]
    .filter(Boolean)
    .map(String);

  return values.includes(subjectId);
}

function timelineSubjectMatches(
  event: TrustTimelineEvent,
  subjectId: string | null
) {
  if (!subjectId) return true;

  const metadata = rowMetadata(event);
  const values = [
    event.subject_id,
    metadata.subject_id,
    metadata.passport_id,
    metadata.agent_id,
    metadata.verification_case_id,
    metadata.interview_session_id,
    metadata.session_id,
  ]
    .filter(Boolean)
    .map(String);

  return values.includes(subjectId);
}

export function buildReplaySnapshot(input: {
  subjectType: string;
  subjectId: string | null;
  asOf: string;
  evidence: ReplayRow[];
  signals: ReplayRow[];
  decisions: ReplayRow[];
  auditLogs: ReplayRow[];
  relationships: ReplayRow[];
  aiSummaries: ReplayRow[];
  timelineEvents: TrustTimelineEvent[];
}): ReplaySnapshot {
  const filterRows = (rows: ReplayRow[]) =>
    sortByCreatedAt(
      rows
        .filter((row) => isAtOrBefore(row, input.asOf))
        .filter((row) => subjectMatches(row, input.subjectType, input.subjectId))
    );
  const timelineEvents = sortByCreatedAt(
    input.timelineEvents
      .filter((event) =>
        event.created_at ? new Date(event.created_at).getTime() <= new Date(input.asOf).getTime() : false
      )
      .filter((event) => {
        return timelineSubjectMatches(event, input.subjectId);
      })
  );
  const evidence = filterRows(input.evidence);
  const signals = filterRows(input.signals);
  const decisions = filterRows(input.decisions);
  const auditLogs = filterRows(input.auditLogs);
  const relationships = filterRows(input.relationships);
  const aiSummaries = filterRows(input.aiSummaries);
  const openGovernanceCount = decisions.filter((row) =>
    ["pending", "in_review", "escalated"].includes(String(row.action_status ?? row.status ?? row.decision ?? ""))
  ).length;
  const posture = buildTrustPosture({
    lastVerifiedAt: latestCreatedAt(decisions) ?? latestCreatedAt(input.timelineEvents),
    lastGovernanceAt: latestCreatedAt(decisions),
    lastEvidenceAt: latestCreatedAt(evidence),
    lastSignalAt: latestCreatedAt(signals),
    evidenceCount: evidence.length,
    signalCount: signals.length,
    unresolvedGovernanceCount: openGovernanceCount,
    confidenceLabel: openGovernanceCount ? "governance pending" : "reviewable",
  });
  const summary = [
    `Replay as of ${formatTimelineDate(input.asOf)}.`,
    `${evidence.length} evidence records existed.`,
    `${decisions.length} governance decisions were available.`,
    `${signals.length} signals and ${auditLogs.length} audit events were present.`,
    `${relationships.length} trust relationships were recorded.`,
    `Trust freshness: ${posture.label}.`,
  ].join(" ");

  return {
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    as_of: input.asOf,
    summary,
    evidence,
    signals,
    decisions,
    auditLogs,
    relationships,
    aiSummaries,
    timelineEvents,
    posture,
  };
}

export function replayStage(eventType: string) {
  const category = timelineCategory(eventType);
  if (category === "evidence") return "Evidence state";
  if (category === "signals") return "Signal state";
  if (category === "agents") return "Agent activity";
  if (category === "passports") return "Trust change";
  return "Governance action";
}

export function replayDefaultAsOf() {
  return new Date().toISOString();
}
