import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Operational Trust Intelligence™ | Cyber Sentinels",
  description:
    "Cyber Sentinels is building the Operational Trust Intelligence™ platform for intelligent enterprises. It transforms fragmented identity, security, AI and operational evidence into continuously explainable, evidence-backed trust decisions.",
  alternates: { canonical: "/" },
};

const capabilityThemes = [
  {
    theme: "Understand",
    names: "Trust Narrative™ · Trust Explanation™ · Trust Confidence™",
    description: "Understand why trust changed and which evidence supports the conclusion.",
  },
  {
    theme: "Anticipate",
    names: "Trust Drift™ · Trust Stability™ · Trust Prediction™",
    description: "Identify material changes that may require additional verification or human review.",
  },
  {
    theme: "Act",
    names: "Trust Recommendation™ · Trust Advisor™ · Trust Recovery™",
    description: "Surface the next evidence-backed action required to restore or maintain operational trust.",
  },
  {
    theme: "Remember",
    names: "Replay™ · Trust Memory™ · Authority Lineage™ · Trust Continuity™",
    description: "Preserve who acted, what authority existed and how trust evolved over time.",
  },
];

const publicQuestions = [
  "What changed?",
  "Why did trust change?",
  "Who authorized the action?",
  "Which evidence supported the decision?",
  "Who was accountable?",
  "What happened next?",
  "Can the organization prove it?",
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
        <p className="operational-eyebrow">Cyber Sentinels</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight text-white md:text-6xl">
          Operational Trust Intelligence™
        </h1>
        <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-300 md:text-xl">
          The control layer between intelligent systems and real-world action.
        </p>
        <p className="mt-4 max-w-4xl text-base leading-8 text-zinc-300">
          Cyber Sentinels is building the Operational Trust Intelligence™ platform for intelligent enterprises. Before an AI agent acts, the control plane verifies identity, bounded authority, policy and current evidence, then returns ALLOW, REVIEW or DENY and preserves why.
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
          Evidence-backed. Continuously explainable. Customer-controlled.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/documents/operational-trust-whitepaper" className="brand-secondary-action brand-action-large">
            Read the technical whitepaper
          </Link>
          <Link href="/enterprise-access?intent=design_partner" className="brand-primary-action brand-action-large">
            Join the design-partner programme
          </Link>
          <Link href="/enterprise-access?intent=intro_call" className="brand-secondary-action brand-action-large">
            Request an enterprise conversation
          </Link>
        </div>
      </section>

      <section id="operational-trust-intelligence" className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl scroll-mt-28 px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Capability vocabulary</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-white">Understand trust as it changes.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            AI systems increasingly act across identity, security and business workflows. Cyber Sentinels is building
            the operational trust layer that helps enterprises understand what changed, why trust changed, who was
            accountable and what happened next.
          </p>
          <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {capabilityThemes.map((capability) => (
              <article key={capability.theme} className="border-l border-zinc-700 pl-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{capability.theme}</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{capability.names}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{capability.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:px-8 md:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="operational-eyebrow">Why it matters</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Operational evidence should outlast the alert.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Most platforms detect, authenticate, monitor or contain. Cyber Sentinels preserves the operational
              evidence showing what changed, why trust changed, who was accountable and what happened next.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {publicQuestions.map((question) => (
              <p key={question} className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                {question}
              </p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
