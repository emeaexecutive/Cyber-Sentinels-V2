import { AuthenticityBadge, ExplainableTrustFactors, TrustScoreBadge } from "@/components/phase-one-trust";
import { provenanceTrustFactors, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";

export const dynamic = "force-dynamic";

export default async function MediaTrustPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factors = provenanceTrustFactors();
  const score = trustScoreFromFactors(factors);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Media Trust</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Media {id}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Public-safe signal view for provenance, synthetic watermark,
                metadata and upload-chain context. Provenance is not sufficient
                trust without evidence, governance, timeline and human review.
              </p>
            </div>
            <AuthenticityBadge score={score} />
          </div>
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <TrustScoreBadge score={score} />
          <ExplainableTrustFactors factors={factors} />
        </section>
      </div>
    </main>
  );
}
