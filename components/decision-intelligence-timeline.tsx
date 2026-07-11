import type { DecisionIntelligence } from "@/lib/core/decision-intelligence";

export function DecisionIntelligenceTimeline({ intelligence }: { intelligence: DecisionIntelligence }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Decision lifecycle</p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-100">Event to final outcome</h2>
        </div>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
          Release {intelligence.release}
        </span>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-6">
        {intelligence.timeline.map((item) => (
          <article key={item.id} className="rounded-lg border border-zinc-800 bg-black p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{item.stage}</p>
            <h3 className="mt-3 text-sm font-semibold text-zinc-100">{item.label}</h3>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{item.detail}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {intelligence.alternative_outcomes.map((outcome) => (
          <div key={outcome.outcome} className="rounded-lg border border-zinc-800 bg-black p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Why not {outcome.outcome}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{outcome.why_not}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
