import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureBlock, ComparisonCard, DecisionFlow, LifecycleDiagram, VisualFrame } from "@/components/enterprise-visuals";
import { InteractiveTrustWalkthrough } from "@/components/interactive-trust-walkthrough";

export const metadata: Metadata = {
  title: "Operational Trust Infrastructure | Cyber Sentinels",
  description: "Continuously establish trust for humans, AI agents, machine identities and regulated workflows before, during and after critical actions.",
  alternates: { canonical: "/" },
};

const lifecycle = [
  { label: "Establish Trust", detail: "Initiate" },
  { label: "Resolve Identity", detail: "Identify" },
  { label: "Confirm Authority", detail: "Authorize" },
  { label: "Collect Evidence", detail: "Normalize" },
  { label: "Evaluate Trust", detail: "Decide" },
  { label: "Enforce Decision", detail: "Control" },
  { label: "Retain Proof", detail: "Replay" },
];

const decisionFlow = [
  { label: "Identity" }, { label: "Authority" }, { label: "Provider evidence" },
  { label: "Evidence quality" }, { label: "Trust Decision" }, { label: "Enforcement" }, { label: "Replay" },
];

const protectedActivity = [
  ["Humans", "Keep identity evidence separate from the authority to perform a consequential action."],
  ["AI agents", "Constrain delegated actions by owner, purpose, scope, policy and current runtime evidence."],
  ["Machine identities", "Connect credentials and service activity to accountable ownership and workflow context."],
  ["Regulated workflows", "Preserve the decision, enforcement outcome, Replay and governance trail."],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
        <p className="operational-eyebrow">Cyber Sentinels</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight text-white md:text-6xl">Operational Trust Infrastructure<br className="hidden md:block" /> for Intelligent Enterprises</h1>
        <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-300 md:text-xl">Continuously establish trust for humans, AI agents, machine identities and regulated workflows before, during and after critical actions.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-access?intent=demo" className="brand-primary-action brand-action-large">Request Enterprise Demo</Link>
          <Link href="/demo/trust-execution-flow" className="brand-secondary-action brand-action-large">See Trust in Action</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Why Operational Trust</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Access is a moment. Trust must survive the action.</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">Enterprises need to know who or what is acting, whether it still has authority, what evidence supports the decision, and what was enforced. Cyber Sentinels keeps those facts connected and reviewable.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="operational-eyebrow">Operational Trust Lifecycle</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">See Trust in Action</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">The guided flow is an approved demonstration. Its labels distinguish Test Mode and simulated steps from real provider activity.</p>
        <div className="mt-8"><InteractiveTrustWalkthrough /></div>
        <div className="mt-6"><LifecycleDiagram steps={lifecycle} /></div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
          <p className="operational-eyebrow">Customer Outcomes</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">What We Protect</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {protectedActivity.map(([title, copy]) => <article key={title} className="operational-card p-5"><h3 className="text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="operational-eyebrow">Why Different</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Traditional Identity vs Operational Trust</h2>
        <div className="mt-8 grid gap-6">
          <ComparisonCard left={{ title: "Traditional Identity", items: ["Identity", "Authentication", "MFA", "Access"] }} right={{ title: "Operational Trust", items: ["Authority", "Runtime evidence", "Policy", "Decision", "Enforcement", "Replay"] }} />
          <VisualFrame eyebrow="One Trust Assessment" title="One action coordinates the existing trust fabric."><DecisionFlow steps={decisionFlow} /></VisualFrame>
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
          <p className="operational-eyebrow">Enterprise Trust Fabric™</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">One evidence chain across human and machine activity.</h2>
          <ArchitectureBlock inputs={["Humans", "AI Agents", "Machine Identities", "Regulated Workflows"]} core="Enterprise Trust Fabric™" outputs={["Trust Decision", "Enforcement", "Replay", "Evidence Pack"]} />
          <div className="mt-12 border-t border-zinc-800 pt-10 text-center">
            <p className="operational-eyebrow">Enterprise Pilot</p>
            <h3 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold text-white md:text-4xl">Choose one consequential workflow. Make every trust decision explainable.</h3>
            <Link href="/enterprise-access?intent=demo" className="mt-7 inline-flex brand-primary-action brand-action-large">Request Enterprise Demo</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
