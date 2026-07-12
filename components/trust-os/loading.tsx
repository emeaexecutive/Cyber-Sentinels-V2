export function TrustOSLoading({ label = "Loading enterprise workspace" }: { label?: string }) {
  return (
    <main className="min-h-screen bg-[#06080c] px-5 py-8 text-white sm:px-6 md:px-8" aria-busy="true" aria-label={label}>
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-3 w-40 rounded bg-zinc-800" />
        <div className="mt-4 h-10 max-w-xl rounded bg-zinc-800" />
        <div className="mt-4 h-4 max-w-3xl rounded bg-zinc-900" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-lg border border-zinc-800 bg-zinc-950" />)}
        </div>
        <div className="mt-8 h-72 rounded-lg border border-zinc-800 bg-zinc-950" />
      </div>
    </main>
  );
}
