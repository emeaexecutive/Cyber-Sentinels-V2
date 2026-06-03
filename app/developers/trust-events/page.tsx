export default function DeveloperTrustEventsPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Trust Events</p>
          <h1 className="mt-4 text-4xl font-semibold">Trust Event API</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            Send structured trust activity into Cyber Sentinels for audit-aware
            workflow visibility.
          </p>
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Endpoint</h2>
            <code className="mt-4 block rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
              POST /api/trust-events
            </code>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Response</h2>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-7 text-zinc-300">
{`{
  "event_id": "uuid",
  "timestamp": "2026-06-03T00:00:00.000Z",
  "status": "created"
}`}
            </pre>
          </article>
        </section>
      </div>
    </main>
  );
}
