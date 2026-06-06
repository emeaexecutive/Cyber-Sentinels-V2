import { AdminReviewQueuePlaceholder, RecruiterDashboardCards } from "@/components/phase-one-trust";

export const dynamic = "force-dynamic";

export default function TrustAnalyticsPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Trust Analytics</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Trusted Hiring and Provenance Analytics</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Operational view of candidate verification, recruiter trust, agent identity and provenance review activity.
          </p>
        </section>
        <section className="mt-8"><RecruiterDashboardCards /></section>
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Admin Review Queue</h2>
          <div className="mt-5"><AdminReviewQueuePlaceholder /></div>
        </section>
      </div>
    </main>
  );
}

