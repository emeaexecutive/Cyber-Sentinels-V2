import type { Metadata } from "next";
import Link from "next/link";
import {
  ArchitectureBlock,
  ComparisonCard,
  DecisionFlow,
  LifecycleDiagram,
  Timeline,
  VisualFrame,
} from "@/components/enterprise-visuals";
import { InteractiveTrustWalkthrough } from "@/components/interactive-trust-walkthrough";

export const metadata: Metadata = {
  title: "Operational Trust Infrastructure | Cyber Sentinels",
  description: "Continuously verify humans, AI agents, machine identities and regulated workflows before, during and after critical actions.",
  alternates: { canonical: "/" },
};

const lifecycle = [
  { label: "Identity", detail: "Verify" },
  { label: "Authority", detail: "Authorize" },
  { label: "Action", detail: "Execute" },
  { label: "Evidence", detail: "Prove" },
  { label: "Replay", detail: "Reconstruct" },
  { label: "Trust Memory™", detail: "Remember" },
  { label: "Continuous Trust", detail: "Re-evaluate" },
];

const oneClickTrust = [
  { label: "Verify" },
  { label: "Collect evidence" },
  { label: "Evaluate authority" },
  { label: "Apply policy" },
  { label: "Decide" },
  { label: "Retain proof" },
];

const memoryTimeline = [
  { label: "Trust established" },
  { label: "Risk detected" },
  { label: "Authority narrowed" },
  { label: "Decision replayed" },
  { label: "Human review" },
  { label: "Current trust" },
];

const customerOutcomes = [
  ["AI Operations", "Keep delegated agent actions within approved purpose and scope."],
  ["Financial Services", "Make high-value decisions explainable and reviewable."],
  ["Critical Infrastructure", "Preserve accountable control across consequential operations."],
  ["Hiring", "Reduce synthetic and proxy risk in one governed workflow."],
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
          Continuously verify humans, AI agents, machine identities and regulated workflows before, during and after critical actions.
        </p>
        <div className="mt-8">
          <Link href="/enterprise-access?intent=demo" className="brand-primary-action brand-action-large">Request Demo</Link>
        </div>
        <div className="mt-10">
          <InteractiveTrustWalkthrough />
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Operational Trust Lifecycle</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Verify trust before, during and after each critical action.</h2>
          <div className="mt-8"><LifecycleDiagram steps={lifecycle} /></div>
          <div className="mt-6">
            <VisualFrame eyebrow="One-Click Trust Orchestration" title="One action. Multiple signals. One explainable decision.">
              <DecisionFlow steps={oneClickTrust} />
            </VisualFrame>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="operational-eyebrow">Enterprise Trust Fabric™</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">One internal architecture across human and machine activity.</h2>
        <ArchitectureBlock
          inputs={["Humans", "AI Agents", "Machine Identities", "Regulated Workflows"]}
          core="Enterprise Trust Fabric™"
          outputs={["Decision", "Replay", "Evidence Pack", "Governance"]}
        />
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
          <p className="operational-eyebrow">Customer Outcomes</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Start where uncertainty creates operational cost.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {customerOutcomes.map(([title, copy]) => (
              <article key={title} className="operational-card p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
          <Link href="/solutions" className="mt-6 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Explore customer outcomes →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="operational-eyebrow">Why Different</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Identity grants access. Operational trust governs what happens next.</h2>
        <div className="mt-8 grid gap-6">
          <ComparisonCard
            left={{ title: "Traditional Identity", items: ["Identity", "Authentication", "MFA", "Access"] }}
            right={{ title: "Operational Trust", items: ["Authority", "Runtime evidence", "Policy", "Decision", "Replay", "Trust Memory™"] }}
          />
          <VisualFrame eyebrow="Trust Memory™ Timeline" title="Trust changes without losing its history.">
            <Timeline events={memoryTimeline} ariaLabel="Trust Memory timeline" />
          </VisualFrame>
        </div>
        <Link href="/trust" className="mt-6 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Inspect trust evidence and limitations →</Link>
      </section>

      <section className="border-t border-zinc-800 bg-black px-6 py-16 text-center md:px-8 md:py-24">
        <p className="operational-eyebrow">Enterprise Pilot</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold text-white md:text-4xl">Choose one consequential workflow. Make every trust decision explainable.</h2>
        <Link href="/enterprise-access?intent=demo" className="mt-7 inline-flex brand-primary-action brand-action-large">Request Demo</Link>
      </section>
    </main>
  );
}
