const timeline = [
  [
    "Trust Passports",
    "Structured records for identity, verification state, evidence and review outcomes.",
  ],
  [
    "Evidence workflows",
    "Private evidence handling and reviewable records that support verification decisions.",
  ],
  [
    "Auditability",
    "Operational audit trails that preserve what happened and why it matters.",
  ],
  [
    "Governance",
    "Human oversight, escalation and review paths for sensitive workflows.",
  ],
  [
    "Trust events",
    "Early platform direction for tracking operational trust signals over time.",
  ],
  [
    "AI identity direction",
    "Future direction for governed identity and permissions around AI-native systems.",
  ],
];

export default function TimelinePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Public Trust Timeline
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Intentional platform evolution.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels is evolving from evidence-backed verification toward
            broader trust infrastructure for AI-native operations.
          </p>
        </section>

        <section className="mt-8 grid gap-4">
          {timeline.map(([title, body], index) => (
            <article
              key={title}
              className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5 md:grid-cols-[120px_1fr]"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                Phase {index + 1}
              </p>
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{body}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
