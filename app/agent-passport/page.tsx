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

        <p className="mt-10 text-xs uppercase tracking-[0.4em] text-zinc-500">
          Verified Agent
        </p>

        <h1 className="mt-6 max-w-4xl text-5xl font-bold">
          AI agent passports for trust before autonomous access.
        </h1>

        <p className="mt-6 max-w-3xl text-zinc-400">
          Cyber Sentinels gives autonomous agents an AI trust infrastructure
          record with provenance, review status, clearances, audit logs and
          proof before permission controls.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => (
            <div
              key={capability}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-xl font-semibold">{capability}</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Connect agent identity with verified humans, candidate
                verification, deepfake video detection, fake image detection and
                cloned voice detection signals.
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
