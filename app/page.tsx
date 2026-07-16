import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonCard, LifecycleDiagram, VisualFrame } from "@/components/enterprise-visuals";

export const metadata: Metadata = {
  title: "Operational Trust Infrastructure | Cyber Sentinels",
  description: "Reduce operational uncertainty by making critical trust decisions explainable, enforceable and replayable.",
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

const protectedActivity = [
  ["Humans", "Keep identity evidence separate from the authority to perform a consequential action."],
  ["AI agents", "Constrain delegated actions by owner, purpose, scope, policy and current runtime evidence."],
  ["Machine identities", "Connect credentials and service activity to accountable ownership and workflow context."],
  ["Regulated workflows", "Preserve the decision, enforcement outcome, Replay and governance trail."],
  ["Executive decisions", "Keep evidence, authority and accountable review connected to consequential approvals."],
  ["Critical operations", "Reassess trust as context changes before sensitive execution continues."],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
        <p className="operational-eyebrow">Cyber Sentinels</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight text-white md:text-6xl">Operational Trust Infrastructure<br className="hidden md:block" /> for Intelligent Enterprises</h1>
        <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-300 md:text-xl">Reduce operational uncertainty by continuously establishing trust for humans, AI agents, machine identities and regulated workflows before, during and after critical actions.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-access?intent=demo" className="brand-primary-action brand-action-large">Request Enterprise Demo</Link>
          <Link href="/demo/trust-execution-flow" className="brand-secondary-action brand-action-large">See Trust in Action</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Why Operational Trust</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Know whether a critical action should proceed—and why.</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">Keep the actor, current authority, supporting evidence and enforced outcome connected so every consequential decision can be understood and reviewed.</p>
        </div>
      </section>

      <section id="primary-operational-trust-flow" data-testid="primary-operational-trust-flow" className="mx-auto max-w-6xl scroll-mt-28 px-6 py-16 md:px-8 md:py-20">
        <p className="operational-eyebrow">Operational Trust Lifecycle</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-white">See operational trust evolve before, during and after a critical action.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">One contextual evidence chain connects the actor, authority, decision, enforced outcome and current posture.</p>
        <VisualFrame eyebrow="Primary operational trust flow" title="One action. One attributable trust record.">
          <LifecycleDiagram steps={lifecycle} />
        </VisualFrame>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
          <p className="operational-eyebrow">Customer Outcomes</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Keep consequential work accountable.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {protectedActivity.map(([title, copy]) => <article key={title} className="operational-card p-5"><h3 className="text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="operational-eyebrow">Why Different</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Move beyond point-in-time access decisions.</h2>
        <div className="mt-8"><ComparisonCard left={{ title: "Traditional Identity", items: ["Identity", "Authentication", "MFA", "Access"] }} right={{ title: "Operational Trust", items: ["Authority", "Runtime evidence", "Policy", "Decision", "Enforcement", "Replay"] }} /></div>
      </section>

      <section className="border-t border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
          <p className="operational-eyebrow">Enterprise Trust Fabric™</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Understand and replay every critical trust decision.</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">Connect identity, authority, runtime context, policy, enforcement and review without replacing systems of record.</p>
          <div className="mt-7 flex flex-wrap gap-2" aria-label="Enterprise Trust Fabric preview">
            {["Provider-neutral orchestration", "External authorization", "Runtime mediation", "Replayable evidence"].map((item) => <span key={item} className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-300">{item}</span>)}
          </div>
          <div className="mt-12 border-t border-zinc-800 pt-10 text-center">
            <p className="operational-eyebrow">Enterprise Pilot</p>
            <h3 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold text-white md:text-4xl">Choose one consequential workflow. Make every trust decision explainable.</h3>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-400">Start with one workflow, define the authority boundary, and retain the evidence needed to explain each decision.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
