import { AuthenticityBadge, ExplainableTrustFactors, TrustScoreBadge, VerificationTimeline } from "@/components/phase-one-trust";
import { provenanceTrustFactors, trustScoreFromFactors, verificationTimeline } from "@/lib/trusted-layer/phase1";

export const dynamic = "force-dynamic";

export default function ProvenanceVerificationPage() {
  const factors = provenanceTrustFactors();
  const score = trustScoreFromFactors(factors);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Provenance Trust</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold md:text-5xl">Verify Provenance</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Review provenance, metadata, watermark, evidence-chain and upload-continuity signals. Detection and provenance are signals; trust requires Verification Evidence, Governance Review and human review.
              </p>
            </div>
            <AuthenticityBadge score={score} />
          </div>
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.2fr]">
          <form action="/api/provenance/verify" method="POST" className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Media Review Request</h2>
            <input name="media_label" required placeholder="Media label" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <input name="source_url" type="url" placeholder="Source URL" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" />
            <select name="media_type" defaultValue="image" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="document">Document</option>
            </select>
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">Review Provenance Signals</button>
          </form>
          <div className="grid gap-5">
            <TrustScoreBadge score={score} />
            <VerificationTimeline events={verificationTimeline("provenance")} />
          </div>
        </section>
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Explainable Signal Factors</h2>
          <div className="mt-5"><ExplainableTrustFactors factors={factors} /></div>
        </section>
      </div>
    </main>
  );
}
