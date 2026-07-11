import Link from "next/link";

const solutionAreas = [
  [
    "AI Agent Governance",
    "Understand whether agents acted within approved purpose, scope and accountability before sensitive work continues.",
    "/enterprise/agent-governance",
    "ai-agent-governance",
  ],
  [
    "Machine Identity Trust",
    "Keep service accounts, API actors and workload identities connected to accountable owners and delegated authority.",
    "/enterprise-access?solution=machine-identity-trust",
    "machine-identity-trust",
  ],
  [
    "Regulated Workflows",
    "Preserve evidence, authorization and human review across consequential operations with audit obligations.",
    "/enterprise-access?solution=regulated-workflows",
    "regulated-workflows",
  ],
  [
    "Financial Services",
    "Add explainable runtime trust and governance continuity to high-value financial operations.",
    "/enterprise-access?solution=financial-services",
    "financial-services",
  ],
  [
    "Insurance",
    "Connect evidence, authority and reviewed outcomes across claims and regulated insurance workflows.",
    "/enterprise-access?solution=insurance",
    "insurance",
  ],
  [
    "Executive Protection",
    "Govern sensitive identity, access and approval workflows around high-risk executive activity.",
    "/enterprise-access?solution=executive-protection",
    "executive-protection",
  ],
  [
    "Live Session Trust",
    "Track how identity, channel evidence and authorization context change after a session begins.",
    "/demo/session-integrity",
    "live-session-trust",
  ],
  [
    "Hiring Security",
    "Reduce synthetic applicant, proxy interview and unresolved session-integrity risk while keeping people teams, security and legal aligned.",
    "/enterprise/hiring-security",
    "hiring-security",
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
          {solutionAreas.map(([title, copy, href, id]) => (
            <Link id={id} key={id} href={href} className="scroll-mt-28 operational-card block p-5 hover:border-cyan-800">
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
