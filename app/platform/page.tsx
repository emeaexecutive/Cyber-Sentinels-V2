import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureBlock, DecisionFlow, VisualFrame } from "@/components/enterprise-visuals";
import { ExecutiveSummary } from "@/components/executive-summary";
import { StructuredData } from "@/components/search/structured-data";
import { softwareGraph, publicSocialMetadata } from "@/lib/search/metadata";

const platformCapabilities = [
  ["trust-engine", "Trust Engine", "Considers identity, evidence, posture and policy boundaries."],
  ["decision-intelligence", "Decision Intelligence", "Explains allow, review, deny and next-step outcomes."],
  ["runtime-engine", "Runtime", "Accounts for material context changes while work is in progress."],
  ["authorization-gateway", "Authorization", "Considers purpose, scope and delegated authority before action."],
  ["enforcement", "Operational controls", "Connects a governed decision to a qualified control boundary."],
  ["provider-orchestrator", "Provider evidence", "Keeps evidence sources distinct when information is brought together."],
  ["validation-engine", "Validation", "Makes review, evidence limits and qualification status explicit."],
  ["enterprise-apis", "Integrations", "Provides documented ways to connect existing workflows."],
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

const platformTitle = "AI Agent Authority | Cyber Sentinels";
const platformDescription =
  "Cyber Sentinels helps organisations determine whether AI agents are authorised to act under current policy and preserve evidence of the decision.";

export default function PlatformPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <StructuredData value={softwareGraph} />
        <ExecutiveSummary
          eyebrow="Platform"
          title="Authority for AI agents, checked against current policy."
          bullets={["Determine whether an AI agent is authorised to act.", "Apply ALLOW, REVIEW or DENY at a connected control boundary.", "Preserve decision evidence for review, including Replay and Trust Memory™."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
        />

        <section id="agent-authority" className="mt-8 scroll-mt-28 operational-panel p-6">
          <h2 className="text-2xl font-semibold">Authority before an AI agent acts</h2>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">Cyber Sentinels helps organisations determine whether AI agents are authorised to act under current policy and preserve evidence of the decision.</p>
          <p className="mt-4 text-xl font-semibold leading-8 text-cyan-100">ALLOW · REVIEW · DENY</p>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">A decision considers the requested action, purpose, target, scope and delegated authority against current policy. Identity identifies who or what is making a request; identity or a previous ALLOW does not create permanent authority.</p>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">At a connected, qualified control boundary, ALLOW may permit the controlled action, REVIEW holds it for the required review, and DENY blocks it. A decision alone is not proof that a downstream system carried out or prevented an action.</p>
          <p className="mt-4 max-w-4xl leading-8 text-zinc-300">Decision evidence supports later examination. Replay helps review recorded decisions, while Trust Memory™ connects relevant evidence over time. Availability and qualification vary by feature; some API and Swarm paths have local test coverage, which does not establish hosted or Production readiness. TENENTE Swarm cancellation and emergency containment remain under qualification and are not Production-qualified.</p>
          <p className="mt-4 leading-8 text-zinc-400">Read the <Link href="/resources/agent-security/agent-authorization" className="text-cyan-200 underline">agent authorization explanation</Link>, the <Link href="/resources/agent-security/mcp-tool-authorization" className="text-cyan-200 underline">tool and target authority model</Link>, <Link href="/verification-replay" className="text-cyan-200 underline">Replay</Link>, and <Link href="/trust#trust-memory" className="text-cyan-200 underline">Trust Memory™</Link>.</p>
        </section>

        <section id="trust-fabric" className="mt-8 scroll-mt-28">
          <div id="execution-trust" className="scroll-mt-28">
            <VisualFrame eyebrow="Decision context" title="Connect authority checks to operational outcomes.">
              <ArchitectureBlock
                inputs={["Current Policy", "Delegated Authority", "Requested Action", "Evidence"]}
                core="ALLOW · REVIEW · DENY"
                outputs={["Operational Controls", "Decision Evidence", "Replay", "Trust Memory™"]}
              />
            </VisualFrame>
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Platform model</p>
          <h2 className="mt-3 text-2xl font-semibold">Capabilities are qualified individually.</h2>
          <p className="mt-3 max-w-4xl leading-7 text-zinc-400">The following areas describe the platform model, not a claim that every route, provider or runtime integration is available in every hosted environment.</p>
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
          <VisualFrame eyebrow="Integration model" title="Bring policy and authority into existing workflows.">
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
  ...publicSocialMetadata(platformTitle, platformDescription, "/platform"),
  title: platformTitle,
  description: platformDescription,
  alternates: { canonical: "/platform" },
};
