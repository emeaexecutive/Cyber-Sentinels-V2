"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen bg-[#04070c] px-5 py-16 text-white"><div className="mx-auto max-w-2xl rounded-lg border border-rose-900 bg-rose-950/20 p-6"><p className="text-xs uppercase tracking-[0.16em] text-rose-300">Canonical data unavailable</p><h1 className="mt-3 text-2xl font-semibold">The V1 dashboard could not be loaded.</h1><p className="mt-3 text-sm leading-6 text-zinc-400">No historical or synthetic records have been substituted. Retry when the canonical data plane is available.</p><button type="button" onClick={reset} className="mt-5 rounded bg-white px-4 py-2 text-sm font-semibold text-black">Retry</button></div></main>;
}
