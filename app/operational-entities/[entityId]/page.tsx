import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOperationalEntities, loadOperationalEntityDetail } from "@/lib/operational-entities/server";
import { projectOperationalEntityIntelligence } from "@/lib/operational-entities/intelligence";
import { NativeEntityVerificationPanel } from "@/components/native-entity-verification-panel";
import { AlphaBetaProductProof } from "@/components/alpha-beta-product-proof";

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
  const entities = await loadOperationalEntities({ supabase, user });
  const alphaEntity = entities.find((candidate) => candidate.displayReference.trim().toLowerCase() === "agent alpha");
  const betaEntity = entities.find((candidate) => candidate.displayReference.trim().toLowerCase() === "agent beta");
  const betaDetail = detail.entity.displayReference.trim().toLowerCase() === "agent alpha" && betaEntity
    ? await loadOperationalEntityDetail({ supabase, user, entityId: betaEntity.entityId })
    : null;
  const intelligence = projectOperationalEntityIntelligence(detail);
  const normalizedEntityName = detail.entity.displayReference.trim().toLowerCase();
  const isAlpha = normalizedEntityName === "agent alpha";
  const isBeta = normalizedEntityName === "agent beta";

  const latestTransaction = detail.transactions.at(-1);
  const responsibility = (latestTransaction?.responsibility_lineage ?? {}) as Record<string, unknown>;
  const latestTransition = detail.providerTransitions.at(-1);
  const latestEnforcement = detail.enforcementEvents.at(-1);
  const latestNativeRequest = detail.nativeEnforcement.requests.at(-1);
  const latestNativeAcknowledgement = detail.nativeEnforcement.acknowledgements.at(-1);
  const latestExecutionClaim = detail.nativeEnforcement.executionClaims.at(-1);
  const latestRuntimeObservation = detail.nativeEnforcement.runtimeObservations.at(-1);
  const latestDestinationObservation = detail.nativeEnforcement.destinationObservations.at(-1);
  const latestNativeOutcome = detail.nativeEnforcement.outcomes.at(-1);
  const latestNativeVerification = detail.nativeVerification.verifications[0];
  const nativeIdentityLabel = latestNativeVerification?.status === "VERIFIED"
    ? "IDENTITY VERIFIED"
    : latestNativeVerification?.status ?? "NOT YET VERIFIED";
  const activeNativeCredential = detail.nativeVerification.credentials.find((credential) => credential.state === "ACTIVE");
  const activeManifest = detail.nativeVerification.manifests.find((manifest) => manifest.status === "ACTIVE");
  const currentOwnerBinding = detail.nativeVerification.ownerBindings[0];
  const nativeEvidence = detail.nativeVerification.evidence[0];
  const delegatedAuthority = detail.delegatedAuthority.delegated;
  const receivedAuthority = detail.delegatedAuthority.received;
  const latestReceivedAuthority = receivedAuthority[0];
  const latestDelegatedEvaluation = detail.delegatedAuthority.evaluations.find((item) => item.delegation_id === latestReceivedAuthority?.delegation_id);
  const nativeDemoEnabled = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const currentAuthorityId = detail.entity.currentAuthorityReferences[0] ?? (latestReceivedAuthority?.parent_authority_id ? String(latestReceivedAuthority.parent_authority_id) : null);
  const authorityResult = currentAuthorityId
    ? await supabase.from("trust_contracts").select("contract,revocation_state,revoked_at,issued_at,expires_at").eq("enterprise_id", detail.entity.enterpriseId).eq("contract_id", currentAuthorityId).maybeSingle()
    : { data: null, error: null };
  if (authorityResult.error) throw authorityResult.error;
  const parentAuthority = (authorityResult.data?.contract ?? null) as Record<string, unknown> | null;
  const delegationState = (delegation: Record<string, unknown>) =>
    authorityResult.data?.revocation_state === "revoked" && String(delegation.parent_authority_id) === currentAuthorityId
      ? "INVALIDATED (PARENT AUTHORITY REVOKED)"
      : value(delegation.status);
  const graphLabels = new Map(detail.evidenceGraph.nodes.map((node) => [String(node.node_id), `${value(node.node_type)}:${value(node.label ?? node.external_id)}`]));
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
        <nav className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          {alphaEntity ? <Link className="underline" href={`/operational-entities/${encodeURIComponent(alphaEntity.entityId)}`}>Agent Alpha</Link> : null}
          {betaEntity ? <Link className="underline" href={`/operational-entities/${encodeURIComponent(betaEntity.entityId)}`}>Agent Beta</Link> : null}
          <Link className="underline" href="/operational-entities">Product home</Link>
        </nav>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Lifecycle", detail.entity.lifecycleState], ["Trust state", detail.entity.currentTrustState], ["Evidence state", detail.entity.currentEvidenceState], ["Consequence", detail.entity.currentConsequenceClassification]].map(([label, item]) => <article key={label} className={panel}><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-3 break-words text-lg font-semibold">{value(item)}</p></article>)}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {([[
          "Entity type", detail.entity.entityType,
        ], ["Accountable owner", detail.entity.accountableOwnerId], ["Native identity", nativeIdentityLabel], ["Authority", authorityResult.data?.revocation_state ?? "UNKNOWN"], ["Continuity", latestNativeVerification?.continuity_result ?? "NOT YET EVALUATED"]] as Array<[string, unknown]>).map(([label, item]) => <article key={label} className={panel}><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-3 break-all text-sm font-semibold">{value(item)}</p></article>)}
      </section>

      {isAlpha || isBeta ? <section className={panel} aria-label={`${detail.entity.displayReference} product proof`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Alpha / Beta live product proof</p>
        <h2 className="mt-2 text-xl font-semibold">{detail.entity.displayReference}</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
          <div><dt>Identity</dt><dd className="mt-1 font-semibold"><a className="underline" href="#native-verification">{value(nativeIdentityLabel)}</a></dd></div>
          <div><dt>Owner</dt><dd className="mt-1 font-semibold">{isAlpha ? "Alice" : "Bob"} · {detail.entity.accountableOwnerId}</dd></div>
          <div><dt>{isAlpha ? "Authority" : "Authority received"}</dt><dd className="mt-1 font-semibold"><a className="underline" href={isAlpha ? "#parent-authority" : "#authority-received"}>{isAlpha ? value(authorityResult.data?.revocation_state) : value(latestReceivedAuthority?.status)}</a></dd></div>
          <div><dt>{isAlpha ? "Delegated authority" : "Delegated from Alpha"}</dt><dd className="mt-1"><a className="underline" href={isAlpha ? "#delegated-authority" : "#authority-received"}>{isAlpha ? `${delegatedAuthority.length} delegation(s)` : value(latestReceivedAuthority?.delegator_operational_entity_id)}</a></dd></div>
          <div><dt>{isBeta ? "Scope / expiry" : "Current trust state"}</dt><dd className="mt-1">{isBeta ? `${value(latestReceivedAuthority?.permitted_actions)} · ${value(latestReceivedAuthority?.expires_at)}` : detail.entity.currentTrustState}</dd></div>
          <div><dt>{isBeta ? "Current trust state" : "Recent decisions"}</dt><dd className="mt-1"><a className="underline" href="#transactions">{isBeta ? detail.entity.currentTrustState : `${detail.transactions.length} canonical transaction(s)`}</a></dd></div>
          {isBeta ? <div><dt>Recent decisions</dt><dd className="mt-1"><a className="underline" href="#transactions">{detail.transactions.length} canonical transaction(s)</a></dd></div> : null}
        </dl>
      </section> : null}

      <section id="parent-authority" className={panel}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Canonical parent authority</p>
        <h2 className="mt-2 text-xl font-semibold">Alpha authority lineage</h2>
        {parentAuthority ? <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div><dt>Authority ID</dt><dd className="break-all">{value(currentAuthorityId)}</dd></div>
          <div><dt>Issuer</dt><dd>{value(parentAuthority.issuer)}</dd></div>
          <div><dt>Accountable approver</dt><dd>{value(parentAuthority.approver)}</dd></div>
          <div><dt>State</dt><dd>{value(authorityResult.data?.revocation_state)}</dd></div>
          <div><dt>Actions</dt><dd>{value((parentAuthority.authorityScope as Record<string, unknown> | undefined)?.permittedActions ?? parentAuthority.permittedScope)}</dd></div>
          <div><dt>Targets</dt><dd>{value((parentAuthority.authorityScope as Record<string, unknown> | undefined)?.permittedTargets)}</dd></div>
          <div><dt>Tools</dt><dd>{value((parentAuthority.authorityScope as Record<string, unknown> | undefined)?.permittedTools)}</dd></div>
          <div><dt>Environments</dt><dd>{value((parentAuthority.authorityScope as Record<string, unknown> | undefined)?.environments)}</dd></div>
          <div><dt>Delegation</dt><dd>{parentAuthority.canDelegate === true ? `Permitted · depth ${value(parentAuthority.maximumDelegationDepth)}` : "Not permitted"}</dd></div>
          <div><dt>Expiry</dt><dd>{value(parentAuthority.expiresAt)}</dd></div>
          <div><dt>Policy / version</dt><dd>{value(parentAuthority.policyId)} · {value(parentAuthority.policyVersion)}</dd></div>
          <div><dt>Authority version</dt><dd>{value(parentAuthority.authorityVersion)}</dd></div>
        </dl> : <p className="mt-4 text-sm text-slate-600">UNKNOWN — no persisted parent authority is linked to this entity.</p>}
      </section>

      {nativeDemoEnabled && detail.entity.displayReference.trim().toLowerCase() === "agent alpha" && betaDetail && currentAuthorityId ? <AlphaBetaProductProof
        enterpriseId={detail.entity.enterpriseId}
        alpha={{ entityId: detail.entity.entityId, displayName: "Agent Alpha", accountableOwnerId: detail.entity.accountableOwnerId, organizationId: detail.entity.organizationReference, authorityReference: currentAuthorityId, activeCredentialId: activeNativeCredential ? String(activeNativeCredential.credential_id) : null, runtimeEnvironment: "preview-alpha-runtime" }}
        beta={{ entityId: betaDetail.entity.entityId, displayName: "Agent Beta", accountableOwnerId: betaDetail.entity.accountableOwnerId, organizationId: betaDetail.entity.organizationReference, authorityReference: null, activeCredentialId: betaDetail.nativeVerification.credentials.find((credential) => credential.state === "ACTIVE") ? String(betaDetail.nativeVerification.credentials.find((credential) => credential.state === "ACTIVE")?.credential_id) : null, runtimeEnvironment: "preview-beta-runtime" }}
      /> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {intelligenceItems.map(([label, item]) => <article key={label} className={panel}><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-3 break-words text-lg font-semibold">{value(item)}</p></article>)}
      </section>

      <section id="delegated-authority" className={panel}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Authority Lineage · Native cryptographic delegation</p>
        <h2 className="mt-2 text-xl font-semibold">Delegated Authority</h2>
        <p className="mt-2 text-sm text-slate-600">Authority issued by this entity. Delegation transfers only an attenuated subset; it does not transfer identity or accountability.</p>
        <div className="mt-4 space-y-3">
          {delegatedAuthority.map((delegation) => <article key={String(delegation.delegation_id)} className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-semibold">Delegate: {value(delegation.delegate_operational_entity_id)} · {delegationState(delegation)}</p>
            <dl className="mt-3 grid gap-3 md:grid-cols-3"><div><dt>Scope</dt><dd>{value(delegation.permitted_actions)}</dd></div><div><dt>Target</dt><dd>{value(delegation.permitted_targets)}</dd></div><div><dt>Expiry</dt><dd>{value(delegation.expires_at)}</dd></div><div><dt>Redelegation</dt><dd>{value(delegation.can_redelegate)}</dd></div><div><dt>Policy</dt><dd>{value(delegation.policy_version)}</dd></div><div><dt>Evidence</dt><dd className="break-all">{value(delegation.evidence_references)}</dd></div></dl>
          </article>)}
          {!delegatedAuthority.length ? <p className="text-sm text-slate-500">No authority delegated by this entity.</p> : null}
        </div>
      </section>

      <section id="authority-received" className={panel}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Authority received</p>
        <h2 className="mt-2 text-xl font-semibold">Why can this entity do this?</h2>
        <p className="mt-2 text-sm text-slate-600">Enterprise authority flows through the accountable owner and signed delegation; the answer is reconstructed from current native identity evidence, acceptance, policy, and the exact requested action.</p>
        <div className="mt-4 space-y-3">
          {receivedAuthority.map((delegation) => <article key={String(delegation.delegation_id)} className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-semibold">From {value(delegation.delegator_operational_entity_id)} · {delegationState(delegation)}</p>
            <dl className="mt-3 grid gap-3 md:grid-cols-3"><div><dt>Parent Authority</dt><dd className="break-all">{value(delegation.parent_authority_id)}</dd></div><div><dt>Scope</dt><dd>{value(delegation.permitted_actions)}</dd></div><div><dt>Targets</dt><dd>{value(delegation.permitted_targets)}</dd></div><div><dt>Expiry</dt><dd>{value(delegation.expires_at)}</dd></div><div><dt>Depth</dt><dd>{value(delegation.delegation_depth)} / {value(delegation.maximum_delegation_depth)}</dd></div><div><dt>Current State</dt><dd>{delegationState(delegation)}</dd></div></dl>
          </article>)}
          {!receivedAuthority.length ? <p className="text-sm text-slate-500">Identity may be verified, but no delegated authority is active.</p> : null}
        </div>
        {latestReceivedAuthority ? <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"><p className="font-semibold">WHY CAN BETA DO THIS?</p><nav aria-label="Beta authority lineage" className="mt-3 flex flex-wrap items-center gap-2 font-semibold">
          <Link className="underline" href="/operational-entities">Enterprise</Link><span>→</span>
          <a className="underline" href="#parent-authority">Alice</a><span>→</span>
          {alphaEntity ? <Link className="underline" href={`/operational-entities/${encodeURIComponent(alphaEntity.entityId)}`}>Alpha</Link> : <span>Alpha</span>}<span>→</span>
          <a className="underline" href="#parent-authority">Alpha Authority</a><span>→</span>
          <a className="underline" href="#authority-received">Signed Delegation</a><span>→</span>
          <a className="underline" href="#native-replay">Beta Acceptance</a><span>→</span>
          <a className="underline" href="#native-verification">Beta</a><span>→</span>
          <a className="underline" href="#transactions">Exact Action</a>
        </nav><p className="mt-3 break-all">Delegation: {value(latestReceivedAuthority.delegation_id)} · Digest: {value(latestReceivedAuthority.delegation_digest)} · Latest decision: {value(latestDelegatedEvaluation?.decision)}</p></div> : null}
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
          <span className="w-fit rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold">{value(nativeIdentityLabel)}</span>
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
        <article className={panel}><h2 className="text-xl font-semibold">Enforcement and Outcome</h2><dl className="mt-4 space-y-3 text-sm"><div><dt>Decision</dt><dd className="font-semibold">{value(latestTransaction?.decision)}</dd></div><div><dt>Enforcement request</dt><dd>{value(latestNativeRequest?.request_state ?? latestEnforcement?.enforcement_stage)}</dd></div><div><dt>Acknowledgement</dt><dd>{value(latestNativeAcknowledgement?.status)}</dd></div><div><dt>Execution claim</dt><dd>{value(latestExecutionClaim?.result ?? latestEnforcement?.claim_state)}</dd></div><div><dt>Runtime observation</dt><dd>{value(latestRuntimeObservation?.result)}</dd></div><div><dt>Destination observation</dt><dd>{value(latestDestinationObservation?.result)}</dd></div><div><dt>Outcome</dt><dd className="font-semibold">{value(latestNativeOutcome?.outcome)}</dd></div><div><dt>Control status</dt><dd>{value(latestNativeOutcome?.control_status)}</dd></div><div><dt>Contradictions</dt><dd>{value(latestNativeOutcome?.contradiction_codes)}</dd></div></dl><p className="mt-4 text-xs text-slate-500">ALLOW is never treated as execution. Destination and runtime evidence are independently persisted and deterministically correlated.</p></article>
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

      <section id="native-replay" className={panel}>
        <h2 className="text-xl font-semibold">Native identity and authority Replay</h2>
        <p className="mt-3 text-sm text-slate-600">Persisted events reconstruct verification, delegation, decisions, and revocation.</p>
        {detail.nativeVerification.replay.map((event) => <p key={String(event.event_id)} className="mt-3 break-all font-mono text-xs">{value(event.occurred_at)} · {value(event.event_type)} · {value(event.reason_codes)}</p>)}
        {!detail.nativeVerification.replay.length ? <p className="mt-3 text-sm text-slate-500">No native Replay events persisted yet.</p> : null}
      </section>

      <section id="evidence-graph" className={panel}>
        <h2 className="text-xl font-semibold">Evidence Graph</h2>
        <p className="mt-3 text-sm text-slate-600">Persisted nodes and typed edges from the existing tenant Evidence Graph.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div><h3 className="font-semibold">Nodes</h3>{detail.evidenceGraph.nodes.map((node) => <p key={String(node.node_id)} className="mt-2 break-all font-mono text-xs">{value(node.node_type)} · {value(node.external_id)} · {value(node.label)}</p>)}</div>
          <div><h3 className="font-semibold">Edges</h3>{detail.evidenceGraph.edges.map((edge) => <p key={String(edge.edge_id)} className="mt-2 break-all font-mono text-xs">{graphLabels.get(String(edge.from_node_id)) ?? value(edge.from_node_id)} → {value(edge.edge_type)} → {graphLabels.get(String(edge.to_node_id)) ?? value(edge.to_node_id)}</p>)}</div>
        </div>
      </section>

      <section id="transactions" className={panel}>
        <h2 className="text-xl font-semibold">Canonical transactions and receipts</h2>
        <div className="mt-4 space-y-3">{detail.transactions.map((transaction) => <article key={String(transaction.transaction_id)} className="rounded-xl border border-slate-200 p-4 text-sm"><p className="font-semibold">{value(transaction.decision)} · {value(transaction.action_type)} · {value(transaction.action_resource)}</p><p className="mt-2 break-all text-xs text-slate-600">Reasons: {value(transaction.reason_codes)} · Policy: {value(transaction.policy_id)}:{value(transaction.policy_version)}</p><div className="mt-3 flex gap-3"><Link className="font-semibold underline" href={`/trust/transactions/${String(transaction.transaction_id)}`}>Transaction, WHY and Replay</Link><a className="font-semibold underline" href={`/api/trust/transactions/${String(transaction.transaction_id)}/receipt`}>Receipt JSON</a></div></article>)}</div>
        {!detail.transactions.length ? <p className="mt-3 text-sm text-slate-500">No canonical transactions persisted yet.</p> : null}
      </section>

      <Link href="/operational-entities" className="inline-flex font-semibold underline">Back to Operational Entities</Link>
    </main>
  );
}
