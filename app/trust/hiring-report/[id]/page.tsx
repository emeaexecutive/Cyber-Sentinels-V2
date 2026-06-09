import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExplainableTrustFactors, StatusBadge, TrustScoreBadge, VerificationTimeline } from "@/components/phase-one-trust";
import {
  calculateHiringTrustScore,
  confidenceLevel,
  hiringSignalExplanation,
} from "@/lib/trusted-layer/hiring";
import { verificationTimeline } from "@/lib/trusted-layer/phase1";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SignalRow = {
  signal_type: string | null;
  status: string | null;
  risk_level: string | null;
};

type RiskEventRow = {
  id: string;
  signal_type: string | null;
  signal_source: string | null;
  confidence_score: number | null;
  risk_reason: string | null;
  escalation_required: boolean | null;
  created_at: string | null;
};

export default async function HiringReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/trust/hiring-report/${encodeURIComponent(id)}`);
  }

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!session) {
    notFound();
  }

  const [
    { data: signals },
    { data: riskEvents },
    { data: latestScore },
    { data: candidate },
    { data: recruiter },
    { data: timeline },
    { data: governanceActions },
    { data: relationships },
    { data: latestReceipt },
  ] = await Promise.all([
    supabase
      .from("interview_risk_signals")
      .select("signal_type,status,risk_level")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("interview_risk_events")
      .select("id,signal_type,signal_source,confidence_score,risk_reason,escalation_required,created_at")
      .eq("interview_session_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("trust_scores")
      .select("score,risk_level,reasons,created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    session.candidate_id || session.candidate_profile_id
      ? supabase
          .from("candidate_profiles")
          .select("*")
          .eq("id", session.candidate_id ?? session.candidate_profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    session.recruiter_profile_id
      ? supabase
          .from("recruiter_profiles")
          .select("*")
          .eq("id", session.recruiter_profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("trust_timeline_events")
      .select("*")
      .eq("subject_type", "interview_session")
      .eq("subject_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("governance_actions")
      .select("*")
      .eq("subject_type", "interview_session")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trust_relationships")
      .select("*")
      .or(`source_id.eq.${id},target_id.eq.${id}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("verification_receipts")
      .select("id,receipt_type,verification_status,confidence_level,issued_at,receipt_summary")
      .eq("subject_type", "interview_session")
      .eq("subject_id", id)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const fallbackScore = calculateHiringTrustScore({
    livenessUnresolved: true,
  });
  const score = Number(latestScore?.score ?? fallbackScore.score);
  const reasons = (latestScore?.reasons as string[] | null) ?? fallbackScore.reasons;
  const signalRows = (signals ?? []) as SignalRow[];
  const eventRows = (riskEvents ?? []) as RiskEventRow[];
  const escalated = eventRows.filter((event) => event.escalation_required);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Hiring Trust Report
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">{session.title ?? "Interview Session"}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Audit-ready hiring integrity report with candidate provenance,
                interview timeline, trust signals, governance decisions,
                evidence chain and an operational summary. Placeholder signals
                do not claim detection accuracy.
              </p>
            </div>
            <StatusBadge status={String(latestScore?.risk_level ?? session.integrity_status ?? session.session_status ?? session.status ?? "pending")} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Candidate Provenance</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-400">
              <p>Name: {candidate?.full_name ?? "Not linked"}</p>
              <p>Email: {candidate?.email ?? "Not recorded"}</p>
              <p>Verification: {candidate?.verification_status ?? "pending"}</p>
              <p>Provenance: {candidate?.provenance_status ?? "unknown"}</p>
              <p>Risk: {candidate?.risk_level ?? "unknown"}</p>
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recruiter Verification</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-400">
              <p>Name: {recruiter?.full_name ?? "Not linked"}</p>
              <p>Organization: {recruiter?.organization ?? recruiter?.company_name ?? "Not recorded"}</p>
              <p>Status: {recruiter?.verification_status ?? "pending"}</p>
              <span className={`w-fit rounded-full border px-2.5 py-1 text-xs ${["verified", "approved"].includes(String(recruiter?.verification_status ?? "")) ? "border-emerald-800 text-emerald-200" : "border-zinc-700 text-zinc-300"}`}>
                {["verified", "approved"].includes(String(recruiter?.verification_status ?? "")) ? "Verified Recruiter" : "Recruiter Review Pending"}
              </span>
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Operational Summary</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {escalated.length
                ? `${escalated.length} interview integrity event${escalated.length === 1 ? "" : "s"} require human governance review.`
                : "No escalated interview integrity events are visible. Continue reviewing provenance, evidence and governance history before making hiring decisions."}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              AI may summarize this context later, but it does not reject
              candidates or replace human hiring governance.
            </p>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <TrustScoreBadge score={score} />
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Timeline</h2>
            <div className="mt-5">
              <VerificationTimeline events={verificationTimeline("interview")} />
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Signals</h2>
            <div className="mt-5 grid gap-3">
              {eventRows.length ? eventRows.map((event) => (
                <div key={event.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{event.signal_type ?? "interview_signal"}</p>
                    <StatusBadge status={event.escalation_required ? "escalated" : confidenceLevel(event.confidence_score)} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {event.risk_reason ?? hiringSignalExplanation(event.signal_type)}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
                    <p>Source: {event.signal_source ?? "placeholder_interface"}</p>
                    <p>Confidence: {confidenceLevel(event.confidence_score)}</p>
                    <p>Escalation: {event.escalation_required ? "required" : "not required"}</p>
                  </div>
                </div>
              )) : signalRows.length ? signalRows.map((signal) => (
                <div key={signal.signal_type} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{signal.signal_type}</p>
                    <StatusBadge status={signal.risk_level ?? signal.status ?? "pending"} />
                  </div>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No risk signals have been recorded yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Score Reasons</h2>
            <div className="mt-5">
              <ExplainableTrustFactors
                factors={reasons.map((reason) => ({
                  label: reason,
                  score,
                  detail: "Explainable placeholder factor for hiring integrity scoring.",
                }))}
              />
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Interview Timeline</h2>
            <div className="mt-5 grid gap-3">
              {(timeline ?? []).length ? (timeline ?? []).map((event) => (
                <div key={String(event.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium text-zinc-100">{event.event_title ?? event.event_type}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{event.event_summary ?? "Timeline event recorded."}</p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No interview timeline events yet.</p>
              )}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Governance Decisions</h2>
            <div className="mt-5 grid gap-3">
              {(governanceActions ?? []).length ? (governanceActions ?? []).map((action) => (
                <div key={String(action.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-zinc-100">{action.action_status ?? "pending"}</p>
                    <StatusBadge status={action.action_status ?? "pending"} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{action.resolution_notes ?? "Human review action is open."}</p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No governance decisions recorded yet.</p>
              )}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Chain</h2>
            <div className="mt-5 grid gap-3">
              {latestReceipt ? (
                <div className="rounded-lg border border-cyan-900 bg-black p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-zinc-100">
                      {String(latestReceipt.receipt_type ?? "verification_receipt").replaceAll("_", " ")}
                    </p>
                    <StatusBadge status={latestReceipt.confidence_level ?? "In Review"} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {latestReceipt.receipt_summary ?? "Verification receipt available for explainable review."}
                  </p>
                  <Link href={`/trust/receipt/${latestReceipt.id}`} className="mt-3 inline-flex text-sm text-cyan-200 underline">
                    Open verification receipt
                  </Link>
                </div>
              ) : null}
              {(relationships ?? []).length ? (relationships ?? []).map((relationship) => (
                <div key={String(relationship.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium text-zinc-100">{relationship.relationship_type ?? "linked_to"}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{relationship.explanation ?? "Relationship preserved for review."}</p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No evidence chain relationships linked yet.</p>
              )}
            </div>
          </section>
        </section>

        <div className="mt-8">
          <Link href={`/interview/session/${id}`} className="text-sm text-cyan-200 underline">
            Open interview session
          </Link>
        </div>
      </div>
    </main>
  );
}
