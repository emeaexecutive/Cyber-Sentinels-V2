import Link from "next/link";

const principles = [
  ["Evidence before outcome", "Trust Posture is supported by inspectable evidence, not a hidden verdict."],
  ["Human governance", "Sensitive workflow changes remain reviewable, attributable and reversible where appropriate."],
  ["Replayable chronology", "Evidence, policy triggers, reviewer actions and authorization changes remain connected over time."],
  ["Provider transparency", "Live, simulated, unavailable and disabled provider states are kept distinct."],
];

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Trust</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Explainable operational trust, governed by evidence.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels coordinates verification signals, Evidence Chains,
            Governance Review and Replay Timelines without claiming autonomous truth
            detection or perfect identity certainty.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {principles.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/methodology" className="brand-primary-action">Review Methodology</Link>
          <Link href="/security" className="brand-secondary-action">Security</Link>
          <Link href="/status" className="brand-secondary-action">System Status</Link>
        </div>
      </div>
    </main>
  );
}
