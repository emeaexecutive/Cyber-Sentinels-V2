import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

const homepageAnswers = [
  [
    "What is it?",
    "An independent operational trust layer across systems, providers and accountable reviewers.",
  ],
  [
    "Who is it for?",
    "Security, risk, compliance and operations teams governing consequential human and machine activity.",
  ],
  [
    "What problem does it solve?",
    "It manages a Continuous Trust Lifecycle as evidence, authority and risk change before, during and after execution.",
  ],
  [
    "Why is it different?",
    "It preserves why an action advanced, changed or stopped without claiming autonomous truth or perfect certainty.",
  ],
];

const platformFlow = [
  "Lifecycle",
  "Evidence",
  "Authority",
  "Decision",
  "Replay",
  "Governance",
  "Trust Memory\u2122",
  "Outcome",
];

const deeperLinks = [
  ["Platform", "/platform", "Architecture, Trust Memory, Runtime Trust and Governance."],
  ["Solutions", "/solutions", "Business problems by workflow domain."],
  ["Trust Center", "/trust", "Replay, evidence, provider boundaries and trust principles."],
  ["Enterprise", "/enterprise", "Enterprise readiness, pilot fit and buying questions."],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-14 md:px-8 md:pb-20 md:pt-24">
        <ExecutiveSummary
          eyebrow="Enterprise Trust Infrastructure"
          title="Continuous Trust Lifecycle infrastructure for humans, AI agents, machine identities and regulated workflows."
          bullets={["Know who or what acted and under whose authority.", "See material runtime risk before sensitive work continues.", "Route uncertain outcomes to an accountable owner.", "Prove each decision through evidence, replay and governance."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
          secondary={{ href: "/platform", label: "View Architecture" }}
        />
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <p className="operational-eyebrow">The short answer</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {homepageAnswers.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h2 className="text-base font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8">
        <p className="operational-eyebrow">How it works</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Operational Trust from lifecycle context to durable Decision Intelligence.</h2>
        <div className="mt-7 grid overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-8">
          {platformFlow.map((step, index) => (
            <div key={step} className="min-w-0 bg-black p-4">
              <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="operational-eyebrow">Where to go next</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Every detail has a clear home.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            The homepage gives the enterprise story. Platform explains architecture. Trust Center owns replay, evidence boundaries and provider transparency. Solutions stay focused on business problems.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {deeperLinks.map(([title, href, copy]) => (
            <Link key={href} href={href} className="operational-card block p-5 hover:border-cyan-800">
              <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
