"use client";

export default function ContinuousTrustError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#04070c] p-8 text-white">
      <section className="mx-auto max-w-2xl rounded-2xl border border-red-900/60 bg-red-950/20 p-6">
        <h1 className="text-2xl font-semibold">Continuous Trust is temporarily unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          No trust state was changed. Retry after checking database and provider health.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
