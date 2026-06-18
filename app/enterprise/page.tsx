import Link from "next/link";

const useCases = [
  "Hiring Security",
  "Enterprise Governance",
  "Operational Trust",
  "Demo Stories",
  "Verification Workflows",
  "Explainable Governance",
  "Verification Receipts",
  "Replayable Trust Timelines",
  "Evidence Chains",
  "Human-Governed Review",
];

const trustSignals = [
  ["Deployment readiness", "Controlled private-beta access, readiness gates and operational health checks are visible before pilot activation."],
  ["Operational readiness", "Workspaces, cases, evidence, governance actions, receipts and replay are connected in one review path."],
  ["Governance philosophy", "Cyber Sentinels supports accountable human review instead of black-box trust outcomes."],
  ["Explainability principles", "Receipts, reason codes, timelines and replay make review context understandable."],
  ["Human review principles", "Sensitive workflow outcomes stay tied to named review actions and audit history."],
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
            Operational Trust Infrastructure for AI-era workflows.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels helps enterprise teams connect evidence, human
            review, governance actions, verification receipts and replayable
            timelines into explainable operational trust workflows.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Detection and provenance are signals. Trust requires orchestration
            through governance, timelines, evidence chains, verification
            receipts and human review.
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
          <h2 className="text-2xl font-semibold">Enterprise trust signals</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {trustSignals.map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
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
