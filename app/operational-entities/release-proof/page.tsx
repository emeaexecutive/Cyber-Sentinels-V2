import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OperationalEntityGovernanceSummary } from "@/components/operational-entity-governance-summary";
import { buildReleaseProofCases } from "./release-proof-cases";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operational Entity release proof", robots: { index: false, follow: false } };

const frame = "rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6 lg:p-8";

export default function OperationalEntityReleaseProofPage() {
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview") notFound();
  const cases = buildReleaseProofCases();
  const releaseHead = process.env.VERCEL_GIT_COMMIT_SHA ?? "local-working-tree";
  const sharedLinks = { evidenceHref: "#evidence-graph", lineageHref: "#authority-lineage", replayHref: "#replay", transactionHref: "#immutable-transaction" };

  return <main className="min-h-screen bg-white px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Synthetic release proof · Preview/development only</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Operational Entity capability and authority-conflict UX</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">Every state below is computed by the released capability-governance and inter-agent-conflict evaluators from attributed evidence fixtures. No decision result is hard-coded, and no customer or Production data is used.</p>
        <p className="mt-3 break-all font-mono text-xs text-slate-500" data-testid="proof-release-head">Release head: {releaseHead}</p>
      </header>

      <section id="model-current" className={frame} data-testid="proof-model-current">
        <OperationalEntityGovernanceSummary idPrefix="model-current" entityName={cases.beta.displayReference} identityStatus="VERIFIED" authorityStatus="ACTIVE" canonicalDecision={cases.currentCapability.decision} capabilityGovernance={cases.currentCapability.snapshot} {...sharedLinks} />
      </section>

      <section id="model-hosted-missing" className={frame} data-testid="proof-model-hosted-missing">
        <OperationalEntityGovernanceSummary idPrefix="model-hosted-missing" entityName="Agent Beta · Recognized hosted model without current capability evidence" identityStatus="VERIFIED" authorityStatus="ACTIVE" canonicalDecision={cases.hostedMissingCapability.decision} capabilityGovernance={cases.hostedMissingCapability.snapshot} {...sharedLinks} />
      </section>

      <section id="model-reauthorization" className={frame} data-testid="proof-model-reauthorization">
        <OperationalEntityGovernanceSummary idPrefix="model-reauthorization" entityName={cases.beta.displayReference} identityStatus="VERIFIED" authorityStatus="ACTIVE" canonicalDecision={cases.reauthorizationCapability.decision} capabilityGovernance={cases.reauthorizationCapability.snapshot} {...sharedLinks} />
      </section>

      <section id="agents-compatible" className={frame} data-testid="proof-agents-compatible">
        <OperationalEntityGovernanceSummary idPrefix="agents-compatible" entityName="Agent Beta and Agent Gamma compatible read" identityStatus="VERIFIED" authorityStatus="ACTIVE" canonicalDecision={cases.compatibleConflict.decision} interAgentConflict={cases.compatibleConflict.snapshot} sourceAgentName="Beta" targetAgentName="Gamma" {...sharedLinks} />
      </section>

      <section id="agents-review" className={frame} data-testid="proof-agents-review">
        <OperationalEntityGovernanceSummary idPrefix="agents-review" entityName="Agent Beta and Agent Gamma protected mutation" identityStatus="VERIFIED" authorityStatus="ACTIVE" canonicalDecision={cases.reviewConflict.decision} interAgentConflict={cases.reviewConflict.snapshot} sourceAgentName="Beta" targetAgentName="Gamma" {...sharedLinks} />
      </section>

      <section id="agents-deny" className={frame} data-testid="proof-agents-deny">
        <OperationalEntityGovernanceSummary idPrefix="agents-deny" entityName="Agent Beta and Agent Gamma policy-constrained mutation" identityStatus="VERIFIED" authorityStatus="ACTIVE" canonicalDecision={cases.denyConflict.decision} interAgentConflict={cases.denyConflict.snapshot} sourceAgentName="Beta" targetAgentName="Gamma" {...sharedLinks} />
      </section>

      <section id="agents-unknown" className={frame} data-testid="proof-agents-unknown">
        <OperationalEntityGovernanceSummary idPrefix="agents-unknown" entityName="Agent relationship with insufficient evidence" identityStatus="VERIFIED" authorityStatus="ACTIVE" canonicalDecision={cases.unknownConflict.decision} interAgentConflict={cases.unknownConflict.snapshot} sourceAgentName="Beta" targetAgentName="Gamma" {...sharedLinks} />
      </section>

      <section id="authority-lineage" className={frame} data-testid="proof-authority-lineage">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Authority Lineage</p>
        <h2 className="mt-2 text-2xl font-semibold">Alpha → delegated authority → Beta; Gamma independently authorized</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Agent Alpha</h3><p className="mt-2 break-words text-sm text-slate-600">{cases.alpha.currentAuthorityReferences[0]}</p></article>
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Agent Beta</h3><p className="mt-2 text-sm text-slate-600">Delegated, attenuated authority for the protected workflow.</p></article>
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Agent Gamma</h3><p className="mt-2 text-sm text-slate-600">Separately verified authority affecting the same protected resource.</p></article>
        </div>
      </section>

      <section id="evidence-graph" className={frame} data-testid="proof-evidence-lineage">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Evidence linkage</p>
        <h2 className="mt-2 text-2xl font-semibold">Evidence and immutable decision references</h2>
        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
          <div className="min-w-0"><dt className="text-slate-500">Relationship evidence</dt><dd className="mt-1 break-words font-mono text-xs">{cases.reviewConflict.evidenceReferences.join(", ")}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Authority intersection digest</dt><dd className="mt-1 break-all font-mono text-xs">{cases.reviewConflict.snapshot.digest}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Beta authority</dt><dd className="mt-1 break-words">{cases.reviewConflict.snapshot.sourceAuthorityReference}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Gamma authority</dt><dd className="mt-1 break-words">{cases.reviewConflict.snapshot.targetAuthorityReference}</dd></div>
        </dl>
      </section>

      <section id="replay" className={frame} data-testid="proof-replay">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Replay</p>
        <h2 className="mt-2 text-2xl font-semibold">Chronological conflict evidence</h2>
        <ol className="mt-5 space-y-3">{cases.replay.map((event) => <li className="min-w-0 rounded-xl border border-slate-200 bg-white p-4" key={event.eventId}><p className="break-words text-sm font-semibold">{event.eventType.replaceAll("_", " ")}</p><p className="mt-1 break-all font-mono text-xs text-slate-500">{event.occurredAt} · {event.eventId}</p></li>)}</ol>
      </section>

      <section id="trust-memory" className={frame} data-testid="proof-trust-memory">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Trust Memory</p>
        <h2 className="mt-2 text-2xl font-semibold">Material conflict event retained once</h2>
        {cases.trustMemory.map((event) => <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2" key={event.eventId}><div><dt className="text-slate-500">Material event</dt><dd className="mt-1 break-words font-semibold">{event.eventType.replaceAll("_", " ")}</dd></div><div><dt className="text-slate-500">Deduplicated event reference</dt><dd className="mt-1 break-all font-mono text-xs">{event.eventId}</dd></div></dl>)}
      </section>

      <section id="immutable-transaction" className={frame} data-testid="proof-immutable-transaction">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Canonical trust transaction</p>
        <h2 className="mt-2 text-2xl font-semibold">Immutable REVIEW decision</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">The existing canonical evaluator bound the authority-conflict snapshot to this synthetic decision record. The Preview route does not persist customer data.</p>
        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2"><div><dt className="text-slate-500">Transaction</dt><dd className="mt-1 break-all font-mono text-xs">{cases.canonicalTransaction.transactionId}</dd></div><div><dt className="text-slate-500">Decision</dt><dd className="mt-1 font-semibold">{cases.canonicalTransaction.decision}</dd></div><div><dt className="text-slate-500">Record digest</dt><dd className="mt-1 break-all font-mono text-xs">{cases.canonicalTransaction.digest}</dd></div><div><dt className="text-slate-500">Conflict snapshot digest</dt><dd className="mt-1 break-all font-mono text-xs">{cases.canonicalTransaction.decisionTimeSnapshot.interAgentAuthorityConflict?.digest}</dd></div></dl>
      </section>
    </div>
  </main>;
}
