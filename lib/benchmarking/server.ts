import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBenchmarkObservations } from "@/lib/benchmarking/records";

type Row = Record<string, any>;

async function fetchRows(
  supabase: SupabaseClient,
  table: string,
  limit = 200
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();

  return error ? [] : data ?? [];
}

export async function loadBenchmarkObservations(supabase: SupabaseClient) {
  const [
    signals,
    governanceActions,
    replaySessions,
    sessionIntegrityChecks,
    trustTimelineEvents,
    auditLogs,
    adminReviews,
    interviewSessions,
    verificationEvents,
    candidateProfiles,
    recruiterProfiles,
    interviewRiskEvents,
  ] = await Promise.all([
    fetchRows(supabase, "signals"),
    fetchRows(supabase, "governance_actions"),
    fetchRows(supabase, "trust_replay_sessions"),
    fetchRows(supabase, "session_integrity_checks"),
    fetchRows(supabase, "trust_timeline_events"),
    fetchRows(supabase, "audit_logs"),
    fetchRows(supabase, "admin_reviews"),
    fetchRows(supabase, "interview_sessions"),
    fetchRows(supabase, "verification_events"),
    fetchRows(supabase, "candidate_profiles"),
    fetchRows(supabase, "recruiter_profiles"),
    fetchRows(supabase, "interview_risk_events"),
  ]);
  const providerSignals = [...signals, ...verificationEvents].filter((row) =>
    /provider|verification/i.test(
      `${row.provider_name ?? ""} ${row.provider ?? ""} ${row.provider_id ?? ""} ${row.source_type ?? ""}`
    )
  );

  return buildBenchmarkObservations({
    providerSignals,
    governanceActions,
    replaySessions,
    sessionIntegrityChecks,
    trustEvents: [...trustTimelineEvents, ...signals, ...auditLogs],
    reviewRecords: [...adminReviews, ...auditLogs],
    workflowRecords: [...interviewSessions, ...verificationEvents],
    candidateProfiles,
    recruiterProfiles,
    interviewRiskEvents,
  });
}
