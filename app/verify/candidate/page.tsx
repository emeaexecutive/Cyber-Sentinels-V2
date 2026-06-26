import { ExplainableTrustFactors, TrustScoreBadge, VerificationTimeline } from "@/components/phase-one-trust";
import { candidateTrustFactors, trustScoreFromFactors, verificationTimeline } from "@/lib/trusted-layer/phase1";

export const dynamic = "force-dynamic";

export default function CandidateVerificationPage() {
  const factors = candidateTrustFactors();
  const score = trustScoreFromFactors(factors);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Trusted Hiring</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Candidate Verification</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Verify candidate identity, profile consistency, liveness and interview-session integrity before a hiring decision moves forward.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Detection is one signal. Cyber Sentinels does not claim perfect real/fake detection. Final workflow trust state depends on provider evidence, governance review and replay.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
          <form action="/api/candidate/verify" method="POST" className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Create Candidate Check</h2>
            <input name="full_name" required placeholder="Candidate full name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="email" required type="email" placeholder="Candidate email" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="role_applied_for" placeholder="Role applied for" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="company_name" placeholder="Company name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <select name="verification_status" defaultValue="pending" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="needs_manual_review">Needs Review</option>
              <option value="risk_detected">Risk Detected</option>
            </select>
            <select name="risk_level" defaultValue="pending" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
              <option value="pending">Pending risk</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="needs_review">Needs Review</option>
              <option value="high">High</option>
            </select>
            <textarea name="notes" placeholder="Notes" rows={4} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="linkedin_url" type="url" placeholder="LinkedIn URL" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">Start Verification</button>
          </form>

          <div className="grid gap-6">
            <TrustScoreBadge score={score} />
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Verification Timeline</h2>
              <div className="mt-5">
                <VerificationTimeline events={verificationTimeline("candidate")} />
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Explainable Trust Factors</h2>
          <div className="mt-5">
            <ExplainableTrustFactors factors={factors} />
          </div>
        </section>
      </div>
    </main>
  );
}
