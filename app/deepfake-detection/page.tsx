import Link from "next/link";

const checks = [
  "Synthetic media signals",
  "Evidence chain review",
  "Session continuity",
  "Provenance warnings",
  "Human escalation",
  "Audit logs",
];
const detectionReality = [
  ["Real ML", "Not Implemented"],
  ["Provider API", "Awaiting Credentials"],
  ["Heuristic Rules", "Active for review"],
  ["Demo Data", "Clearly separated"],
] as const;

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
          Detection and provenance are signals. Trust requires Verification Evidence and Governance Review.
        </h1>

        <p className="mt-6 max-w-3xl text-zinc-400">
          Cyber Sentinels combines synthetic-media indicators, provenance,
          evidence chains, governance actions, timelines and verification
          receipts before high-risk workflows rely on operational trust.
        </p>

        <section className="mt-8 rounded-2xl border border-amber-900 bg-amber-950/10 p-5">
          <h2 className="text-lg font-semibold text-amber-100">Detection source reality</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            No proprietary deepfake inference is active. Risk indicators are review context unless a verified provider result is attached.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {detectionReality.map(([source, state]) => (
              <div key={source} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{source}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-200">{state}</p>
              </div>
            ))}
          </div>
        </section>

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
