import type { VerificationProviderSignal } from "@/lib/providers/types";

function stateClass(state: string) {
  if (state === "verified") return "border-emerald-800 text-emerald-200";
  if (state === "failed") return "border-red-800 text-red-200";
  if (state === "pending") return "border-amber-800 text-amber-200";
  return "border-zinc-700 text-zinc-300";
}

export function ProviderEvidencePanel({
  signals,
  title = "Provider-backed verification signal",
  description = "External verification evidence is normalized into explainable trust signals. It supports workflow evidence, governance review, replay and receipts; it does not create final proof on its own.",
}: {
  signals: VerificationProviderSignal[];
  title?: string;
  description?: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
            External verification source
          </p>
          <h2 className="mt-2 text-xl font-semibold">{title}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            {description}
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
          {signals.length} signal{signals.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {signals.map((signal) => (
          <article key={`${signal.providerId}-${signal.providerName}`} className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">
                  Provider-backed verification signal
                </p>
                <h3 className="mt-2 font-semibold text-zinc-100">
                  {signal.providerName}
                </h3>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${stateClass(signal.providerVerificationState)}`}>
                {signal.providerVerificationState}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {signal.summary}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
                  Identity confidence
                </p>
                <p className="mt-2 text-sm text-zinc-200">{signal.identityConfidence}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
                  Session integrity signal
                </p>
                <p className="mt-2 text-sm text-zinc-200">{signal.sessionIntegrity}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
                External verification evidence
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {signal.evidenceReferences.join(", ")}
              </p>
            </div>
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">
                Governance recommendation
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {signal.governanceRecommendation}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {signal.riskFlags.length ? (
                signal.riskFlags.map((flag) => (
                  <span key={flag} className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
                    {flag.replaceAll("_", " ")}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                  No provider risk flags
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
