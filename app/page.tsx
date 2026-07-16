import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonCard, LifecycleDiagram, VisualFrame } from "@/components/enterprise-visuals";

export const metadata: Metadata = {
  title: "Operational Trust Infrastructure | Cyber Sentinels",
  description: "Evidence-backed decisions, continuous authorization and replayable operations for intelligent enterprises.",
  alternates: { canonical: "/" },
};

const lifecycle = [
  { label: "Identity" },
  { label: "Authority" },
  { label: "Context" },
  { label: "Evidence" },
  { label: "Trust Decision" },
  { label: "Enforcement" },
  { label: "Replay" },
  { label: "Trust Memory™" },
  { label: "Current Trust Posture" },
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
        <p className="operational-eyebrow">Cyber Sentinels</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight text-white md:text-6xl">
          Operational Trust Infrastructure<br className="hidden md:block" /> for Intelligent Enterprises
        </h1>
        <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-300 md:text-xl">
          Give Fortune 500 security leaders evidence-backed decisions, continuous authorization and replayable operations across people, AI agents and machine identities.
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
          Enterprise Trust Fabric™ connects authority, runtime evidence, AI Agent Governance and Trust Memory™ without replacing systems of record.
        </p>
        <div className="mt-8">
          <Link href="/enterprise-access?intent=demo" className="brand-primary-action brand-action-large">Request Enterprise Demo</Link>
        </div>
      </section>

      <section id="primary-operational-trust-flow" data-testid="primary-operational-trust-flow" className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl scroll-mt-28 px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Operational Trust Lifecycle</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-white">Know whether a critical action should proceed—and why.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">One evidence chain connects identity, authority, policy, decision, enforced outcome, Replay and current posture.</p>
          <VisualFrame eyebrow="Primary operational trust flow" title="One action. One attributable trust record.">
            <LifecycleDiagram steps={lifecycle} />
          </VisualFrame>
        </div>
      </section>

      <section className="bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Why Different</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Move beyond point-in-time access decisions.</h2>
          <div className="mt-8">
            <ComparisonCard
              left={{ title: "Traditional Identity", items: ["Identity", "Authentication", "MFA", "Access"] }}
              right={{ title: "Operational Trust", items: ["Authority", "Runtime evidence", "Policy", "Decision", "Enforcement", "Replay"] }}
            />
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-400">
            Security leaders can see who acted, under whose authority, with which evidence, why the decision changed, and how the operation can be replayed.
          </p>
        </div>
      </section>
    </main>
  );
}
