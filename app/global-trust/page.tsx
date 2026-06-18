import Link from "next/link";

const sections = [
  [
    "Global Trust Layer",
    "Cyber Sentinels is operational trust infrastructure for hiring, AI workflows, evidence, organisations and governed digital interactions.",
  ],
  [
    "Secure Back Office",
    "Protected review workflows keep sensitive verification, decisions, evidence and audit history behind authenticated operations.",
  ],
  [
    "Dynamic Verification Workflows",
    "Verification cases, queues, signals and human review paths support different trust journeys without hard-coding a single workflow.",
  ],
  [
    "Evidence Vault",
    "Evidence records, provenance, scan status and chain of custody are treated as first-class trust artefacts.",
  ],
  [
    "Trust API",
    "External apps can request trust checks, decision guidance, passport summaries and evidence summaries through safe API foundations.",
  ],
  [
    "Verification Receipts",
    "Verification receipts package evidence, provenance and review state into a reviewable trust record.",
  ],
  [
    "Operational Identity Context",
    "Identity context supports review without treating biometric or behavioral signals as standalone truth.",
  ],
  [
    "Origin Trace™",
    "Origin Trace inspects attribution confidence, source clues, metadata, watermark and upload-chain state.",
  ],
  [
    "Compliance Ready",
    "The platform is moving toward audit-ready verification, regional deployment choices and exportable decision history.",
  ],
  [
    "Enterprise-Grade Future Architecture",
    "The V1 app stays lean while leaving clear paths for hardened compute, storage, queues, immutability and API governance.",
  ],
];

const architecture = [
  "Supabase for V1 database/auth/storage",
  "Vercel for app deployment",
  "Future secure compute layer for media analysis",
  "Future dedicated evidence storage",
  "Future queue workers for video/audio scanning",
  "Future audit immutability layer",
  "Future API gateway and rate limiting",
];

const placeholders = [
  "secure_media_processing",
  "encrypted_evidence_storage",
  "audit_immutability_layer",
  "api_gateway",
  "regional_data_controls",
  "compliance_exports",
];

export default function GlobalTrustPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/back-office", "Back Office"],
            ["/security", "Security"],
            ["/api-docs", "Trust API"],
            ["/evidence-vault", "Evidence Vault"],
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
            Platform readiness
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Global Trust Infrastructure
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Evidence-backed trust workflows for hiring, AI operations and
            enterprise governance.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map(([title, body]) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Security Architecture</h2>
            <div className="mt-5 space-y-3">
              {architecture.map((item) => (
                <p
                  key={item}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">
              Future Infrastructure Placeholders
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {placeholders.map((placeholder) => (
                <code
                  key={placeholder}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                >
                  {placeholder}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
