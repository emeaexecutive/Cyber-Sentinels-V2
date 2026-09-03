import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureBlock, TrustFlow, VisualFrame } from "@/components/enterprise-visuals";
import { ExecutiveSummary } from "@/components/executive-summary";

const lifecycle = [
  { label: "Register", detail: "Create the operational entity without claiming verification." },
  { label: "Prove identity", detail: "Verify possession of an Ed25519 credential." },
  { label: "Grant authority", detail: "Bind action, target, purpose, environment, version and expiry." },
  { label: "Evaluate", detail: "Request a current ALLOW, REVIEW or DENY decision." },
  { label: "Preserve", detail: "Link evidence, receipt, Replay and outcome lineage." },
];

export default function DocumentsPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Documents"
          title="Documents & Technical Resources"
          bullets={[
            "Technical documentation, product architecture, operational trust research and enterprise evidence.",
            "See what is working, partial and roadmap without capability inflation.",
            "Trace the API lifecycle from identity proof to Receipt and Replay.",
          ]}
          primary={{ href: "/documents/operational-trust-whitepaper", label: "Read the whitepaper" }}
          secondary={{ href: "/documents/cyber-sentinels-operational-trust-whitepaper-v1.pdf", label: "Download Cyber Sentinels whitepaper PDF" }}
        />

        <section className="mt-10 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <article className="operational-panel flex min-w-0 h-full flex-col p-6 md:p-8">
            <p className="operational-eyebrow">Technical whitepaper · V1.0</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Cyber Sentinels: Operational Trust Infrastructure for Autonomous Systems</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              The definitive account of the V1 API, agent identity proof, bounded authority, consequence-time authorization, Evidence Graph, receipts, Replay, Trust Memory, provider boundaries and current product reality.
            </p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-black p-4"><dt className="text-zinc-500">Edition</dt><dd className="mt-1 font-semibold text-zinc-100">September 2026</dd></div>
              <div className="rounded-lg border border-zinc-800 bg-black p-4"><dt className="text-zinc-500">Contract</dt><dd className="mt-1 font-semibold text-zinc-100">OpenAPI 3.1</dd></div>
              <div className="rounded-lg border border-zinc-800 bg-black p-4"><dt className="text-zinc-500">Format</dt><dd className="mt-1 font-semibold text-zinc-100">HTML · PDF</dd></div>
            </dl>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className="brand-primary-action min-h-11 justify-center" href="/documents/operational-trust-whitepaper">Read</Link>
              <a className="brand-secondary-action min-h-11 justify-center" href="/documents/cyber-sentinels-operational-trust-whitepaper-v1.pdf" download>Download Cyber Sentinels whitepaper PDF</a>
            </div>
          </article>

          <ArchitectureBlock
            inputs={["Verified agent", "Bounded authority", "Current evidence"]}
            core="Cyber Sentinels"
            outputs={["ALLOW / REVIEW / DENY", "Receipt", "Replay"]}
          />
        </section>

        <section className="mt-10">
          <VisualFrame eyebrow="Inside the paper" title="One lifecycle, explicit trust boundaries." caption="Conceptual flow. The paper distinguishes authorization from downstream execution and outcome proof.">
            <TrustFlow steps={lifecycle} ariaLabel="Whitepaper operational trust lifecycle" />
          </VisualFrame>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Cyber Sentinels Operational Trust Whitepaper",
  description: "Technical overview of Cyber Sentinels' operational trust control layer for AI agents, identity, delegated authority, policy decisions, evidence, receipts and Replay.",
  alternates: { canonical: "/documents" },
};
