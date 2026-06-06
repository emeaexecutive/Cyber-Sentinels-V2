import { AuthenticityBadge, ExplainableTrustFactors, TrustScoreBadge, VerificationTimeline } from "@/components/phase-one-trust";
import { placeholderLivenessCheck, placeholderVoiceMismatchCheck, placeholderWebcamIntegrityCheck, trustScoreFromFactors, verificationTimeline } from "@/lib/trusted-layer/phase1";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InterviewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/interview/session/${encodeURIComponent(id)}`);
  }

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id,title,status")
    .eq("id", id)
    .maybeSingle();
  const { data: signals } = await supabase
    .from("interview_risk_signals")
    .select("signal_type,status,risk_level")
    .eq("session_id", id)
    .order("created_at", { ascending: true });
  const factors = [placeholderLivenessCheck(86), placeholderVoiceMismatchCheck(74), placeholderWebcamIntegrityCheck(83)];
  const score = trustScoreFromFactors(factors);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Interview Session</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold md:text-5xl">{session?.title ?? `Session ${id}`}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Live interview trust checks for liveness, voice mismatch, webcam integrity and human-review escalation.
              </p>
            </div>
            <AuthenticityBadge score={score} />
          </div>
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <TrustScoreBadge score={score} />
          <VerificationTimeline events={verificationTimeline("interview")} />
        </section>
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Session Trust Factors</h2>
          <div className="mt-5"><ExplainableTrustFactors factors={factors} /></div>
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Placeholder Risk Signals</h2>
            <div className="mt-5 grid gap-3 text-sm text-zinc-400">
              {(signals ?? []).length ? (signals ?? []).map((signal) => (
                <div key={signal.signal_type} className="rounded-lg border border-zinc-800 bg-black p-4">
                  {signal.signal_type} / {signal.status ?? "pending"}
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4">No risk signals recorded yet.</p>
              )}
            </div>
          </div>
          <form action="/api/trust/hiring-score" method="post" className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Calculate Hiring Score</h2>
            <input type="hidden" name="session_id" value={id} />
            {[
              ["high_risk_identity", "High-risk identity flag"],
              ["liveness_unresolved", "Liveness unresolved"],
              ["voice_mismatch", "Voice mismatch flag"],
              ["webcam_anomaly", "Webcam anomaly flag"],
              ["suspicious_device_location", "Suspicious device/location"],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-3 text-sm text-zinc-300">
                <input type="checkbox" name={name} className="h-4 w-4" />
                {label}
              </label>
            ))}
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Generate Hiring Report
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
