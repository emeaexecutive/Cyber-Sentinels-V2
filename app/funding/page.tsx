import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Funding & Build Plan | Cyber Sentinels",
  description:
    "The six-month plan to move Cyber Sentinels from prototype to enterprise MVP.",
};

const contactHref =
  "mailto:emeaexecutive@icloud.com?subject=Cyber%20Sentinels%20Funding%20%2F%20Pilot%20Interest";

const whyNow = [
  "AI agents are entering business workflows.",
  "Deepfakes and synthetic applicants are increasing.",
  "Enterprises need identity assurance, auditability and governance.",
  "Trust is becoming a security layer.",
];

const platformScope = [
  "Human identity verification",
  "AI agent passports",
  "Candidate verification",
  "Deepfake and synthetic actor detection",
  "Trust scoring",
  "Governance workflows",
  "Audit logs",
  "Enterprise dashboards",
];

const phases = [
  {
    period: "Month 1",
    title: "Demonstrate the enterprise core",
    items: [
      "Simplify dashboard",
      "Finalise trust passport",
      "Add audit logs",
      "Complete Stripe setup",
      "Prepare investor demo",
    ],
  },
  {
    period: "Months 2–3",
    title: "Connect verification and review",
    items: [
      "Add ATS integrations",
      "Add verification API integrations",
      "Add governance case workflow",
      "Add admin approval controls",
      "Add candidate verification flow",
    ],
  },
  {
    period: "Months 4–6",
    title: "Operationalise enterprise pilots",
    items: [
      "Add AI agent registry",
      "Add enterprise reporting",
      "Add pilot customer workflows",
      "Add trust scoring engine",
      "Harden security, RBAC, MFA and audit exports",
    ],
  },
];

const fundingAllocation = [
  ["Engineering", "38%"],
  ["Product / UX", "12%"],
  ["Verification APIs", "12%"],
  ["Security / compliance", "12%"],
  ["Infrastructure", "8%"],
  ["Pilot development", "10%"],
  ["Legal and governance", "8%"],
];

const audiences = [
  "Angel investors",
  "Cybersecurity founders",
  "Identity verification experts",
  "AI infrastructure investors",
  "HR tech partners",
  "Enterprise SaaS operators",
  "Strategic pilot customers",
  "CTO / CPTO / CISO co-founder candidates",
];

const callsToAction = [
  "Request Investor Brief",
  "Become a Pilot Partner",
  "Discuss Strategic Funding",
  "Join as Co-Founder",
];

export default function FundingPage() {
  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="grid-bg border-b border-zinc-900 px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Funding &amp; 6-month build acceleration
          </p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold md:text-6xl">
            Fund the Trust Layer for the AI Era
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-200 md:text-xl">
            Cyber Sentinels verifies whether humans, AI agents, candidates and
            workflow actors can be trusted before they enter critical enterprise
            systems.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={contactHref}
              className="brand-primary-action brand-action-large text-sm"
            >
              Request Investor Brief
            </a>
            <a
              href={contactHref}
              className="brand-secondary-action brand-action-large text-sm"
            >
              Become a Pilot Partner
            </a>
          </div>
          <div className="mt-12 max-w-4xl border-l-2 border-cyan-400 pl-5">
            <p className="text-lg leading-8 text-zinc-100">
              Cyber Sentinels is not another dashboard. It is a verification and
              governance layer for the AI era — built to help enterprises
              understand who or what is entering their workflows, why trust
              changed, and what evidence supports that decision.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Why now
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Trust is moving into the security stack.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Enterprise access is no longer limited to employees and static
              credentials. Human and machine actors now participate in the same
              consequential workflows.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {whyNow.map((item, index) => (
              <article
                key={item}
                className="rounded-lg border border-zinc-800 bg-black p-5"
              >
                <p className="text-xs font-semibold text-cyan-200">
                  0{index + 1}
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-zinc-100">
                  {item}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/80 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            What we are building
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
            One evidence-backed trust layer across identity, agents and
            enterprise workflows.
          </h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
            {platformScope.map((item) => (
              <div key={item} className="bg-black p-5">
                <p className="text-sm font-semibold text-zinc-100">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
          6-month MVP target
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-3xl text-3xl font-semibold">
            From working prototype to pilot-ready enterprise MVP.
          </h2>
          <p className="text-sm text-zinc-400">Build horizon: 26 weeks</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {phases.map((phase, index) => (
            <article
              key={phase.period}
              className="relative border-t-2 border-cyan-400 pt-6"
            >
              <span className="absolute -top-2 left-0 h-3.5 w-3.5 rounded-full border-2 border-[#04070c] bg-cyan-300" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Phase {index + 1} · {phase.period}
              </p>
              <h3 className="mt-3 text-xl font-semibold">{phase.title}</h3>
              <ul className="mt-5 grid gap-3 text-sm text-zinc-300">
                {phase.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="text-cyan-300">
                      —
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/80 px-6 py-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Funding use
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Capital aligned to delivery.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              An indicative allocation focused on product delivery, enterprise
              assurance and converting early partnerships into operational
              pilots.
            </p>
          </div>
          <div className="grid gap-3">
            {fundingAllocation.map(([area, allocation]) => (
              <div
                key={area}
                className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-zinc-800 bg-black px-5 py-4"
              >
                <p className="text-sm font-semibold text-zinc-100">{area}</p>
                <p className="font-mono text-sm text-cyan-200">{allocation}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
          Who we want to talk to
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
          Partners who understand the operating problem.
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((audience) => (
            <div
              key={audience}
              className="rounded-lg border border-zinc-800 bg-black p-5 text-sm font-semibold text-zinc-100"
            >
              {audience}
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl rounded-xl border border-cyan-900 bg-[linear-gradient(135deg,rgba(8,47,73,0.5),rgba(0,0,0,0.96))] p-6 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Build with us
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">
            Help turn the trust layer into an enterprise-ready product.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-200">
            We are seeking funding, strategic partners, pilots and co-founders
            who can accelerate a focused six-month build.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {callsToAction.map((label, index) => (
              <a
                key={label}
                href={contactHref}
                className={
                  index === 0
                    ? "brand-primary-action brand-action-large text-sm"
                    : "brand-secondary-action brand-action-large text-sm"
                }
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
