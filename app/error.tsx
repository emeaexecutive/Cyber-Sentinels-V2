"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Cyber Sentinels route render failed.", {
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="min-h-[70vh] bg-[#04070c] px-6 py-12 text-white md:px-8">
      <section className="mx-auto max-w-2xl rounded-lg border border-red-950 bg-zinc-950 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-200">
          Operational view unavailable
        </p>
        <h1 className="mt-3 text-3xl font-semibold">This page could not be loaded safely.</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          The request stopped without changing workflow trust state. Retry the
          view, or return to the dashboard and inspect runtime validation if the
          problem continues.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="brand-primary-action brand-action-large text-sm"
          >
            Retry
          </button>
          <Link href="/dashboard" className="brand-secondary-action brand-action-large text-sm">
            Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
