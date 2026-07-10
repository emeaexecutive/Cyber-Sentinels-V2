import Link from "next/link";

const solutionAreas = [
  [
    "Hiring Security",
    "Reduce synthetic applicant, proxy interview and unresolved session-integrity risk while keeping people teams, security and legal aligned.",
    "/enterprise/hiring-security",
  ],
  [
    "AI Agent Governance",
    "Understand whether agents acted within approved purpose, scope and accountability before sensitive work continues.",
    "/enterprise/agent-governance",
  ],
  [
    "Workforce Trust",
    "Keep verification, review and evidence continuity visible as employee, contractor and partner responsibilities change.",
    "/workforce-trust",
  ],
  [
    "Marketplace Trust",
    "Give platforms a clearer trust record for participants, claims, evidence and disputed outcomes.",
    "/marketplace-trust",
  ],
];

export default function SolutionsPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Solutions</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Business problems solved with governed trust continuity.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Solutions explain where Cyber Sentinels helps enterprise teams reduce risk, improve review quality and preserve evidence across high-consequence workflows.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Architecture details live under Platform. Replay, sovereignty and public trust principles live under Trust Center.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {solutionAreas.map(([title, copy, href]) => (
            <Link key={href} href={href} className="operational-card block p-5 hover:border-cyan-800">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">The common buyer problem</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Enterprises can see events in many tools, but they struggle to prove who or what acted, what changed, who reviewed it and why the outcome should be trusted later.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/enterprise-access" className="brand-primary-action">Request Enterprise Access</Link>
            <Link href="/platform" className="brand-secondary-action">Explore Platform</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
