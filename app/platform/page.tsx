const layers = [
  ["Hiring Security", "Verification workflows for candidate, recruiter and interview review."],
  ["Active Flags", "Identity, media, injection and session-integrity changes surfaced for review."],
  ["Pending Reviews", "Controlled review paths for sensitive outcomes."],
  ["Governance Review", "Human oversight and escalation for high-risk workflows."],
  ["Verification Receipts", "Audit-ready records showing what was reviewed and when."],
  ["Verification Chronology", "Workflow history that can be reviewed after decisions are made."],
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
            High-assurance operational trust for critical workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels orchestrates high-assurance operational trust
            across workflows, identities and intelligent systems.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            It keeps Hiring Security, Session Integrity, Verification Evidence, Governance Review and Replay Evidence in one reviewable path.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Assurance is consent-based and evidence-gated. Biometric references
            can support future verification, but never establish certainty or
            replace human governance.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {layers.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
