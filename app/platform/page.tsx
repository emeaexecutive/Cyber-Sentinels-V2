const layers = [
  ["Identity", "Structured records for the subject being reviewed."],
  ["Evidence", "Supporting records that make verification reviewable."],
  ["Verification", "Governed review paths for sensitive outcomes."],
  ["Auditability", "Traceable history for evidence, decisions and actions."],
  ["Explainability", "Plain-language visibility into trust state and missing context."],
  ["Governance", "Human oversight and escalation for high-risk workflows."],
];

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Platform
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Operational Trust Infrastructure for AI-era workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels combines operational workflows, evidence chains,
            provenance signals, governance review, auditability and
            verification receipts into a focused early platform.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Detection and provenance are signals. Trust requires orchestration.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layers.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
