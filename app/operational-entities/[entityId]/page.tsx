import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOperationalEntityDetail } from "@/lib/operational-entities/server";
import { projectOperationalEntityIntelligence } from "@/lib/operational-entities/intelligence";

export const dynamic = "force-dynamic";

const panel = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
const value = (input: unknown) => {
  if (input === null || input === undefined || input === "") return "Unknown";
  if (Array.isArray(input)) return input.length ? input.join(", ") : "None recorded";
  if (typeof input === "object") return JSON.stringify(input);
  return String(input);
};

export default async function OperationalEntityDetailPage({ params }: { params: Promise<{ entityId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const entityId = decodeURIComponent((await params).entityId);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/operational-entities/${entityId}`)}`);
  const detail = await loadOperationalEntityDetail({ supabase, user, entityId });
  if (!detail) notFound();
  const intelligence = projectOperationalEntityIntelligence(detail);

  const latestTransaction = detail.transactions.at(-1);
  const responsibility = (latestTransaction?.responsibility_lineage ?? {}) as Record<string, unknown>;
  const latestTransition = detail.providerTransitions.at(-1);
  const latestEnforcement = detail.enforcementEvents.at(-1);
  const responsibilityItems: Array<[string, unknown]> = [
    ["Control Owner", responsibility.controlOwner ?? detail.entity.accountableOwnerId],
    ["Control Operator", responsibility.controlOperator],
    ["Technology Provider", responsibility.technologyProvider],
    ["Runtime Provider", responsibility.runtimeProvider],
    ["Evidence Provider", responsibility.evidenceProvider],
    ["Authority", latestTransaction?.authority_reference ?? detail.entity.currentAuthorityReferences],
  ];
  const intelligenceItems: Array<[string, unknown]> = [
    ["Trust Health", intelligence.health.overallState],
    ["Trust Drift", intelligence.drift.state],
    ["Trust Confidence", intelligence.confidence.level],
    ["Trust Stability", intelligence.stability.state],
    ["Trust Prediction", intelligence.prediction.prediction],
    ["Trust Recommendation", intelligence.recommendation.recommendation],
    ["Trust Recovery", intelligence.recovery?.state ?? "NOT_REQUIRED_OR_NOT_RECORDED"],
  ];

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-6 py-16 text-slate-900">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Operational Entity · Persisted tenant data</p>
        <h1 className="mt-2 text-3xl font-semibold">{detail.entity.displayReference}</h1>
        <p className="mt-3 max-w-3xl break-all font-mono text-xs text-slate-500">{detail.entity.entityId}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Lifecycle", detail.entity.lifecycleState], ["Trust state", detail.entity.currentTrustState], ["Evidence state", detail.entity.currentEvidenceState], ["Consequence", detail.entity.currentConsequenceClassification]].map(([label, item]) => <article key={label} className={panel}><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-3 break-words text-lg font-semibold">{value(item)}</p></article>)}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {intelligenceItems.map(([label, item]) => <article key={label} className={panel}><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-3 break-words text-lg font-semibold">{value(item)}</p></article>)}
      </section>

      <section className={panel}>
        <h2 className="text-xl font-semibold">Trust Narrative</h2>
        <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">{intelligence.narrative.map((sentence) => <article key={sentence.text}><p>{sentence.text}</p><p className="mt-1 break-all font-mono text-xs text-slate-500">Evidence: {sentence.evidenceReferences.join(", ")}</p></article>)}</div>
        <h3 className="mt-5 font-semibold">WHY?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{intelligence.health.reasonCodes.join(", ") || "INSUFFICIENT_EVIDENCE"}. Unknown or absent records remain explicitly unknown and are not inferred.</p>
      </section>

      <section id="external-identities" className={panel}>
        <h2 className="text-xl font-semibold">External Identities</h2>
        <div className="mt-4 space-y-3">{detail.externalIdentities.map((identity) => <article key={identity.referenceId} className="rounded-xl border border-slate-200 p-4 text-sm"><p className="font-semibold">{identity.provider} · {identity.providerEntityId}</p><p className="mt-1 break-all text-slate-600">Lifecycle: {identity.providerNativeLifecycle} · Owner: {value(identity.providerOwner)} · Evidence: {identity.evidenceDigest}</p></article>)}</div>
        {!detail.externalIdentities.length ? <p className="mt-3 text-sm text-slate-500">No external identity evidence recorded.</p> : null}
      </section>

      <section className={panel}>
        <h2 className="text-xl font-semibold">Accountability and provider responsibility</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
          {responsibilityItems.map(([label, item]) => <div key={label}><dt className="font-medium text-slate-900">{label}</dt><dd className="mt-1 break-all text-slate-600">{value(item)}</dd></div>)}
        </dl>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className={panel}><h2 className="text-xl font-semibold">Decision</h2><dl className="mt-4 space-y-3 text-sm"><div><dt>Outcome</dt><dd className="font-semibold">{value(latestTransaction?.decision)}</dd></div><div><dt>Policy version</dt><dd>{value(latestTransaction?.policy_version)}</dd></div><div><dt>Evidence Independence</dt><dd>{value(latestTransaction?.evidence_independence)}</dd></div><div><dt>Conclusion confidence</dt><dd>{intelligence.confidence.level}</dd></div><div><dt>Reason codes</dt><dd>{value(latestTransaction?.reason_codes)}</dd></div><div><dt>Decision digest</dt><dd className="break-all font-mono text-xs">{value((latestTransaction?.decision_time_snapshot as Record<string, unknown> | undefined)?.decisionDigest)}</dd></div></dl></article>
        <article className={panel}><h2 className="text-xl font-semibold">Enforcement and Outcome</h2><dl className="mt-4 space-y-3 text-sm"><div><dt>Latest stage</dt><dd>{value(latestEnforcement?.enforcement_stage)}</dd></div><div><dt>Attribution</dt><dd>{value(latestEnforcement?.attribution)}</dd></div><div><dt>Claim state</dt><dd>{value(latestEnforcement?.claim_state)}</dd></div><div><dt>Source classification</dt><dd>{value(latestEnforcement?.source_classification)}</dd></div></dl></article>
      </section>

      <section className={panel}>
        <h2 className="text-xl font-semibold">Provider History</h2>
        <div className="mt-4 space-y-3">{detail.providerRelationships.map((relationship) => <article key={String(relationship.relationship_id)} className="rounded-xl border border-slate-200 p-4 text-sm"><p className="font-semibold">{value(relationship.provider_id)} · {value(relationship.role)}</p><p className="mt-1 break-all text-slate-600">Status: {value(relationship.status)} · Native reference: {value(relationship.native_reference)} · Organization: {value(relationship.organization_reference)}</p></article>)}</div>
        <p className="mt-4 text-sm text-slate-600">Continuity: {value(latestTransition?.continuity_result)} · Migration Gap: {value(latestTransition?.migration_gaps)}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className={panel}><h2 className="text-xl font-semibold">Replay</h2><p className="mt-3 text-sm text-slate-600">{detail.replay.length} tenant-scoped session(s).</p>{detail.replay.map((event) => <p key={String(event.id)} className="mt-3 break-all font-mono text-xs">{value(event.id)} · {value(event.canonical_transaction_id)}</p>)}</article>
        <article className={panel}><h2 className="text-xl font-semibold">Trust Memory</h2><p className="mt-3 text-sm text-slate-600">{detail.trustMemory.length} material record(s).</p>{detail.trustMemory.map((memory) => <p key={String(memory.memory_id)} className="mt-3 break-all font-mono text-xs">{value(memory.memory_type)} · {value(memory.source_id)}</p>)}</article>
      </section>

      <Link href="/operational-entities" className="inline-flex font-semibold underline">Back to Operational Entities</Link>
    </main>
  );
}
