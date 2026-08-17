export default function OperationalEntityLoading() {
  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 text-slate-900" aria-busy="true" aria-live="polite">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Operational Entity</p>
    <h1 className="mt-2 text-3xl font-semibold">Loading trust evidence…</h1>
    <p className="mt-3 max-w-2xl text-sm text-slate-600" role="status">Reconstructing identity, authority, capability evidence, relationships, and the latest canonical decision.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-3" aria-hidden="true">{[0, 1, 2].map((item) => <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" key={item} />)}</div>
  </main>;
}
