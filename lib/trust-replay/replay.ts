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
  canonicalMemory: {
    actor: string;
    workflow: string;
    evidenceState: string;
    trustEvolution: string;
    authorizationLineage: string;
    governanceState: string;
    chronologyCount: number;
    evidenceContinuityCount: number;
    governanceInterventionCount: number;
    authorizationReferenceCount: number;
    reconstructableAsOf: string;
    accountableActors: string[];
    operationalOutcome: string;
    detectionSources: string[];
  };
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
    if (left !== right) return left - right;
    const leftId = String((a as ReplayRow).id ?? "");
    const rightId = String((b as ReplayRow).id ?? "");
    return leftId.localeCompare(rightId);
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
  if (
    subjectType !== "all" &&
    row.subject_type &&
    String(row.subject_type) !== subjectType
  ) {
    return false;
  }
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
  subjectType: string,
  subjectId: string | null
) {
  if (
    subjectType !== "all" &&
    event.subject_type &&
    String(event.subject_type) !== subjectType
  ) {
    return false;
  }
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
        return timelineSubjectMatches(event, input.subjectType, input.subjectId);
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
    lastVerifiedAt: latestCreatedAt(decisions) ?? latestCreatedAt(timelineEvents),
    lastGovernanceAt: latestCreatedAt(decisions),
    lastEvidenceAt: latestCreatedAt(evidence),
    lastSignalAt: latestCreatedAt(signals),
    evidenceCount: evidence.length,
    signalCount: signals.length,
    unresolvedGovernanceCount: openGovernanceCount,
    confidenceLabel: openGovernanceCount ? "governance pending" : "reviewable",
    now: new Date(input.asOf),
  });
  const summary = [
    `Replay as of ${formatTimelineDate(input.asOf)}.`,
    `${evidence.length} evidence records existed.`,
    `${decisions.length} governance decisions were available.`,
    `${signals.length} signals and ${auditLogs.length} audit events were present.`,
    `${relationships.length} trust relationships were recorded.`,
    `Trust freshness: ${posture.label}.`,
  ].join(" ");
  const accountableActors = [...new Set(
    [...decisions, ...auditLogs]
      .map((row) => row.reviewer ?? row.reviewed_by ?? row.actor ?? row.actor_email ?? row.generated_by)
      .filter(Boolean)
      .map(String)
  )];
  const latestDecision = decisions.at(-1);
  const operationalOutcome = String(
    latestDecision?.resolution_notes ??
      latestDecision?.decision ??
      latestDecision?.action_status ??
      latestDecision?.status ??
      (openGovernanceCount
        ? "Governance review remains open."
        : "No final governance outcome was recorded.")
  );
  const actor = accountableActors.join(", ") || "No accountable actor recorded";
  const workflow = `${input.subjectType}:${input.subjectId ?? "all"}`;
  const evidenceState = `${evidence.length} evidence records and ${signals.length} signal records preserved`;
  const trustEvolution = `${timelineEvents.length} timeline events reconstruct trust as ${posture.label}`;
  const authorizationLineage = `${relationships.length} relationship or authorization references preserved`;
  const governanceState = openGovernanceCount
    ? `${openGovernanceCount} governance reviews remain open`
    : `${decisions.length} governance decisions recorded`;
  const detectionSources = [...new Set(
    signals
      .map((row) => row.detection_source ?? row.signal_source ?? rowMetadata(row).detection_source)
      .filter(Boolean)
      .map(String)
  )];

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
    canonicalMemory: {
      actor,
      workflow,
      evidenceState,
      trustEvolution,
      authorizationLineage,
      governanceState,
      chronologyCount: timelineEvents.length + auditLogs.length,
      evidenceContinuityCount: evidence.length,
      governanceInterventionCount: decisions.length,
      authorizationReferenceCount: relationships.length,
      reconstructableAsOf: input.asOf,
      accountableActors,
      operationalOutcome,
      detectionSources,
    },
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
