import Link from "next/link";
import { PUBLIC_API_VERSION, publicEndpointContracts } from "@/lib/api/public-endpoint-inventory";

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Public API contract {PUBLIC_API_VERSION}</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Operational Trust API Reference</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            These are the documented public reads, signed callbacks and bounded intake routes. Protected application APIs remain internal and require the authenticated session, admin authorization and tenant controls defined by their owning workflow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/developers/authentication" className="brand-primary-action">Authentication</Link>
            <Link href="/docs/API_MATURITY.md" className="brand-secondary-action">API maturity audit</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4">
          {publicEndpointContracts.map((endpoint) => (
            <article key={`${endpoint.method}-${endpoint.path}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-emerald-800 px-3 py-1 text-xs font-semibold text-emerald-200">{endpoint.method}</span>
                <code className="text-sm text-zinc-200">{endpoint.path}</code>
                <span className="ml-auto rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">{endpoint.authentication}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">{endpoint.purpose}</p>
              <dl className="mt-4 grid gap-3 text-xs md:grid-cols-2">
                <div><dt className="uppercase tracking-[0.12em] text-zinc-600">Request schema</dt><dd className="mt-1 text-zinc-400">{endpoint.requestSchema}</dd></div>
                <div><dt className="uppercase tracking-[0.12em] text-zinc-600">Response schema</dt><dd className="mt-1 text-zinc-400">{endpoint.responseSchema}</dd></div>
                <div><dt className="uppercase tracking-[0.12em] text-zinc-600">Pagination</dt><dd className="mt-1 text-zinc-400">{endpoint.pagination}</dd></div>
                <div><dt className="uppercase tracking-[0.12em] text-zinc-600">Audit / trace</dt><dd className="mt-1 text-zinc-400">{endpoint.audit}</dd></div>
              </dl>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-amber-900/60 bg-amber-950/10 p-5 text-sm leading-7 text-amber-100">
          Successful public reads use <code>{`{ ok, data fields, meta: { version, trace_id, audit_id, timestamp, pagination? } }`}</code>. Errors use <code>{`{ ok: false, error: { code, message }, meta }`}</code>. Public verification data is bounded and never includes raw provider payloads, private evidence or secrets.
        </section>
      </div>
    </main>
  );
}
