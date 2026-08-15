"use client";

import Link from "next/link";

export default function OperationalEntityError({ reset }: { reset: () => void }) {
  return <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16 text-slate-900">
    <section className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-800">Operational Entity unavailable</p>
      <h1 className="mt-2 text-2xl font-semibold">Trust evidence could not be loaded</h1>
      <p className="mt-3 text-sm leading-6 text-rose-950">No trust result has been inferred. Retry the tenant-scoped evidence request, or return to the entity list.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="rounded-xl bg-rose-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-900" onClick={reset} type="button">Try again</button>
        <Link className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-900" href="/operational-entities">Back to Operational Entities</Link>
      </div>
    </section>
  </main>;
}
