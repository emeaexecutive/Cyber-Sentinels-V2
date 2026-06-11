import Link from "next/link";

const sections = [
  "Human Presence Index™",
  "Trust Passport",
  "AI Agent Passport",
  "Video Integrity Signal",
  "Voice Consistency Signal",
  "Image Review Signal",
  "Provenance / C2PA",
  "Origin Trace™",
  "Trust Timeline",
  "Audit Logs",
];

export default function RealityPassportPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Reality state verification
          </p>

          <h1 className="mt-6 max-w-4xl text-5xl font-bold">
            Reality Passport™
          </h1>

          <p className="mt-6 max-w-3xl text-zinc-400">
            Reality is no longer assumed. It is reviewed through signals,
            evidence and governance.
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-xl font-semibold">{section}</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Evidence, continuity signals and governance context across
                humans, AI agents, media objects, documents, candidates,
                companies and digital interactions.
              </p>
            </div>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/passport"
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Create Passport
          </Link>
          <Link
            href="/human-presence-index"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-white"
          >
            Human Presence Index
          </Link>
          <Link
            href="/origin-trace"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-white"
          >
            Origin Trace
          </Link>
        </div>
      </div>
    </main>
  );
}
