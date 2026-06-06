import Link from "next/link";
import { AdminReviewQueuePlaceholder } from "@/components/phase-one-trust";

export const dynamic = "force-dynamic";

export default function TrustOpsPage() {
  const links = [
    ["/verify/candidate", "Candidate verification"],
    ["/verify/recruiter", "Recruiter verification"],
    ["/agents/register", "Register agent"],
    ["/verify/provenance", "Verify provenance"],
    ["/trust/analytics", "Trust analytics"],
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">TrustOps</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Operational Trust Console</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Phase 1 workspace for trusted hiring, agent identity, interview integrity and provenance review queues.
          </p>
        </section>
        <section className="mt-8 grid gap-3 md:grid-cols-5">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300 hover:border-cyan-800 hover:text-white">
              {label}
            </Link>
          ))}
        </section>
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Admin Review Queue</h2>
          <div className="mt-5"><AdminReviewQueuePlaceholder /></div>
        </section>
      </div>
    </main>
  );
}

