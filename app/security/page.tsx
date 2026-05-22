import Link from "next/link";

const principles = [
  {
    title: "Proof Before Permission",
    body: "Cyber Sentinels treats identity, evidence, and provenance claims as untrusted until verified by server-side checks and review workflows.",
  },
  {
    title: "Zero Trust Assumptions",
    body: "API routes assume attackers may spoof clients, automate submissions, tamper with metadata, and try to poison trust signals.",
  },
  {
    title: "Audit Logging",
    body: "Security-relevant events are written as append-only audit records so decisions can be traced after the fact.",
  },
  {
    title: "Human Review",
    body: "Low-confidence or suspicious submissions are designed to move toward human review instead of automatic public trust claims.",
  },
  {
    title: "Evidence Protection",
    body: "Evidence handling is scoped to approved media categories and request metadata is hashed before storage for abuse analysis.",
  },
  {
    title: "No Perfect Detection Claim",
    body: "The system does not claim perfect detection. It combines signals, provenance, review, and auditability to reduce risk.",
  },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">Security Foundation</h1>

        <p className="mt-5 max-w-3xl text-lg text-zinc-300">
          Cyber Sentinels is built around cautious trust: prove first, limit
          privilege, log decisions, and escalate uncertainty to people.
        </p>

        <section className="mt-12 grid gap-8 md:grid-cols-2">
          {principles.map((principle) => (
            <article key={principle.title} className="border-t border-zinc-800 pt-6">
              <h2 className="text-2xl font-semibold">{principle.title}</h2>
              <p className="mt-3 text-zinc-400">{principle.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
