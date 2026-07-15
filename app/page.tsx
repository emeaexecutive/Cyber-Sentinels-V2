import type { Metadata } from "next";
import Link from "next/link";
import {
  ArchitectureBlock,
  ComparisonCard,
  DecisionFlow,
  LifecycleDiagram,
  Timeline,
  TrustFlow,
  VisualFrame,
} from "@/components/enterprise-visuals";

export const metadata: Metadata = {
  title: "Operational Trust Control Plane | Cyber Sentinels",
  description: "Continuously verify identity, authority, change and governance across human and machine activity.",
  alternates: { canonical: "/" },
};

const lifecycle = [
  { label: "Identity", detail: "Verify" },
  { label: "Authority", detail: "Authorize" },
  { label: "Action", detail: "Execute" },
  { label: "Enforcement", detail: "Enforce" },
  { label: "Evidence", detail: "Prove" },
  { label: "Replay", detail: "Replay" },
  { label: "Trust Memory™", detail: "Remember" },
  { label: "Continuous Trust", detail: "Re-evaluate" },
];

const oneClickTrust = [
  { label: "Click Verify" },
  { label: "Parallel Evidence Collection" },
  { label: "Authority" },
  { label: "Trust Decision" },
  { label: "Replay" },
  { label: "Trust Memory™" },
  { label: "Enterprise Outcome" },
];

const trustGraph = [
  { label: "Identity" },
  { label: "Authority" },
  { label: "Context" },
  { label: "Action" },
  { label: "Evidence" },
  { label: "Replay" },
  { label: "Trust Memory™" },
  { label: "Continuous Trust" },
];

const memoryTimeline = [
  { label: "High Trust" },
  { label: "Risk Detected" },
  { label: "Authority Updated" },
  { label: "Replay" },
  { label: "Review" },
  { label: "Trust Restored" },
  { label: "Current Trust" },
];

const representativeSolutions = [
  ["AI Operations", "Keep delegated agent actions within purpose and scope."],
  ["Financial Approval", "Connect authority, evidence and review to high-value decisions."],
  ["Critical Infrastructure", "Preserve accountable control across consequential operations."],
  ["Hiring", "Reduce synthetic and proxy risk in one governed workflow."],
];

export default function Home() {
  return (
    <main className="operational-shell min-h-screen text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
        <p className="operational-eyebrow">Enterprise operational trust</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight text-white md:text-6xl">
          The operational trust control plane for humans, AI agents, machine identities and regulated workflows.
        </h1>
        <p className="mt-6 max-w-4xl text-lg leading-8 text-zinc-300 md:text-xl">
          Continuously verify who or what acted, under whose authority, what changed, and why each action was allowed, reviewed or blocked.
        </p>
        <div className="mt-8">
          <Link href="/enterprise-access?intent=demo" className="brand-primary-action brand-action-large">Request Demo</Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
          <p className="operational-eyebrow">The problem</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Identity opens the door. Operational trust governs what happens next.</h2>
          <div className="mt-8">
            <ComparisonCard
              left={{ title: "Traditional Identity", items: ["Identity", "Authentication", "MFA", "Access"] }}
              right={{ title: "Cyber Sentinels", items: ["Identity", "Authority", "Runtime Control", "Policy", "Evidence", "Replay", "Trust Memory™", "Continuous Trust", "AI Agents", "Machine Identities", "Regulated Workflows"] }}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="operational-eyebrow">Operational Trust Lifecycle</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Trust is evaluated through the full action lifecycle.</h2>
        <div className="mt-8">
          <LifecycleDiagram steps={lifecycle} />
        </div>
        <div className="mt-6">
          <VisualFrame eyebrow="One Click Trust" title="One action. Multiple evidence sources. One explainable decision.">
            <DecisionFlow steps={oneClickTrust} />
          </VisualFrame>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Enterprise Trust Fabric™</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">One control layer across human and machine activity.</h2>
          <ArchitectureBlock
            inputs={["Humans", "AI Agents", "Machine Identities", "Workflows"]}
            core="Enterprise Trust Fabric™"
            outputs={["Decision", "Replay", "Evidence", "Governance"]}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <p className="operational-eyebrow">Representative solutions</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Start where uncertainty carries operational cost.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {representativeSolutions.map(([title, copy]) => (
            <article key={title} className="operational-card p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </div>
        <Link href="/solutions" className="mt-6 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Explore workflow outcomes →</Link>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
          <p className="operational-eyebrow">Trust differentiation</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Operational trust stays connected over time.</h2>
          <div className="mt-8 grid gap-6">
            <VisualFrame eyebrow="Trust Memory™" title="Trust evolves.">
              <Timeline events={memoryTimeline} ariaLabel="Trust Memory timeline" />
            </VisualFrame>
            <VisualFrame eyebrow="Operational Trust Graph™" title="From identity to continuous trust.">
              <TrustFlow steps={trustGraph} ariaLabel="Operational Trust Graph" compact />
            </VisualFrame>
          </div>
          <div className="mt-6 grid gap-3 text-sm leading-6 text-zinc-300 md:grid-cols-2">
            <p className="border-l border-cyan-900 pl-4">Evidence Graph stores relationships.</p>
            <p className="border-l border-cyan-900 pl-4">Operational Trust Graph™ connects operational trust over time.</p>
          </div>
          <Link href="/trust" className="mt-6 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Explore the Trust Center →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:px-8 md:py-24">
        <p className="operational-eyebrow">See the full decision</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold text-white md:text-4xl">Choose one consequential workflow. Make every trust decision explainable.</h2>
        <Link href="/enterprise-access?intent=demo" className="mt-7 inline-flex brand-primary-action brand-action-large">Request Demo</Link>
      </section>
    </main>
  );
}
