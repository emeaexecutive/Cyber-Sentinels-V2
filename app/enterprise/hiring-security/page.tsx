import Link from "next/link";

export const dynamic = "force-dynamic";

const capabilities = [
  "Candidate verification",
  "Recruiter verification",
  "Deepfake interview risk",
  "Proxy candidate risk",
  "Liveness checks",
  "Audit-ready hiring trust reports",
];

export default function HiringSecurityPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trusted Hiring
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Interview Integrity Infrastructure
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels helps hiring teams verify candidates and recruiters,
            track deepfake and proxy-candidate risk, and produce audit-ready
            trust reports for sensitive interview workflows.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/verify/candidate" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Verify Candidate
            </Link>
            <Link href="/recruiter/dashboard" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100">
              Recruiter Dashboard
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => (
            <article key={capability} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-sm font-medium text-zinc-100">{capability}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Placeholder-ready controls, timeline events and risk signals
                that can connect to specialist providers later.
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
