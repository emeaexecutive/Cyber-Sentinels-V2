import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOperationalEntityDetail } from "@/lib/operational-entities/server";
import { projectOperationalEntityIntelligence } from "@/lib/operational-entities/intelligence";
import { NativeEntityVerificationPanel } from "@/components/native-entity-verification-panel";

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
  const latestNativeVerification = detail.nativeVerification.verifications[0];
  const activeNativeCredential = detail.nativeVerification.credentials.find((credential) => credential.state === "ACTIVE");
  const activeManifest = detail.nativeVerification.manifests.find((manifest) => manifest.status === "ACTIVE");
  const currentOwnerBinding = detail.nativeVerification.ownerBindings[0];
  const nativeEvidence = detail.nativeVerification.evidence[0];
  const nativeDemoEnabled = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
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

      <section id="native-verification" className={panel}>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Cyber Sentinels native evidence generation</p><h2 className="mt-2 text-xl font-semibold">Native Verification</h2></div>
          <span className="w-fit rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold">{value(latestNativeVerification?.status ?? "NOT YET VERIFIED")}</span>
        </div>
        <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
          {([
            ["Last Verified", latestNativeVerification?.verified_at],
            ["Expires", latestNativeVerification?.expires_at],
            ["Signing Credential", activeNativeCredential?.signing_key_id],
            ["Credential Fingerprint", activeNativeCredential?.credential_fingerprint],
            ["Manifest Version", activeManifest?.manifest_version],
            ["Manifest Digest", activeManifest?.manifest_digest],
            ["Owner Binding", currentOwnerBinding?.state],
            ["Runtime Binding", latestNativeVerification?.runtime_binding],
            ["Software Provenance", latestNativeVerification?.software_provenance],
            ["Continuity", latestNativeVerification?.continuity_result],
            ["Changed Attributes", latestNativeVerification?.changed_attributes],
            ["Evidence Provenance", nativeEvidence?.provenance],
          ] as Array<[string, unknown]>).map(([label, item]) => <div key={label}><dt className="font-medium text-slate-900">{label}</dt><dd className="mt-1 break-all text-slate-600">{value(item)}</dd></div>)}
        </dl>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Verified Claims</h3><p className="mt-2 text-sm text-slate-600">{value(latestNativeVerification?.verified_claims)}</p></article>
          <article className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Unverified Claims</h3><p className="mt-2 text-sm text-slate-600">{value(latestNativeVerification?.unverified_claims)}</p></article>
          <article className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Conflicts</h3><p className="mt-2 text-sm text-slate-600">{value(latestNativeVerification?.conflicting_claims)}</p></article>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm"><p className="font-semibold">Evidence and reason codes</p><p className="mt-2 break-all text-slate-600">Evidence: {value(latestNativeVerification?.evidence_references)} · Reasons: {value(latestNativeVerification?.reason_codes)}</p><p className="mt-2 text-slate-500">A valid native identity proof establishes possession of the manifest-bound key. It does not by itself establish authority, safety, or independent corroboration.</p></div>
        {nativeDemoEnabled ? <NativeEntityVerificationPanel
          enterpriseId={detail.entity.enterpriseId}
          operationalEntityId={detail.entity.entityId}
          canonicalTrustObjectId={detail.entity.canonicalTrustObjectId}
          displayName={detail.entity.displayReference}
          entityType={detail.entity.entityType}
          accountableOwnerId={detail.entity.accountableOwnerId}
          organizationId={detail.entity.organizationReference}
          authorityReference={detail.entity.currentAuthorityReferences[0] ?? null}
          environmentReference={detail.entity.environmentReferences[0] ?? null}
          activeCredentialId={activeNativeCredential ? String(activeNativeCredential.credential_id) : null}
        /> : null}
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
