import Link from "next/link";

const useCases = [
  "Hiring Security",
  "Enterprise Governance",
  "Verification Workflows",
  "AI Agent Verification",
  "Audit-Ready Reviews",
  "Human-Governed Decisions",
];

const trustControls = [
  ["Deployment readiness", "Controlled private-beta access, readiness gates and operational health checks are visible before pilot activation."],
  ["Governed verification", "Cases, evidence, approvals and reviewer actions stay connected in one explainable workflow."],
  ["Auditability", "Receipts and timelines preserve the context behind sensitive human and AI-agent decisions."],
];

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Enterprise
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Enterprise trust for humans, AI agents, and critical workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Verify identities, review risk flags, govern sensitive decisions,
            and preserve an audit-ready record across regulated operations.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/enterprise/hiring-security" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
              Hiring Security
            </Link>
            <Link href="/enterprise/demo-stories" className="rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Demo Stories
            </Link>
            <Link href="/enterprise/pilot-setup" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
              Pilot Setup
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {useCases.map((item) => (
            <div key={item} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-300">{item}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Enterprise trust controls</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {trustControls.map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Pilot conversion path</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels is onboarding design collaborators to validate
            evidence-backed verification, governance workflows and operational
            transparency in real environments.
          </p>
          <Link
            href="/enterprise-access"
            className="mt-5 inline-flex rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
          >
            Request Enterprise Access
          </Link>
          <Link
            href="/enterprise/pilot-setup"
            className="ml-3 mt-5 inline-flex rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
          >
            Create Pilot Workspace
          </Link>
        </section>
      </div>
    </main>
  );
}
