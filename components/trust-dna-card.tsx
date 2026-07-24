import type { TrustDNADashboardSnapshot } from "@/lib/trust-posture/dashboard";

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function progress(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

export function TrustDNACard({
  profile,
}: {
  profile: TrustDNADashboardSnapshot | null;
}) {
  return (
    <section
      data-testid="trust-dna-card"
      className="mt-8 rounded-2xl border border-cyan-900/70 bg-gradient-to-br from-cyan-950/30 via-zinc-950 to-zinc-950 p-5 md:p-6"
      aria-labelledby="trust-dna-card-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Trust DNA™
          </p>
          <h2 id="trust-dna-card-title" className="mt-2 text-2xl font-semibold">
            Explainable trust profile
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Weighted evidence across identity, enterprise, device, network, behaviour and
            provider dimensions. Missing evidence remains visible and never becomes implied trust.
          </p>
        </div>
        <span className="rounded-full border border-cyan-800 px-3 py-1 text-xs text-cyan-100">
          {profile ? `Entity ${profile.entityId.slice(0, 8)}` : "Awaiting calculation"}
        </span>
      </div>

      {profile ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Overall Score", `${profile.overallScore}/100`],
              ["Confidence", `${profile.confidence}%`],
              ["Evidence completeness", `${profile.evidenceCompleteness}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-100">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Trust DNA dimension breakdown">
            {profile.dimensions.map((dimension) => (
              <article key={dimension.name} className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium capitalize">
                    {dimension.name.replaceAll("_", " ").toLowerCase()}
                  </p>
                  <span className={dimension.evidenceMissing ? "text-xs text-amber-200" : "text-xs text-cyan-200"}>
                    {dimension.evidenceMissing ? "Evidence missing" : `${dimension.score}/100`}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={dimension.evidenceMissing ? "h-full bg-amber-700" : "h-full bg-cyan-400"}
                    style={{ width: progress(dimension.score) }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Confidence {dimension.confidence}%
                </p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs text-zinc-500">
            Last recalculated {formattedDate(profile.lastRecalculated)}
          </p>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-700 bg-black/20 p-5">
          <p className="font-medium text-zinc-200">No persisted Trust DNA profile yet</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Recalculate an Enterprise Trust Graph entity to populate the overall score,
            dimension breakdown, confidence and evidence completeness.
          </p>
        </div>
      )}
    </section>
  );
}
