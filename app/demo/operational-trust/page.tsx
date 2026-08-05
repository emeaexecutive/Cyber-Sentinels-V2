import Link from "next/link";
import { buildEnterpriseTrustLearningDemo } from "@/src/lib/trust-learning/demo";

const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-5";

export default async function OperationalTrustDemoPage() {
  const demo = await buildEnterpriseTrustLearningDemo();
  return (
    <main className="min-h-screen bg-[#05080d] px-5 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="rounded-3xl border border-cyan-300/15 bg-white/[0.035] p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Synthetic controlled demonstrator</p>
          <h1 className="mt-3 text-4xl font-semibold">Enterprise Trust Learning™</h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-300">Recurring provider, evidence and review patterns are derived from canonical references. The model adapter is not configured, so the narrative uses deterministic evidence-cited fallback text.</p>
          <div className="mt-5 flex flex-wrap gap-2">{demo.limitations.map((item) => <span className="rounded-full border border-amber-300/20 px-3 py-1 text-xs text-amber-100" key={item}>{item}</span>)}</div>
        </header>
        <section className="grid gap-5 lg:grid-cols-3">
          {demo.patterns.map((pattern) => <article className={card} key={pattern.patternId}><p className="text-xs uppercase text-cyan-300">Derived pattern</p><h2 className="mt-2 font-semibold">{pattern.patternType.replaceAll("_", " ")}</h2><p className="mt-3 text-sm text-zinc-400">{pattern.supportingEventCount} events · {pattern.evidenceStrength} evidence</p><p className="mt-3 text-xs text-zinc-500">{pattern.evidenceReferences.join(" · ")}</p></article>)}
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          <article className={card}><p className="text-xs uppercase text-cyan-300">Deterministic narrative fallback</p>{demo.narrative.statements.map((statement) => <p className="mt-3 text-sm text-zinc-300" key={statement.text}>{statement.text} <span className="text-cyan-300">[{statement.evidenceReferences.join(", ")}]</span></p>)}<p className="mt-4 text-xs text-amber-100">Model status: {demo.narrative.model.status}; rejected unsupported statements: {demo.narrative.rejectedStatements.length}.</p></article>
          <article className={card}><p className="text-xs uppercase text-cyan-300">Policy-bound recommendation</p><h2 className="mt-2 font-semibold">{demo.recommendations[0]?.approvedActionType.replaceAll("_", " ")}</h2><p className="mt-3 text-sm text-zinc-400">{demo.recommendations[0]?.rankingBasis}</p><p className="mt-3 text-xs text-amber-100">Reviewer required · not executable · policy {demo.recommendations[0]?.policyReference}</p></article>
          <article className={card}><p className="text-xs uppercase text-cyan-300">Provider-failure simulation</p><p className="mt-3 text-sm text-zinc-300">Affected workflows: {demo.simulation.affectedWorkflows.join(", ")}</p><p className="mt-2 text-sm text-zinc-400">Changed decisions: {demo.simulation.changedDecisions.map((change) => `${change.from} → ${change.to}`).join(", ")}</p><p className="mt-3 text-xs text-amber-100">Canonical mutations: {demo.simulation.canonicalStateMutationCount}</p></article>
          <article className={card}><p className="text-xs uppercase text-cyan-300">Resilience</p><h2 className="mt-2 font-semibold">{demo.resilience.state.replaceAll("_", " ")}</h2><p className="mt-3 text-sm text-zinc-400">Independent evidence: {demo.resilience.independentEvidenceReferences.length}; authority reconstructable: {String(demo.resilience.authorityReconstructable)}.</p><p className="mt-3 text-xs text-amber-100">No redundancy is inferred where none exists.</p></article>
        </section>
        <section className={card}><h2 className="font-semibold">Human correction and continuity</h2><p className="mt-3 text-sm text-zinc-300">Reviewer label: {demo.feedback.label}. {demo.feedback.correction}</p><p className="mt-2 text-sm text-zinc-400">Automatic retraining: {String(demo.feedback.automaticRetrainingTriggered)} · Replay: {demo.replayReference} · Trust Memory: {demo.trustMemoryReference}</p><p className="mt-2 text-sm text-zinc-400">Enterprise Trust Genome version {demo.genome.version} is tenant-bound, exportable, correctable and has no universal score.</p><p className="mt-2 text-sm text-zinc-400">Historical comparison: {demo.forecast.statement} No causal claim: {String(demo.forecast.noCausalClaim)}.</p></section>
        <Link className="inline-flex rounded-lg border border-cyan-300/30 px-4 py-2 text-sm" href="/trust-centre">Return to Enterprise Trust Centre</Link>
      </div>
    </main>
  );
}
