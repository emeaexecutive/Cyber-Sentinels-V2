import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  findTimelineEvent,
  formatTimelineTimeAgo,
  normalizeTimelineEvents,
  type AuditLogRow,
  type DecisionTimelineRow,
  type PassportTimelineRow,
  type SignalTimelineRow,
  type TrustReportTimelineRow,
  type VerificationCaseTimelineRow,
} from "@/lib/trust-engine/timeline";

export const dynamic = "force-dynamic";

type TimelineDetailPageProps = {
  params: Promise<{ id: string }>;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function fetchRows<T>(
  supabase: SupabaseServerClient,
  table: string,
  select: string,
  limit = 40
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  return error ? [] : data ?? [];
}

function DetailMetric({
  label,
  before,
  after,
}: {
  label: string;
  before: number | null;
  after: number | null;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold">
        {before ?? "new"} → {after ?? "pending"}
      </p>
    </div>
  );
}

export default async function TrustTimelineDetailPage({
  params,
}: TimelineDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    auditLogs,
    signals,
    verificationCases,
    decisions,
    passports,
    trustReports,
  ] = await Promise.all([
    fetchRows<AuditLogRow>(
      supabase,
      "audit_logs",
      "id,event_type,actor,metadata,created_at"
    ),
    fetchRows<SignalTimelineRow>(supabase, "signals", "id,event,created_at"),
    fetchRows<VerificationCaseTimelineRow>(
      supabase,
      "verification_cases",
      "id,subject_name,subject_type,status,verification_status,decision_type,human_presence_index,origin_trace_score,trust_score,created_at"
    ),
    fetchRows<DecisionTimelineRow>(
      supabase,
      "decisions",
      "id,verification_case_id,decision,status,actor,created_at"
    ),
    fetchRows<PassportTimelineRow>(
      supabase,
      "passports",
      "id,subject_name,subject_type,trust_score,human_presence_index,origin_trace_score,review_status,clearance,reality_passport_status,created_at"
    ),
    fetchRows<TrustReportTimelineRow>(
      supabase,
      "trust_reports",
      "id,candidate_name,trust_score,human_presence_index,origin_trace_score,review_status,created_at"
    ),
  ]);

  const timeline = normalizeTimelineEvents({
    auditLogs,
    signals,
    verificationCases,
    decisions,
    passports,
    trustReports,
  });
  const event = findTimelineEvent(timeline, id);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/trust-timeline"
          className="text-sm text-zinc-400 hover:text-white"
        >
          Back to Trust Timeline
        </Link>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            {event.source}
          </p>
          <h1 className="mt-4 text-4xl font-semibold">{event.event}</h1>
          <div className="mt-5 grid gap-3 text-sm text-zinc-400 md:grid-cols-3">
            <p>event_type: {event.event_type}</p>
            <p>actor: {event.actor ?? "system"}</p>
            <p>{formatTimelineTimeAgo(event.created_at)}</p>
          </div>
          <p className="mt-4 w-fit rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300">
            {event.severity}
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <DetailMetric
            label="Trust Score"
            before={event.trust_score_before}
            after={event.trust_score_after}
          />
          <DetailMetric
            label="Human Presence"
            before={event.human_presence_before}
            after={event.human_presence_after}
          />
          <DetailMetric
            label="Origin Trace"
            before={event.origin_trace_before}
            after={event.origin_trace_after}
          />
        </section>
      </div>
    </main>
  );
}
