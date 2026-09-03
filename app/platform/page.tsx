import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureBlock, DecisionFlow, VisualFrame } from "@/components/enterprise-visuals";
import { ExecutiveSummary } from "@/components/executive-summary";

const platformCapabilities = [
  ["trust-engine", "Trust Engine", "Evaluates identity, evidence, posture and policy boundaries."],
  ["decision-intelligence", "Decision Intelligence", "Explains allow, review, block and next-action outcomes."],
  ["runtime-engine", "Runtime", "Observes material context change while work is in progress."],
  ["authorization-gateway", "Authorization", "Confirms purpose, scope and delegated authority before execution."],
  ["enforcement", "Enforcement", "Applies the governed decision outside the actor runtime."],
  ["provider-orchestrator", "Provider Orchestrator", "Normalizes provider evidence without collapsing source boundaries."],
  ["validation-engine", "Validation", "Keeps reviewed evidence, calibration and limitations explicit."],
  ["enterprise-apis", "Enterprise APIs", "Expose one provider-neutral contract to existing workflows."],
];

const requestFlow = [
  { label: "Entity" },
  { label: "Workflow" },
  { label: "Action" },
  { label: "Signals" },
  { label: "Policy" },
  { label: "Authority" },
  { label: "Decision" },
];

export default function PlatformPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Platform"
          title="One provider-neutral control plane for operational trust decisions."
          bullets={["Evaluate evidence and authority before consequential execution.", "Observe material change during runtime.", "Apply policy and enforcement outside the actor runtime.", "Integrate through one stable enterprise contract."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
        />

        <section id="trust-fabric" className="mt-8 scroll-mt-28">
          <VisualFrame eyebrow="Enterprise Trust Fabric™" title="One architecture. Eight connected mechanisms.">
            <ArchitectureBlock
              inputs={["Entity Context", "Signals", "Policy", "Authority"]}
              core="Trust Engine + Decision Intelligence"
              outputs={["Runtime", "Enforcement", "Provider Orchestrator", "Validation", "Enterprise APIs"]}
            />
          </VisualFrame>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Platform mechanisms</p>
          <h2 className="mt-3 text-2xl font-semibold">Each mechanism has one operational responsibility.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {platformCapabilities.map(([id, title, copy], index) => (
              <article id={id} key={id} className="scroll-mt-28 operational-card p-5">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <VisualFrame eyebrow="Internal orchestration contract" title="Everything requests trust through one API.">
            <DecisionFlow steps={requestFlow} />
          </VisualFrame>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/developers" className="brand-secondary-action">Developers</Link>
            <Link href="/documents/operational-trust-whitepaper" className="brand-secondary-action">Technical whitepaper</Link>
            <Link href="/enterprise/pilot" className="brand-primary-action">Start Pilot</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Platform | Cyber Sentinels",
  description: "Trust Engine, Decision Intelligence, Runtime, Authorization, Enforcement, provider orchestration, validation and enterprise APIs.",
  alternates: { canonical: "/platform" },
};
