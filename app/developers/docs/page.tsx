import Link from "next/link";

const docs = [
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
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {docs.map(([title, href, copy]) => (
            <Link key={href} href={href} className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
