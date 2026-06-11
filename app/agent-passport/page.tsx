import Link from "next/link";

const capabilities = [
  "AI Agent Passport",
  "Verified Agent",
  "Trust Passport",
  "Signals feed",
  "Clearances",
  "Audit logs",
];

export default function AgentPassportPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>
        <Link
          href="/agent-registry"
          className="ml-3 text-sm text-zinc-400 hover:text-white"
        >
          Open Agent Registry™
        </Link>

        <p className="mt-10 text-xs uppercase tracking-[0.4em] text-zinc-500">
          Verified Agent
        </p>

        <h1 className="mt-6 max-w-4xl text-5xl font-bold">
          AI agent passports for trust before autonomous access.
        </h1>

        <p className="mt-6 max-w-3xl text-zinc-400">
          Cyber Sentinels gives autonomous agents an AI trust infrastructure
          record with provenance, review status, clearances, audit logs and
          governance-before-permission controls.
        </p>

        <Link
          href="/agent-registry"
          className="mt-8 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white"
        >
          View Agent Registry™
        </Link>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => (
            <div
              key={capability}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-xl font-semibold">{capability}</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Connect agent identity with owners, permissions, provenance,
                evidence chains, operational signals and human governance
                review.
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
