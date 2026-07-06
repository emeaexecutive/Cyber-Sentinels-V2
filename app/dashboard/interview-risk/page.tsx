import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeDetectionSource } from "@/lib/detection/detection-engine";
import { intelligenceSeverityClass } from "@/lib/operational-intelligence/intelligence";
import { confidenceLevel, hiringSignalExplanation } from "@/lib/trusted-layer/hiring";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

function statusClass(status?: string | null) {
  const normalized = String(status ?? "pending").toLowerCase();
  if (["verified", "approved", "closed", "low"].includes(normalized)) {
    return "border-emerald-800 text-emerald-200";
  }
  if (["escalated", "high", "critical", "rejected"].includes(normalized)) {
    return "border-red-800 text-red-200";
  }
  if (["in_review", "pending", "unknown", "moderate"].includes(normalized)) {
    return "border-amber-800 text-amber-200";
  }
  return "border-cyan-800 text-cyan-200";
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(status)}`}>
      {status ?? "pending"}
    </span>
  );
}

function VerifiedRecruiterBadge({ status }: { status?: string | null }) {
  const verified = ["verified", "approved"].includes(String(status ?? "").toLowerCase());

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${verified ? "border-emerald-800 text-emerald-200" : "border-zinc-700 text-zinc-300"}`}>
      {verified ? "Verified Recruiter" : "Recruiter Review Pending"}
    </span>
  );
}

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 80
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AnyRow[]>();

  return error ? [] : data ?? [];
}

export default async function InterviewRiskDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/interview-risk");

  const [sessions, candidates, recruiters, riskEvents, riskSignals, governanceActions, intelligenceEvents, integrityChecks] =
    await Promise.all([
      fetchRows(supabase, "interview_sessions", 100),
      fetchRows(supabase, "candidate_profiles", 80),
      fetchRows(supabase, "recruiter_profiles", 40),
      fetchRows(supabase, "interview_risk_events", 120),
      fetchRows(supabase, "interview_risk_signals", 120),
      fetchRows(supabase, "governance_actions", 80),
      fetchRows(supabase, "operational_intelligence_events", 100),
      fetchRows(supabase, "session_integrity_checks", 100),
    ]);

  const sessionIds = new Set(sessions.map((session) => String(session.id)));
  const unresolvedEvents = riskEvents.filter(
    (event) => event.escalation_required || Number(event.confidence_score ?? 0) >= 50
  );
  const unresolvedSignals = riskSignals.filter((signal) =>
    ["pending", "in_review", "high", "needs_review"].includes(
      String(signal.status ?? signal.risk_level ?? "").toLowerCase()
    )
  );
  const escalatedSessions = sessions.filter((session) =>
    ["escalated", "in_review"].includes(
      String(session.session_status ?? session.status ?? "").toLowerCase()
    )
  );
  const sessionGovernance = governanceActions.filter(
    (action) =>
      action.subject_type === "interview_session" &&
      action.subject_id &&
      sessionIds.has(String(action.subject_id))
  );
  const hiringIntelligenceEvents = intelligenceEvents.filter(
    (event) =>
      event.subject_type === "interview_session" ||
      ["elevated_risk_pattern", "incomplete_provenance_chain"].includes(String(event.event_type ?? ""))
  );

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/recruiter/dashboard", "Recruiter Queue"],
            ["/enterprise/hiring-security", "Hiring Security"],
            ["/dashboard/session-integrity", "Session Integrity"],
            ["/dashboard/governance", "Governance"],
            ["/timeline", "Timeline"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Interview Integrity
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Hiring Security Review Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Operational review for synthetic applicants, proxy interviews, stolen identities, AI-assisted interview fraud, recruiter verification and governance escalation. Flags are placeholders for human review, not binary detection outcomes.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Detection is one signal. Governance review determines final workflow state. Cyber Sentinels does not produce a standalone detection verdict.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-5">
          {[
            ["Pending reviews", String(sessions.filter((item) => ["scheduled", "pending", "in_review"].includes(String(item.session_status ?? item.status ?? ""))).length)],
            ["Escalated sessions", String(escalatedSessions.length)],
            ["Unresolved flags", String(unresolvedEvents.length + unresolvedSignals.length)],
            ["Candidates", String(candidates.length)],
            ["Governance actions", String(sessionGovernance.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Session Integrity Review</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                Candidate identity, liveness, deepfake risk and injection risk are not the same state. A candidate may be verified while channel integrity evidence or session anomalies still require human review.
              </p>
            </div>
            <Link href="/dashboard/session-integrity" className="text-sm text-cyan-200 underline">
              Open session integrity dashboard
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Session reviews", integrityChecks.length],
              ["Manual review required", integrityChecks.filter((item) => item.manual_review_required).length],
              ["Review pending", integrityChecks.filter((item) => item.overall_status === "pending").length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Pending Interview Reviews</h2>
            <div className="mt-5 grid gap-3">
              {sessions.length ? (
                sessions.slice(0, 12).map((session) => (
                  <Link key={String(session.id)} href={`/trust/hiring-report/${session.id}`} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">{session.title ?? "Interview session"}</p>
                        <p className="mt-2 text-sm text-zinc-500">Candidate {String(session.candidate_id ?? session.candidate_profile_id ?? "not linked")}</p>
                      </div>
                      <StatusBadge status={session.integrity_status ?? session.session_status ?? session.status} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">No interview sessions yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Unresolved Flags</h2>
            <div className="mt-5 grid gap-3">
              {unresolvedEvents.length ? (
                unresolvedEvents.slice(0, 10).map((event) => (
                  <div key={String(event.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-medium text-zinc-100">{event.signal_type ?? "interview_signal"}</p>
                      <StatusBadge status={event.escalation_required ? "escalated" : confidenceLevel(event.confidence_score)} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {event.risk_reason ?? hiringSignalExplanation(event.signal_type)}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      Source: {normalizeDetectionSource(event.signal_source)} / Confidence: {confidenceLevel(event.confidence_score)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                  No unresolved interview risk events are visible.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Hiring Integrity Intelligence</h2>
            <span className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200">
              Human governed
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
            Interview intelligence explains unresolved candidate risks,
            suspicious interview patterns, repeated integrity flags and
            unresolved recruiter reviews. It does not reject candidates.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {[
              ["Unresolved candidate risks", candidates.filter((candidate) => ["high", "needs_review", "unknown"].includes(String(candidate.risk_level ?? "unknown").toLowerCase())).length],
              ["Repeated integrity flags", hiringIntelligenceEvents.length],
              ["Unresolved recruiter reviews", recruiters.filter((recruiter) => !["verified", "approved"].includes(String(recruiter.verification_status ?? "").toLowerCase())).length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-500">{String(label)}</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {hiringIntelligenceEvents.length ? (
              hiringIntelligenceEvents.slice(0, 6).map((event) => (
                <article key={String(event.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-zinc-100">
                      {String(event.event_type ?? "hiring_intelligence").replaceAll("_", " ")}
                    </p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${intelligenceSeverityClass(event.severity)}`}>
                      {event.severity ?? "info"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {event.summary ?? "Hiring integrity intelligence recorded for review."}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {event.recommended_action ?? "Review signal source, candidate provenance and governance state."}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No hiring intelligence events are recorded yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Candidate Verification State</h2>
            <div className="mt-5 grid gap-3">
              {candidates.length ? candidates.slice(0, 8).map((candidate) => (
                <div key={String(candidate.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{candidate.full_name ?? "Candidate"}</p>
                      <p className="mt-1 text-sm text-zinc-500">{candidate.email ?? "No email"}</p>
                    </div>
                    <StatusBadge status={candidate.verification_status} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    Provenance: {candidate.provenance_status ?? "unknown"} / Risk: {candidate.risk_level ?? "unknown"}
                  </p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">No candidate profiles yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recruiter Verification State</h2>
            <div className="mt-5 grid gap-3">
              {recruiters.length ? recruiters.slice(0, 8).map((recruiter) => (
                <div key={String(recruiter.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{recruiter.full_name ?? "Recruiter"}</p>
                      <p className="mt-1 text-sm text-zinc-500">{recruiter.organization ?? recruiter.company_name ?? "Organization not recorded"}</p>
                    </div>
                    <VerifiedRecruiterBadge status={recruiter.verification_status} />
                  </div>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">No recruiter profiles yet.</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
