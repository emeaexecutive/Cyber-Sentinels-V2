import { degradedModeStates } from "@/lib/trust-os/degraded-states";

export function DegradedModeGuidance() {
  return (
    <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5" aria-labelledby="degraded-mode-guidance">
      <p className="operational-eyebrow">Safe degraded mode</p>
      <h2 id="degraded-mode-guidance" className="mt-2 text-2xl font-semibold">Customer-safe recovery guidance</h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-500">These states never infer success, provider output or evidence completeness. Operators should use the matching guidance when a live check reports degradation.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {degradedModeStates.map((state) => (
          <article key={state.id} className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">{state.title}</h3>
              <span className="rounded-full border border-amber-900 px-2 py-1 text-xs text-amber-200">{state.actionState}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">{state.whatHappened}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500"><span className="font-semibold text-zinc-300">Evidence:</span> {state.evidenceState}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500"><span className="font-semibold text-zinc-300">Next:</span> {state.nextAction}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
