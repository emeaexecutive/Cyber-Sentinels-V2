import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import {
  buildOperationalHealth,
  buildTrustTrendSummaries,
  formatIntelligenceDate,
  intelligenceLabel,
  intelligenceSeverityClass,
  type AnyOperationalRow,
} from "@/lib/operational-intelligence/intelligence";

export const dynamic = "force-dynamic";

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 120
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AnyOperationalRow[]>();

  return error ? [] : data ?? [];
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${intelligenceSeverityClass(status)}`}>
      {status ?? "info"}
    </span>
  );
}

function IntelligenceEventCard({ event }: { event: AnyOperationalRow }) {
  const metadata =
    event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? event.metadata
      : {};

  return (
    <article className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
            {intelligenceLabel(event.event_type)}
          </p>
          <h3 className="mt-2 font-medium text-zinc-100">
            {event.summary ?? "Operational intelligence event recorded."}
          </h3>
        </div>
        <StatusBadge status={event.severity} />
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        {event.recommended_action ??
          "Review related evidence, governance actions, flags and operational context."}
      </p>
      <div className="mt-4 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
        <p>Subject: {event.subject_type ?? "workflow"}</p>
        <p>Review: {event.requires_review ? "required" : "not required"}</p>
        <p>{formatIntelligenceDate(event.created_at)}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-700">
        Why: {String(metadata.why_it_exists ?? "This event exists to make review status and governance review clear.")}
      </p>
    </article>
  );
}

export default async function TrustOpsPage() {
  const supabase = await createClient();
  const adminAccess = await checkAdminAccess(supabase);

  if (!adminAccess.ok && adminAccess.reason === "unauthenticated") {
    redirect("/login?next=/trustops");
  }

  if (!adminAccess.ok) {
    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/trustops" });

  const [
    intelligenceEvents,
    cases,
    governanceActions,
    evidence,
    signals,
    timeline,
    workspaces,
    interviewRiskEvents,
    candidates,
    recruiters,
  ] = await Promise.all([
    fetchRows(supabase, "operational_intelligence_events", 120),
    fetchRows(supabase, "trust_cases", 160),
    fetchRows(supabase, "governance_actions", 160),
    fetchRows(supabase, "evidence_files", 100),
    fetchRows(supabase, "signals", 120),
    fetchRows(supabase, "trust_timeline_events", 120),
    fetchRows(supabase, "trust_workspaces", 80),
    fetchRows(supabase, "interview_risk_events", 120),
    fetchRows(supabase, "candidate_profiles", 80),
    fetchRows(supabase, "recruiter_profiles", 80),
  ]);

  const health = buildOperationalHealth({
    cases,
    governanceActions,
    evidence,
    signals,
    intelligenceEvents,
  });
  const trends = buildTrustTrendSummaries({
    cases,
    governanceActions,
    timeline,
    intelligenceEvents,
  });
  const activeEscalations = [
    ...cases.filter((item) => String(item.status ?? "").toLowerCase() === "escalated"),
    ...governanceActions.filter((item) => String(item.action_status ?? "").toLowerCase() === "escalated"),
  ];
  const pendingGovernance = governanceActions.filter((item) =>
    ["pending", "in_review", "escalated"].includes(String(item.action_status ?? "pending").toLowerCase())
  );
  const unresolvedHiringRisks = interviewRiskEvents.filter(
    (event) => event.escalation_required || Number(event.confidence_score ?? 0) >= 50
  );
  const unresolvedCandidateRisks = candidates.filter((candidate) =>
    ["high", "needs_review", "unknown"].includes(String(candidate.risk_level ?? "unknown").toLowerCase())
  );
  const unresolvedRecruiterReviews = recruiters.filter(
    (recruiter) => !["verified", "approved"].includes(String(recruiter.verification_status ?? "").toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          {[
            ["/workspace", "Workspaces"],
            ["/dashboard/governance", "Governance"],
            ["/dashboard/interview-risk", "Interview Risk"],
            ["/timeline", "Timeline"],
            ["/trust-replay", "Replay"],
            ["/back-office", "Back Office"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Operational Review
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Operational Trust Dashboard
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Runtime trust visibility across human, AI-agent and workflow
                activity. Review authorization, evidence, posture changes,
                governance actions and operational outcomes in one protected
                operating view.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
                Replay preserves the operational memory. Persistent Trust
                Posture shows what requires attention now. Accountable people
                retain decision authority.
              </p>
            </div>
            <StatusBadge status={health.status} />
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-5">
          {[
            ["Unresolved risks", health.unresolvedRisks],
            ["Active escalations", health.activeEscalations],
            ["Pending reviews", health.pendingGovernance],
            ["Review status", health.status],
            ["Workspaces", workspaces.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{String(value)}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Governed Operations Requiring Attention</h2>
              <StatusBadge status={health.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              {health.workflowHealth}
            </p>
            <div className="mt-5 grid gap-3">
              {intelligenceEvents.length ? (
                intelligenceEvents.slice(0, 10).map((event) => (
                  <IntelligenceEventCard key={String(event.id)} event={event} />
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No operational intelligence events have been recorded yet.
                  They will appear as governance, hiring and agent workflows
                  create review flags and audit activity.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Trend Summaries</h2>
            <div className="mt-5 grid gap-3">
              {trends.map((trend) => (
                <article key={trend.title} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium text-zinc-100">{trend.title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{trend.summary}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Active Escalations</h2>
            <div className="mt-5 grid gap-3">
              {activeEscalations.length ? (
                activeEscalations.slice(0, 8).map((item) => (
                  <article key={String(item.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="font-medium text-zinc-100">
                      {item.title ?? item.subject_type ?? "Escalated workflow"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Human review is required before the workflow should be treated as resolved.
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No active escalations are visible.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Pending Governance Reviews</h2>
            <div className="mt-5 grid gap-3">
              {pendingGovernance.length ? (
                pendingGovernance.slice(0, 8).map((action) => (
                  <article key={String(action.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-medium text-zinc-100">
                        {action.subject_type ?? "governance action"}
                      </p>
                      <StatusBadge status={action.action_status ?? "pending"} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {action.resolution_notes ?? "Governance action remains open for human review."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No pending governance reviews are visible.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Hiring Integrity Intelligence</h2>
            <div className="mt-5 grid gap-3">
              {[
                ["Unresolved candidate risks", unresolvedCandidateRisks.length],
                ["Interview patterns for review", unresolvedHiringRisks.length],
                ["Unresolved recruiter reviews", unresolvedRecruiterReviews.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
                </div>
              ))}
              <p className="text-sm leading-6 text-zinc-500">
                Hiring intelligence is review-only: inspect flags, evidence and
                governance state before any decision.
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
