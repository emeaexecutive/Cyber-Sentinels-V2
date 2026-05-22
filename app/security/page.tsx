import Link from "next/link";

const principles = [
  {
    title: "Proof Before Permission",
    body: "Cyber Sentinels treats access, clearance, and score changes as earned outcomes. Claims require server-validated proof before permission is granted.",
  },
  {
    title: "Zero Trust Assumption",
    body: "Every identity, evidence file, request header, and score-like claim starts as untrusted until the server validates it.",
  },
  {
    title: "Protected API Routes",
    body: "Sensitive trust actions are designed to run behind Supabase authentication and server-side validation.",
  },
  {
    title: "Audit Logs",
    body: "Security-relevant actions should leave append-only records so decisions are traceable and reviewable.",
  },
  {
    title: "Abuse Detection",
    body: "Request fingerprints, suspicious activity flags, abuse risk, and rate limit status fields are ready for enforcement logic.",
  },
  {
    title: "Evidence Protection",
    body: "Evidence handling is scoped to allowed file types and scan status placeholders before any trust outcome is finalized.",
  },
  {
    title: "Human Review",
    body: "Low-confidence, suspicious, or incomplete cases should move toward human review instead of automatic clearance.",
  },
  {
    title: "No Perfect Detection Claim",
    body: "The system does not claim perfect detection. It combines signals, provenance, review, and auditability to reduce risk.",
  },
];

const concepts = [
  "source_ip_hash",
  "user_agent_hash",
  "suspicious_activity",
  "abuse_risk",
  "scan_status",
  "allowed_file_type",
  "rate_limit_status",
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <h1 className="mt-8 text-5xl font-bold">
          Cyber Sentinels Security Layer
        </h1>

        <p className="mt-5 max-w-3xl text-lg text-zinc-300">
          Cyber Sentinels assumes attack from day one. Every trust action must
          be authenticated, validated, logged and reviewable.
        </p>

        <section className="mt-12 grid gap-8 md:grid-cols-2">
          {principles.map((principle) => (
            <article key={principle.title} className="border-t border-zinc-800 pt-6">
              <h2 className="text-2xl font-semibold">{principle.title}</h2>
              <p className="mt-3 text-zinc-400">{principle.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 border-t border-zinc-800 pt-6">
          <h2 className="text-2xl font-semibold">Security Concepts</h2>
          <div className="mt-5 grid gap-3 text-sm text-zinc-300 md:grid-cols-3">
            {concepts.map((concept) => (
              <p key={concept} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                {concept}
              </p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
