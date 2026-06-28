import type { createClient } from "@/lib/supabase/server";
import {
  buildContinuousTrustSignals,
  buildTrustPosture,
  continuousTrustBadge,
  latestCreatedAt,
  type ContextualTrustSignal,
  type TrustPosture,
  type TrustPostureBadge,
} from "@/lib/trust-posture/posture";

type AnyRow = Record<string, any>;
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type TrustPostureSummary = {
  id: string;
  subject: string;
  context: string;
  level: string;
  badge: TrustPostureBadge;
  updatedAt: string | null;
};

export type TrustPostureDashboardSnapshot = {
  activeTrustLevel: number | null;
  activeTrustLabel: string;
  badge: TrustPostureBadge;
  posture: TrustPosture;
  contextualSignals: ContextualTrustSignal[];
  metrics: {
    contextChanges: number;
    reverificationDue: number;
    governanceReviews: number;
    elevatedIndicators: number;
    recentEvents: number;
  };
  summaries: TrustPostureSummary[];
  reviewQueue: AnyRow[];
  elevatedRisk: AnyRow[];
  recentEvents: AnyRow[];
  sessionAnomalies: AnyRow[];
};

async function fetchRows(
  supabase: SupabaseClient,
  table: string,
  limit: number,
  orderColumn = "created_at"
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(orderColumn, { ascending: false })
    .limit(limit)
    .returns<AnyRow[]>();

  return error ? [] : data ?? [];
}

function scoreLabel(score: number | null) {
  if (score === null) return "Not calculated";
  if (score >= 75) return "Trusted";
  if (score >= 50) return "Reviewable with context";
  return "Elevated risk context";
}

function numericScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function rowLabel(row: AnyRow) {
  return String(
    row.event_title ?? row.event_type ?? row.category ?? row.action_type ?? row.subject_name ?? "Trust event"
  );
}

export async function loadTrustPostureDashboard(
  supabase: SupabaseClient
): Promise<TrustPostureDashboardSnapshot> {
  const [
    passports,
    checks,
    verificationSignals,
    governanceActions,
    timelineEvents,
    receipts,
  ] = await Promise.all([
    fetchRows(supabase, "passports", 100),
    fetchRows(supabase, "session_integrity_checks", 120),
    fetchRows(supabase, "verification_signals", 300),
    fetchRows(supabase, "governance_actions", 160),
    fetchRows(supabase, "trust_timeline_events", 160),
    fetchRows(supabase, "verification_receipts", 120, "issued_at"),
  ]);

  const scoredPassports = passports
    .map((row) => numericScore(row.trust_score))
    .filter((score): score is number => score !== null);
  const activeTrustLevel = scoredPassports.length
    ? Math.round(scoredPassports.reduce((sum, score) => sum + score, 0) / scoredPassports.length)
    : null;
  const openGovernance = governanceActions.filter((row) =>
    ["pending", "in_review", "escalated"].includes(String(row.action_status ?? row.status ?? ""))
  );
  const elevatedRisk = verificationSignals.filter(
    (row) => ["medium", "high"].includes(String(row.risk_level)) || row.requires_manual_review === true
  );
  const sessionAnomalies = verificationSignals.filter(
    (row) => row.category === "session_anomaly" &&
      (["medium", "high"].includes(String(row.risk_level)) || row.requires_manual_review === true)
  );
  const manualReviewChecks = checks.filter((row) => row.manual_review_required === true);
  const latestReceipt = receipts[0];
  const latestCheck = checks[0];
  const overallPosture = buildTrustPosture({
    lastVerifiedAt: latestReceipt?.issued_at ?? latestCheck?.created_at,
    lastGovernanceAt: latestCreatedAt(governanceActions),
    lastEvidenceAt: latestReceipt?.issued_at,
    lastSignalAt: latestCreatedAt(verificationSignals),
    evidenceCount: receipts.length,
    signalCount: verificationSignals.length,
    unresolvedGovernanceCount: openGovernance.length,
    confidenceLabel: scoreLabel(activeTrustLevel),
  });
  const continuousInput = {
    posture: overallPosture,
    verificationSignals,
    sessionChecks: checks,
    governanceActions,
  };
  const contextualSignals = buildContinuousTrustSignals(continuousInput);
  const badge = continuousTrustBadge(continuousInput);

  const passportSummaries = passports.slice(0, 8).map((passport) => {
    const trustScore = numericScore(passport.trust_score);
    const passportPosture = buildTrustPosture({
      lastVerifiedAt: passport.created_at,
      evidenceCount: passport.verified ? 1 : 0,
      confidenceLabel: scoreLabel(trustScore),
    });
    const passportBadge: TrustPostureBadge = passportPosture.reverificationRecommended
      ? "reverification_due"
      : trustScore !== null && trustScore < 50
        ? "elevated_risk"
        : "trusted";

    return {
      id: String(passport.id),
      subject: String(passport.subject_name ?? "Trust passport"),
      context: String(passport.subject_type ?? "identity"),
      level: trustScore === null ? "Not calculated" : `${trustScore}/100`,
      badge: passportBadge,
      updatedAt: passport.created_at ?? null,
    };
  });
  const sessionSummaries = checks.slice(0, 8).map((check) => {
    const relatedSignals = verificationSignals.filter(
      (row) => String(row.interview_session_id) === String(check.interview_session_id)
    );
    const hasElevated = relatedSignals.some(
      (row) => ["medium", "high"].includes(String(row.risk_level))
    );
    return {
      id: String(check.interview_session_id ?? check.id),
      subject: `Session ${String(check.interview_session_id ?? check.id).slice(0, 8)}`,
      context: "session integrity",
      level: String(check.identity_verification_state ?? "pending"),
      badge: (check.manual_review_required
        ? "governance_review"
        : hasElevated
          ? "elevated_risk"
          : "trusted") as TrustPostureBadge,
      updatedAt: check.created_at ?? null,
    };
  });
  const recentEvents: AnyRow[] = [
    ...timelineEvents.map((row): AnyRow => ({ ...row, posture_source: "timeline", posture_label: rowLabel(row) })),
    ...verificationSignals.map((row): AnyRow => ({ ...row, posture_source: "signal", posture_label: rowLabel(row) })),
    ...checks.map((row): AnyRow => ({ ...row, posture_source: "session", posture_label: "Session integrity reviewed" })),
  ]
    .sort((left, right) => new Date(String(right.created_at ?? 0)).getTime() - new Date(String(left.created_at ?? 0)).getTime())
    .slice(0, 12);

  return {
    activeTrustLevel,
    activeTrustLabel: scoreLabel(activeTrustLevel),
    badge,
    posture: overallPosture,
    contextualSignals,
    metrics: {
      contextChanges: contextualSignals.filter((signal) => signal.status === "changed").length,
      reverificationDue: passportSummaries.filter((item) => item.badge === "reverification_due").length +
        (overallPosture.state === "reverification_due" ? 1 : 0),
      governanceReviews: openGovernance.length + manualReviewChecks.length,
      elevatedIndicators: elevatedRisk.length,
      recentEvents: recentEvents.length,
    },
    summaries: [...sessionSummaries, ...passportSummaries].slice(0, 12),
    reviewQueue: [
      ...openGovernance.map((row) => ({ ...row, posture_queue_type: "governance" })),
      ...manualReviewChecks.map((row) => ({ ...row, posture_queue_type: "session" })),
    ].slice(0, 12),
    elevatedRisk: elevatedRisk.slice(0, 12),
    recentEvents,
    sessionAnomalies: sessionAnomalies.slice(0, 12),
  };
}
