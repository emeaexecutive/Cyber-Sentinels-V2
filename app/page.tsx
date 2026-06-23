import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

const protections = [
  ["Hiring security", "Primary commercial wedge: synthetic applicants, proxy interviews, stolen identities, AI-assisted interview fraud and enterprise access risk."],
  ["Session integrity", "Keep liveness, deepfake risk, injection risk, identity confidence and channel evidence as separate reviewable signals."],
  ["Governance and audit trails", "Combine evidence, session integrity, governance review and replayable audit trails for enterprise decisions."],
];

const workflow = ["Verify identity", "Review evidence", "Inspect session flags", "Record human action", "Issue receipt and replay"];

const roadmap = [
  "Continuous Trust Posture",
  "AI Agent Authorization Lineage",
  "Proof-of-Human Providers",
  "AI Transparency / Provenance Compliance",
  "Provider Abstraction Layer",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20">
        <div className="flex flex-wrap items-center gap-3"><PrivateBetaBadge /><span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Hiring Security</span></div>
        <div className="mt-14 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">Verification workflows for enterprise teams</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-white md:text-7xl">Protect enterprise hiring workflows against synthetic trust attacks.</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-300">Operational Trust Infrastructure for AI-era workflows. Identity verification is no longer enough; trust must be continuously reviewed across humans, machines and AI agents.</p>
        </div>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/enterprise-access" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">Request Enterprise Access</Link>
          <Link href="/demo" className="rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-white hover:border-zinc-300">View Demo</Link>
          <Link href="/demo/hiring-attack" className="px-2 py-3 text-sm font-semibold text-cyan-200 hover:text-white">Hiring Attack Demo</Link>
        </div>
        <PrivateBetaNotice className="mt-8 max-w-3xl" />
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">Cyber Sentinels combines evidence, session integrity, governance review and replayable audit trails. Liveness, deepfake risk and injection risk remain separate signals, not a single black-box truth claim.</p>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/65">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Why trust became the problem</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white">Identity, presence and action no longer reliably belong to the same person or system.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-300">Synthetic applicants, proxy interviews, stolen identities, AI-assisted interview fraud and injected interview feeds can enter workflows designed for a more verifiable world. Security teams need continuous review, evidence and governance history, not unsupported certainty.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {protections.map(([title, copy]) => <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-7 text-zinc-400">{copy}</p></article>)}
        </div>
        <div className="mt-12 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-3xl font-semibold">A clear operational workflow.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {workflow.map((step, index) => <div key={step} className="border-t border-zinc-700 pt-4"><p className="text-xs text-cyan-200">0{index + 1}</p><p className="mt-2 text-sm font-semibold">{step}</p></div>)}
          </div>
        </div>
        <div className="mt-12 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Controlled Roadmap</p>
              <h2 className="mt-3 text-3xl font-semibold">Staged capabilities, not oversized claims.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">These roadmap items align with current market signals and will remain staged until the existing proof, posture, session and governance surfaces are production-ready.</p>
            </div>
            <Link href="/enterprise/hiring-security" className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-400">Hiring Security Wedge</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {roadmap.map((item) => <div key={item} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm font-semibold text-zinc-200">{item}</div>)}
          </div>
        </div>
      </section>
    </main>
  );
}