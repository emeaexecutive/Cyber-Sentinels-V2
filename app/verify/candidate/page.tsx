import Link from "next/link";
import { ExplainableTrustFactors, TrustScoreBadge, VerificationTimeline } from "@/components/phase-one-trust";
import { candidateTrustFactors, trustScoreFromFactors, verificationTimeline } from "@/lib/trusted-layer/phase1";

export const dynamic = "force-dynamic";

export default async function CandidateVerificationPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; warning?: string; error?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
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

        <nav className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/verify/session" className="brand-primary-action">Continue to Session Integrity</Link>
          <Link href="/trust-center" className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white">Open Operational Trust Center</Link>
          <Link href="/dashboard/governance" className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white">Open Governance Review</Link>
        </nav>

        {query.status === "recorded" ? (
          <p className="mt-6 rounded-lg border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">
            Candidate verification intake recorded. Continue to Governance Review,
            Replay Timeline and the Verification Receipt when evidence becomes available.
          </p>
        ) : null}
        {query.warning ? (
          <p className="mt-6 rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">
            Candidate intake was recorded, but {query.warning === "report_unavailable"
              ? "the trust report is not yet available."
              : "the Verification Receipt could not be generated yet."} Review the workflow before relying on an outcome.
          </p>
        ) : null}
        {query.error ? (
          <p className="mt-6 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">
            Candidate verification could not be completed safely. No successful
            verification outcome should be inferred. Retry or open Support if the issue continues.
          </p>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
          <form action="/api/candidate/verify" method="POST" className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Create Candidate Check</h2>
            <input name="full_name" required placeholder="Candidate full name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="email" required type="email" placeholder="Candidate email" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="role_applied_for" placeholder="Role applied for" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="company_name" placeholder="Company name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <label className="grid gap-2 text-sm text-zinc-300">
              Initial workflow state
            <select name="verification_status" defaultValue="pending" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
              <option value="pending">Pending evidence</option>
              <option value="needs_manual_review">Governance Review required</option>
            </select>
            </label>
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
            <p className="text-xs leading-5 text-zinc-500">
              Intake cannot self-declare a verified candidate. Provider evidence
              and Governance Review determine later Trust Posture changes.
            </p>
          </form>

          <div className="grid gap-6">
            <TrustScoreBadge score={score} />
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Replay Timeline Preview</h2>
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
