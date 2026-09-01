import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Developer Documentation | Cyber Sentinels",
  description: "Cyber Sentinels API references, integration guidance, schemas and operational trust developer resources.",
  alternates: { canonical: "/developers/docs" },
};

const docs = [
  ["OpenAPI 3.1", "/api/v1/openapi.json", "Exact V1 paths, request/response schemas, scopes, errors, and examples."],
  ["Authentication", "/developers/authentication", "Create scoped keys and keep secrets server-side."],
  ["Trust Events", "/developers/trust-events", "Send structured trust activity into Cyber Sentinels."],
  ["API Keys", "/developers/api-keys", "Manage active and revoked developer keys."],
];

export default function DeveloperDocsPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Documentation</p>
          <h1 className="mt-4 text-4xl font-semibold">Developer Documentation</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            API-first guidance for embedding governed trust infrastructure into
            operational systems.
          </p>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {docs.map(([title, href, copy]) => (
            <Link key={href} href={href} className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </Link>
          ))}
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article id="webhooks" className="scroll-mt-28 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold text-zinc-100">Webhooks</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Deliver signed trust and workflow events to approved endpoints with replay-safe identifiers and auditable delivery handling.
            </p>
          </article>
          <article id="integrations" className="scroll-mt-28 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold text-zinc-100">Integrations</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Connect systems of record through scoped authentication, declared purpose and evidence-aware workflow contracts.
            </p>
          </article>
        </section>
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">V1 in plain language</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Agent", "The tenant- and API-client-bound operational identity whose exact proposed action is evaluated."],
              ["Authority", "A separate versioned scope and expiry boundary. Registration grants no business authority; after identity proof, an authorized owner/admin may grant a bounded, expiring version."],
              ["ALLOW / REVIEW / DENY", "ALLOW authorizes only the evaluated action. REVIEW requires the caller to stop for the separately agreed review process. DENY requires the caller to stop."],
              ["Receipt", "A minimized canonical decision projection. It is digested, not advertised as signed, and does not prove downstream execution or regulatory compliance."],
              ["Replay", "The ordered canonical transaction chronology with evidence, authority, policy, decision, and digest references. Customer logs are not canonical Replay."],
              ["Evidence", "Public submissions are AGENT_ASSERTED. A provider assertion is not a canonical decision, and a client digest is not an authoritative digest."],
            ].map(([title, copy]) => <article key={title} className="rounded-lg border border-zinc-800 bg-black p-4"><h3 className="font-semibold text-zinc-100">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p></article>)}
          </div>
        </section>
        <section id="error-guide" className="mt-8 scroll-mt-28 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Customer error guide</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">A 200/201 decision can be ALLOW, REVIEW, or DENY. Non-2xx means the request was not completed and is never an approval. Preserve request_id and correlation_id, never the key.</p>
          <div className="mt-5 grid gap-3 text-sm">
            {[
              ["401", "Replace a missing, invalid, expired, inactive, or revoked key; do not retry unchanged."],
              ["403", "Correct least-privilege scope or reserved evidence/provider provenance; do not retry unchanged."],
              ["404", "Check tenant, API client, environment, agent/transaction ID, and authority state. Foreign resources are intentionally hidden."],
              ["409", "For idempotency conflict, use the original unchanged request or a new key for a genuinely changed request."],
              ["429", "Honor Retry-After and use bounded backoff. Limits are per tenant/client and route class."],
              ["500 / 503 / timeout", "No response is not ALLOW. Stop the protected action; retry safely with bounded backoff and the same decision idempotency key/body."],
            ].map(([status, action]) => <div key={status} className="grid gap-2 rounded-lg border border-zinc-800 bg-black p-4 md:grid-cols-[8rem_1fr]"><code className="text-cyan-200">{status}</code><p className="text-zinc-400">{action}</p></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}
