export default function ContinuousTrustLoading() {
  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white" aria-busy="true">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-5 w-56 animate-pulse rounded bg-cyan-950" />
        <div className="h-12 max-w-2xl animate-pulse rounded bg-zinc-900" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl bg-zinc-900" />
          ))}
        </div>
        <p className="sr-only">Loading Continuous Trust data.</p>
      </div>
    </main>
  );
}
