import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExplainableTrustFactors, StatusBadge, TrustScoreBadge, VerificationTimeline } from "@/components/phase-one-trust";
import { calculateHiringTrustScore } from "@/lib/trusted-layer/hiring";
import { verificationTimeline } from "@/lib/trusted-layer/phase1";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SignalRow = {
  signal_type: string | null;
  status: string | null;
  risk_level: string | null;
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
    .select("id,title,status,created_at")
    .eq("id", id)
    .maybeSingle();

  if (!session) {
    notFound();
  }

  const [{ data: signals }, { data: latestScore }] = await Promise.all([
    supabase
      .from("interview_risk_signals")
      .select("signal_type,status,risk_level")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("trust_scores")
      .select("score,risk_level,reasons,created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const fallbackScore = calculateHiringTrustScore({
    livenessUnresolved: true,
  });
  const score = Number(latestScore?.score ?? fallbackScore.score);
  const reasons = (latestScore?.reasons as string[] | null) ?? fallbackScore.reasons;
  const signalRows = (signals ?? []) as SignalRow[];

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
                Audit-ready hiring integrity report with placeholder liveness,
                identity, device, location, voice and webcam risk signals.
              </p>
            </div>
            <StatusBadge status={String(latestScore?.risk_level ?? session.status ?? "pending")} />
          </div>
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
            <h2 className="text-xl font-semibold">Risk Signals</h2>
            <div className="mt-5 grid gap-3">
              {signalRows.length ? signalRows.map((signal) => (
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

        <div className="mt-8">
          <Link href={`/interview/session/${id}`} className="text-sm text-cyan-200 underline">
            Open interview session
          </Link>
        </div>
      </div>
    </main>
  );
}
