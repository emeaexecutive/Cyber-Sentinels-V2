import { ExplainableTrustFactors, TrustScoreBadge } from "@/components/phase-one-trust";
import { SessionSignalCards } from "@/components/session-integrity";
import { evaluateSessionIntegrity } from "@/lib/session-integrity/model";
import { placeholderLivenessCheck, placeholderVoiceMismatchCheck, placeholderWebcamIntegrityCheck, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";

export const dynamic = "force-dynamic";

export default async function InterviewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factors = [placeholderLivenessCheck(88), placeholderVoiceMismatchCheck(79), placeholderWebcamIntegrityCheck(85)];
  const score = trustScoreFromFactors(factors);
  const sessionReview = evaluateSessionIntegrity({
    identity_verification_state: "pending",
    liveness_state: "confirmed",
    deepfake_risk_score: 18,
    injection_risk_score: 12,
    channel_integrity_state: "pending",
    session_anomaly_score: 24,
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Interview Trust Report</p>
          <h1 className="mt-4 text-4xl font-semibold">Report {id}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Explainable interview integrity report. Identity, liveness,
            deepfake risk, injection risk, channel integrity, and session
            anomalies remain separate inputs to human review.
          </p>
        </section>
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-2xl font-semibold">Session Integrity Signals</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Demonstration states only. No detection accuracy or authenticity is guaranteed.
          </p>
          <div className="mt-5"><SessionSignalCards signals={sessionReview.signals} /></div>
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <TrustScoreBadge score={score} />
          <ExplainableTrustFactors factors={factors} />
        </section>
      </div>
    </main>
  );
}
