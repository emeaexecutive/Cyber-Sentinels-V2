import Link from "next/link";

const examples = [
  {
    method: "GET",
    path: "/api/workflows/{id}/trust",
    body: `{
  "posture": { "state": "governance_review", "explanation": "..." },
  "evidenceContinuity": [],
  "governanceLineage": [],
  "replay": { "reference": "/api/replay/{id}" }
}`,
  },
  {
    method: "GET",
    path: "/api/receipts/{id}",
    body: `{
  "portableEvidence": { "schemaVersion": 1 },
  "integrity": { "state": "verified", "checks": [] },
  "replayReference": "/api/replay/{id}"
}`,
  },
  {
    method: "POST",
    path: "/api/trust/check",
    body: `{
  "subject_type": "candidate",
  "media_type": "video",
  "biometric_confidence": 82,
  "liveness_score": 78,
  "synthetic_risk": 22,
  "attribution_confidence": 64
}`,
  },
  {
    method: "GET",
    path: "/api/trust/passport?id={passport_id}",
    body: `{
  "passport": {
    "id": "...",
    "subject_name": "Verified subject",
    "trust_score": 84
  }
}`,
  },
  {
    method: "POST",
    path: "/api/trust/decision",
    body: `{
  "requested_action": "allow",
  "subject_type": "human",
  "trust_score": 88,
  "human_presence_index": 84,
  "origin_trace_score": 76,
  "has_trust_passport": true
}`,
  },
  {
    method: "GET",
    path: "/api/trust/evidence",
    body: `{
  "evidence_summary": {
    "total": 4,
    "pending_scan": 2,
    "custody_issues": 2
  },
  "upload_workflow": "placeholder"
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/back-office", "Back Office"],
            ["/command-center", "Command Center"],
            ["/developer-console", "Developer Console"],
            ["/decision-engine", "Decision Engine"],
            ["/policy-engine", "Policy Engine"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Developer foundation
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Operational Trust API
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Cyber Sentinels provides operational trust infrastructure for
            workflows, identities and intelligent systems. Authenticated APIs
            connect replayable evidence, trust continuity, governance lineage
            and provider orchestration without exposing raw provider data.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="leading-7 text-zinc-300">
            Read APIs preserve workflow trust posture and canonical replay
            chronology. Future callbacks will notify integrated systems about
            trust-state updates while human governance remains authoritative.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            These foundations use the signed-in session and existing row-level
            security. Scoped integration credentials, signed webhooks and
            delivery retries remain future platform work.
          </p>
          <Link
            href="/developer-console"
            className="mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Developer Console
          </Link>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {examples.map((example) => (
            <div
              key={`${example.method}-${example.path}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {example.method}
                </span>
                <code className="text-sm text-zinc-300">{example.path}</code>
              </div>
              <pre className="mt-5 overflow-x-auto rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                <code>{example.body}</code>
              </pre>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
