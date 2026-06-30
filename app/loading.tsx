export default function Loading() {
  return (
    <main
      className="min-h-[70vh] bg-[#04070c] px-6 py-12 text-white md:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Cyber Sentinels
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Loading operational evidence…</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Preparing the authorized workflow view. No trust state is inferred
            while data is loading.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-lg border border-zinc-800 bg-black"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
