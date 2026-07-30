import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal | Cyber Sentinels",
  description: "Cyber Sentinels perspectives on operational trust, accountable AI and evidence-backed workflows.",
  alternates: { canonical: "/journal" },
};

const posts = [
  [
    "Why Cyber Sentinels Exists",
    "The rise of AI-native systems introduces a new operational trust challenge. Cyber Sentinels is being built to help organizations make identity, evidence, review and accountability easier to understand.",
  ],
  [
    "Trust Becomes Infrastructure",
    "Trust can no longer live only in policy documents or manual approvals. It needs operating records, evidence, auditability and review paths.",
  ],
  [
    "AI Identity Is Emerging",
    "As AI systems begin to act inside workflows, organizations will need clearer identity and permission models for non-human operational actors.",
  ],
  [
    "Human Oversight Still Matters",
    "High-risk trust outcomes should remain governed. AI may assist workflows, but review, escalation and accountability still matter.",
  ],
  [
    "Auditability for AI-Native Systems",
    "When operations become more automated, audit trails become a way to preserve context, evidence and explainability.",
  ],
];

export default function JournalPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Founder Journal
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Notes on governed trust infrastructure.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Founder-led thinking on Cyber Sentinels, platform evolution and the
            emerging category of trust infrastructure for AI-native systems.
          </p>
        </section>

        <div className="mt-8 grid gap-4">
          {posts.map(([title, body]) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-800 bg-black p-6"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                Journal note
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-zinc-100">
                {title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
