import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

const lifecycleTemplates = ["Hiring", "AI Agent", "Vendor", "Executive", "Machine Identity", "Financial Workflow", "Healthcare", "Government"];

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
        <ExecutiveSummary
          eyebrow="Solutions"
          title="Apply governed trust decisions where uncertainty carries operational or regulatory cost."
          bullets={["Govern human and machine activity in one review model.", "Escalate material risk without unsupported certainty claims.", "Keep accountable ownership visible across every outcome.", "Preserve evidence for audit, challenge and later review."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
          secondary={{ href: "/platform", label: "View Architecture" }}
        />

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="operational-eyebrow">Lifecycle templates</p>
          <h2 className="mt-2 text-2xl font-semibold">One trust lifecycle, configured for each operational domain.</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {lifecycleTemplates.map((template) => (
              <div key={template} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm font-semibold text-zinc-200">{template}</div>
            ))}
          </div>
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
            <Link href="/enterprise-access?intent=demo" className="brand-primary-action">Request Enterprise Demo</Link>
            <Link href="/platform" className="brand-secondary-action">Explore Platform</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
