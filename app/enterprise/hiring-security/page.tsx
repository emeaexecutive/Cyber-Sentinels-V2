import Link from "next/link";

export const dynamic = "force-dynamic";

const capabilities = [
  "Candidate Provenance",
  "Recruiter Verification",
  "Interview Integrity",
  "Hiring Security",
  "Trusted Hiring Infrastructure",
  "Governed escalation workflows",
];

export default function HiringSecurityPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Hiring Security
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            The future of hiring is trust.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels helps enterprises verify the human behind the
            interview, protect hiring workflows against synthetic trust attacks
            and coordinate explainable review through existing trust cases,
            governance actions, audit logs, timelines and replay.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
            This is not a binary deepfake detector. It is operational trust
            infrastructure for candidate provenance, recruiter verification,
            interview integrity and human-governed hiring decisions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/interview-risk" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Open Interview Risk Dashboard
            </Link>
            <Link href="/enterprise-access" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm text-cyan-100">
              Request Enterprise Access
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => (
            <article key={capability} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-sm font-medium text-zinc-100">{capability}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Explainable controls, timeline events and placeholder signal
                interfaces that can connect to specialist providers later
                without claiming automated detection accuracy.
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">
            Protect enterprise hiring workflows against synthetic trust attacks.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Hiring Security and Interview Integrity reuse Cyber Sentinels trust
            orchestration: workspaces, trust cases, evidence chains,
            notifications, governance queues, timelines, relationships, audit
            logs, replay and explainable trust reports.
          </p>
        </section>
      </div>
    </main>
  );
}
