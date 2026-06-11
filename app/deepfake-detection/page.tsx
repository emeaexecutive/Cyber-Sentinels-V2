import Link from "next/link";

const checks = [
  "Synthetic media signals",
  "Evidence chain review",
  "Session continuity",
  "Provenance warnings",
  "Human escalation",
  "Audit logs",
];

export default function DeepfakeDetectionPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <p className="mt-10 text-xs uppercase tracking-[0.4em] text-zinc-500">
          AI trust infrastructure
        </p>

        <h1 className="mt-6 max-w-4xl text-5xl font-bold">
          Detection and provenance are signals. Trust requires orchestration.
        </h1>

        <p className="mt-6 max-w-3xl text-zinc-400">
          Cyber Sentinels combines synthetic-media indicators, provenance,
          evidence chains, governance actions, timelines and verification
          receipts before high-risk workflows rely on operational trust.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {checks.map((check) => (
            <div
              key={check}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-xl font-semibold">{check}</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Signals feed evidence, timelines, governance queues and
                audit-ready receipts for hiring security, provenance review and
                AI-assisted human governance.
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
