import Link from "next/link";
import { ProviderEvidencePanel } from "@/components/provider-evidence-panel";
import { buildWorkflowProviderSignals } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";
import {
  calculateTimelineMetrics,
  formatTimelineTimeAgo,
  normalizeTimelineEvents,
  type AuditLogRow,
  type DecisionTimelineRow,
  type PassportTimelineRow,
  type SignalTimelineRow,
  type TimelineSeverity,
  type TrustReportTimelineRow,
  type VerificationCaseTimelineRow,
} from "@/lib/trust-engine/timeline";

export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const severityStyles: Record<TimelineSeverity, string> = {
  verified: "border-emerald-800 text-emerald-200",
  reviewing: "border-amber-800 text-amber-200",
  escalated: "border-red-800 text-red-200",
  information: "border-cyan-800 text-cyan-200",
};

async function fetchRows<T>(
  supabase: SupabaseServerClient,
  table: string,
  select: string,
  limit = 24
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  return error ? [] : data ?? [];
}

function Movement({
  label,
  before,
  after,
}: {
  label: string;
  before: number | null;
  after: number | null;
}) {
  if (before === null && after === null) return null;

  return (
    <p className="text-sm text-zinc-500">
      {label}:{" "}
      <span className="text-zinc-200">
        {before ?? "new"} → {after ?? "pending"}
      </span>
    </p>
  );
}

export default async function TrustTimelinePage() {
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
  const metrics = calculateTimelineMetrics(timeline);
  const providerSignals = buildWorkflowProviderSignals({
    providerVerificationState: timeline.some((event) => /verified/i.test(event.severity))
      ? "verified"
      : "pending",
    identityConfidence: metrics.trustChanges ? 68 : 55,
    sessionIntegrity: metrics.manualReviews ? 58 : 65,
    riskFlags: metrics.manualReviews ? ["high_risk_context"] : [],
    evidenceReferences: [
      "Trust timeline",
      "Provider signal",
      "Verification evidence",
      "Governance review",
    ],
  });

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /
          </Link>
          <Link href="/command-center" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /command-center
          </Link>
          <Link href="/back-office" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            Back Office
          </Link>
          <Link href="/trust-ledger" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /trust-ledger
          </Link>
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.28em] text-teal-200">
            Trust is earned over time.
          </p>
          <h1 className="mt-4 text-5xl font-semibold md:text-7xl">
            Trust Timeline™
          </h1>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Events Today", metrics.eventsToday],
            ["Trust Changes", metrics.trustChanges],
            ["Manual Reviews", metrics.manualReviews],
            ["Reality Updates", metrics.realityUpdates],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Score Ledger</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Timeline events can be reconciled with ledger rows that explain
                score changes, revocations, recoveries and evidence updates.
              </p>
            </div>
            <Link
              href="/trust-ledger"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Ledger
            </Link>
          </div>
        </section>

        <div className="mt-8">
          <ProviderEvidencePanel
            signals={providerSignals}
            title="Provider signals in trust timeline"
            description="Provider evidence can appear alongside trust score movement, manual review and replay history. It remains an external verification source, not final proof on its own."
          />
        </div>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-2xl font-semibold">Historical Trust Memory</h2>
          <div className="mt-6 grid gap-3">
            {timeline.map((event, index) => (
              <Link
                key={event.id}
                href={`/trust-timeline/${encodeURIComponent(event.id)}`}
                className={`rounded-lg border border-zinc-800 bg-black p-4 hover:border-zinc-500 ${
                  index === 0 ? "animate-pulse" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {event.source}
                    </p>
                    <p className="mt-2 text-lg font-medium">{event.event}</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {event.actor ?? "system"} / {formatTimelineTimeAgo(event.created_at)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${severityStyles[event.severity]}`}>
                    {event.severity}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 border-t border-zinc-900 pt-4 md:grid-cols-3">
                  <Movement
                    label="Trust Score"
                    before={event.trust_score_before}
                    after={event.trust_score_after}
                  />
                  <Movement
                    label="Human Presence"
                    before={event.human_presence_before}
                    after={event.human_presence_after}
                  />
                  <Movement
                    label="Origin Trace"
                    before={event.origin_trace_before}
                    after={event.origin_trace_after}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
