export type TimelineSeverity = "verified" | "reviewing" | "escalated" | "information";

export type TimelineEvent = {
  id: string;
  event: string;
  event_type: string;
  severity: TimelineSeverity;
  actor: string | null;
  source: string;
  created_at: string;
  trust_score_before: number | null;
  trust_score_after: number | null;
  human_presence_before: number | null;
  human_presence_after: number | null;
  origin_trace_before: number | null;
  origin_trace_after: number | null;
};

export type TimelineMetrics = {
  eventsToday: number;
  trustChanges: number;
  manualReviews: number;
  realityUpdates: number;
};

export type AuditLogRow = {
  id: string;
  event_type: string;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

export type SignalTimelineRow = {
  id: string;
  event: string;
  created_at: string | null;
};

export type VerificationCaseTimelineRow = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  status: string | null;
  verification_status: string | null;
  decision_type: string | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  trust_score: number | null;
  created_at: string | null;
};

export type DecisionTimelineRow = {
  id: string;
  verification_case_id: string | null;
  decision: string | null;
  status: string | null;
  actor: string | null;
  created_at: string | null;
};

export type PassportTimelineRow = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  trust_score: number | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  review_status: string | null;
  clearance: string | null;
  reality_passport_status: string | null;
  created_at: string | null;
};

export type TrustReportTimelineRow = {
  id: string;
  candidate_name: string | null;
  trust_score: number | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  review_status: string | null;
  created_at: string | null;
};

export type TimelineSources = {
  auditLogs?: AuditLogRow[] | null;
  signals?: SignalTimelineRow[] | null;
  verificationCases?: VerificationCaseTimelineRow[] | null;
  decisions?: DecisionTimelineRow[] | null;
  passports?: PassportTimelineRow[] | null;
  trustReports?: TrustReportTimelineRow[] | null;
};

const demoEvents = [
  "Candidate verification started",
  "Origin trace weak",
  "Human Presence recalculated",
  "Admin approved trust passport",
  "Reality Passport updated",
];

function nowIso() {
  return new Date().toISOString();
}

function numberFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatTimelineTimeAgo(value: string) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );

  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;

  return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

export function inferTimelineSeverity(
  eventType: string,
  status?: string | null
): TimelineSeverity {
  const normalized = `${eventType} ${status ?? ""}`.toLowerCase();

  if (normalized.includes("verified") || normalized.includes("approved")) {
    return "verified";
  }

  if (
    normalized.includes("review") ||
    normalized.includes("pending") ||
    normalized.includes("submitted")
  ) {
    return "reviewing";
  }

  if (
    normalized.includes("escalated") ||
    normalized.includes("mismatch") ||
    normalized.includes("weak") ||
    normalized.includes("risk")
  ) {
    return "escalated";
  }

  return "information";
}

export function createDemoTimelineEvents(now = new Date()): TimelineEvent[] {
  return demoEvents.map((event, index) => {
    const createdAt = new Date(now.getTime() - index * 1000 * 60 * 23);
    const eventType = event.toLowerCase().replaceAll(" ", "_");

    return {
      id: `demo-timeline-${index}`,
      event,
      event_type: eventType,
      severity: inferTimelineSeverity(eventType),
      actor: "demo",
      source: "demo",
      created_at: createdAt.toISOString(),
      trust_score_before: index === 3 ? 92 : null,
      trust_score_after: index === 3 ? 96 : null,
      human_presence_before: index === 2 ? 87 : null,
      human_presence_after: index === 2 ? 94 : null,
      origin_trace_before: index === 1 ? 61 : null,
      origin_trace_after: index === 1 ? 85 : null,
    };
  });
}

export function normalizeTimelineEvents(sources: TimelineSources): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const log of sources.auditLogs ?? []) {
    const metadata = log.metadata ?? {};
    const trustScore = numberFromMetadata(metadata, "trust_score") ?? numberFromMetadata(metadata, "score");
    const humanPresence = numberFromMetadata(metadata, "human_presence_index");
    const originTrace = numberFromMetadata(metadata, "origin_trace_score");

    events.push({
      id: `audit-${log.id}`,
      event: log.event_type,
      event_type: log.event_type,
      severity: inferTimelineSeverity(log.event_type),
      actor: log.actor,
      source: "audit_logs",
      created_at: log.created_at ?? nowIso(),
      trust_score_before: null,
      trust_score_after: trustScore,
      human_presence_before: null,
      human_presence_after: humanPresence,
      origin_trace_before: null,
      origin_trace_after: originTrace,
    });
  }

  for (const signal of sources.signals ?? []) {
    events.push({
      id: `signal-${signal.id}`,
      event: signal.event,
      event_type: signal.event.toLowerCase().replaceAll(" ", "_"),
      severity: inferTimelineSeverity(signal.event),
      actor: "system",
      source: "signals",
      created_at: signal.created_at ?? nowIso(),
      trust_score_before: null,
      trust_score_after: null,
      human_presence_before: null,
      human_presence_after: null,
      origin_trace_before: null,
      origin_trace_after: null,
    });
  }

  for (const item of sources.verificationCases ?? []) {
    const status = item.verification_status ?? item.status ?? "pending";

    events.push({
      id: `case-${item.id}`,
      event: `${item.subject_name ?? "Verification"} ${status}`,
      event_type: "verification_started",
      severity: inferTimelineSeverity("verification_started", status),
      actor: null,
      source: "verification_cases",
      created_at: item.created_at ?? nowIso(),
      trust_score_before: null,
      trust_score_after: item.trust_score,
      human_presence_before: null,
      human_presence_after: item.human_presence_index,
      origin_trace_before: null,
      origin_trace_after: item.origin_trace_score,
    });
  }

  for (const decision of sources.decisions ?? []) {
    events.push({
      id: `decision-${decision.id}`,
      event: `Decision completed: ${decision.decision ?? "manual_review"}`,
      event_type: "decision_completed",
      severity: inferTimelineSeverity(decision.decision ?? "decision_completed", decision.status),
      actor: decision.actor,
      source: "decisions",
      created_at: decision.created_at ?? nowIso(),
      trust_score_before: null,
      trust_score_after: null,
      human_presence_before: null,
      human_presence_after: null,
      origin_trace_before: null,
      origin_trace_after: null,
    });
  }

  for (const passport of sources.passports ?? []) {
    events.push({
      id: `passport-${passport.id}`,
      event: `${passport.subject_name ?? "Trust Passport"} created`,
      event_type: "passport_created",
      severity: inferTimelineSeverity("passport_created", passport.review_status),
      actor: passport.subject_type,
      source: "passports",
      created_at: passport.created_at ?? nowIso(),
      trust_score_before: null,
      trust_score_after: passport.trust_score,
      human_presence_before: null,
      human_presence_after: passport.human_presence_index,
      origin_trace_before: null,
      origin_trace_after: passport.origin_trace_score,
    });

    if (passport.reality_passport_status) {
      events.push({
        id: `reality-${passport.id}`,
        event: `${passport.subject_name ?? "Reality Passport"} updated`,
        event_type: "reality_passport_updated",
        severity: inferTimelineSeverity("reality_passport_updated", passport.reality_passport_status),
        actor: passport.subject_type,
        source: "passports",
        created_at: passport.created_at ?? nowIso(),
        trust_score_before: null,
        trust_score_after: passport.trust_score,
        human_presence_before: null,
        human_presence_after: passport.human_presence_index,
        origin_trace_before: null,
        origin_trace_after: passport.origin_trace_score,
      });
    }
  }

  for (const report of sources.trustReports ?? []) {
    events.push({
      id: `report-${report.id}`,
      event: `${report.candidate_name ?? "Candidate"} trust report created`,
      event_type: "candidate_trust_report_created",
      severity: inferTimelineSeverity("candidate_trust_report_created", report.review_status),
      actor: report.candidate_name,
      source: "trust_reports",
      created_at: report.created_at ?? nowIso(),
      trust_score_before: null,
      trust_score_after: report.trust_score,
      human_presence_before: null,
      human_presence_after: report.human_presence_index,
      origin_trace_before: null,
      origin_trace_after: report.origin_trace_score,
    });
  }

  const sortedEvents = events.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return sortedEvents.length ? sortedEvents : createDemoTimelineEvents();
}

export function calculateTimelineMetrics(events: TimelineEvent[]): TimelineMetrics {
  const today = new Date().toDateString();

  return {
    eventsToday: events.filter(
      (event) => new Date(event.created_at).toDateString() === today
    ).length,
    trustChanges: events.filter(
      (event) =>
        event.trust_score_before !== null ||
        event.trust_score_after !== null ||
        event.human_presence_after !== null ||
        event.origin_trace_after !== null
    ).length,
    manualReviews: events.filter((event) =>
      `${event.event} ${event.event_type}`.toLowerCase().includes("review")
    ).length,
    realityUpdates: events.filter((event) =>
      event.event_type.includes("reality")
    ).length,
  };
}

export function findTimelineEvent(events: TimelineEvent[], id: string) {
  return events.find((event) => event.id === id) ?? null;
}
