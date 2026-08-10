import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectOperationalEntityIntelligence } from "@/lib/operational-entities/intelligence";
import { loadOperationalEntities, loadOperationalEntityDetail } from "@/lib/operational-entities/server";
import { NativeEntityVerificationPanel } from "@/components/native-entity-verification-panel";

export const dynamic = "force-dynamic";

const panel = "rounded-2xl border border-slate-800 bg-slate-950 p-5";

function text(value: unknown, fallback = "UNKNOWN") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function values(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function TrustRuntimeDemoPage({ searchParams }: { searchParams: Promise<{ entityId?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/demo/trust-runtime");
  const entities = await loadOperationalEntities({ supabase, user });
  const requested = (await searchParams).entityId;
  const persistedAgentAlpha = entities.find((entity) => entity.displayReference.trim().toLowerCase() === "agent alpha") ?? null;
  const persistedAgentBeta = entities.find((entity) => entity.displayReference.trim().toLowerCase() === "agent beta") ?? null;
  const selected = entities.find((entity) => entity.entityId === requested) ?? persistedAgentAlpha ?? entities[0] ?? null;
  const detail = selected ? await loadOperationalEntityDetail({ supabase, user, entityId: selected.entityId }) : null;
  const alphaDetail = persistedAgentAlpha && persistedAgentAlpha.entityId !== selected?.entityId ? await loadOperationalEntityDetail({ supabase, user, entityId: persistedAgentAlpha.entityId }) : detail;
  const betaDetail = persistedAgentBeta && persistedAgentBeta.entityId !== selected?.entityId ? await loadOperationalEntityDetail({ supabase, user, entityId: persistedAgentBeta.entityId }) : detail;

  if (!detail) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-amber-700/40 bg-amber-950/20 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Internal product proof</p>
          <h1 className="mt-3 text-3xl font-semibold">Trust Runtime has insufficient tenant evidence.</h1>
          <p className="mt-4 text-slate-300">No persisted Operational Entity is available. This surface does not substitute a fixture or simulated healthy state.</p>
        </div>
      </main>
    );
  }

  const intelligence = projectOperationalEntityIntelligence(detail);
  const latest = detail.transactions.at(-1) ?? null;
  const snapshot = latest?.decision_time_snapshot && typeof latest.decision_time_snapshot === "object" ? latest.decision_time_snapshot as Record<string, unknown> : {};
  const enforcement = snapshot.enforcementState && typeof snapshot.enforcementState === "object" ? snapshot.enforcementState as Record<string, unknown> : {};
  const latestNative = detail.nativeVerification.verifications[0] ?? null;
  const nativeCredential = detail.nativeVerification.credentials.find((credential) => credential.state === "ACTIVE") ?? detail.nativeVerification.credentials[0] ?? null;
  const nativeManifest = detail.nativeVerification.manifests.find((manifest) => manifest.status === "ACTIVE") ?? detail.nativeVerification.manifests[0] ?? null;
  const alphaNative = alphaDetail?.nativeVerification.verifications[0] ?? null;
  const betaNative = betaDetail?.nativeVerification.verifications[0] ?? null;
  const betaDelegation = betaDetail?.delegatedAuthority.received[0] ?? null;
  const betaEvaluations = betaDetail?.delegatedAuthority.evaluations ?? [];
  const betaRead = betaEvaluations.find((evaluation) => evaluation.action_type === "read" && evaluation.action_target === "repository:a") ?? null;
  const betaWrite = betaEvaluations.find((evaluation) => evaluation.action_type === "write" && evaluation.action_target === "repository:a") ?? null;
  const parentInvalid = betaEvaluations.find((evaluation) => values(evaluation.reason_codes).includes("PARENT_AUTHORITY_REVOKED")) ?? null;
  const latestEnforcementRequest = detail.nativeEnforcement.requests.at(-1) ?? null;
  const latestEnforcementAcknowledgement = detail.nativeEnforcement.acknowledgements.at(-1) ?? null;
  const latestDestinationObservation = detail.nativeEnforcement.destinationObservations.at(-1) ?? null;
  const latestNativeOutcome = detail.nativeEnforcement.outcomes.at(-1) ?? null;
  const betaConfirmedOutcome = betaDetail?.nativeEnforcement.outcomes.find((outcome) => outcome.outcome === "CONFIRMED") ?? null;
  const betaCriticalOutcome = betaDetail?.nativeEnforcement.outcomes.find((outcome) => outcome.outcome === "CONTROL_FAILURE_CRITICAL") ?? null;
  const betaUnconfirmedOutcome = betaDetail?.nativeEnforcement.outcomes.find((outcome) => outcome.outcome === "UNKNOWN") ?? null;
  const transactionId = text(latest?.transaction_id, "");
  const transactionHref = transactionId ? `/trust/transactions/${encodeURIComponent(transactionId)}` : `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`;
  const evidence = Array.isArray(latest?.evidence_references) ? latest.evidence_references as Array<Record<string, unknown>> : [];
  const items: Array<[string, unknown, string]> = [
    ["OPERATIONAL ENTITY", detail.entity.displayReference, `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["IDENTITY", latestNative ? `${text(latestNative.status)} · native cryptographic evidence` : detail.externalIdentities.length ? `${detail.externalIdentities.length} external reference(s)` : "NOT YET VERIFIED", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#native-verification`],
    ["PROOF", latestNative ? "CRYPTOGRAPHIC · Ed25519" : "NOT YET ESTABLISHED", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#native-verification`],
    ["ACCOUNTABLE OWNER", detail.entity.accountableOwnerId || "UNKNOWN", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["AUTHORITY", latest?.authority_reference ?? "NOT RECORDED", transactionHref],
    ["EVIDENCE", evidence.length ? `${evidence.length} normalized reference(s)` : "INSUFFICIENT EVIDENCE", `${transactionHref}#provider-evidence`],
    ["CONSEQUENCE", snapshot.consequence ?? detail.entity.currentConsequenceClassification, transactionHref],
    ["DECISION", latest?.decision ?? "NOT RECORDED", transactionHref],
    ["EXECUTION", latestEnforcementAcknowledgement?.status ?? latestEnforcementRequest?.request_state ?? latest?.external_state ?? "NOT REQUESTED", transactionHref],
    ["DESTINATION", latestDestinationObservation?.result ?? "NOT OBSERVED", transactionHref],
    ["OUTCOME", latestNativeOutcome?.outcome ?? enforcement.businessOutcome ?? latest?.external_state ?? "UNKNOWN", transactionHref],
    ["TRUST DRIFT", intelligence.drift.state, `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["TRUST HEALTH", intelligence.health.overallState, `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["TRUST CONFIDENCE", intelligence.confidence.level, transactionHref],
    ["RECOMMENDATION", intelligence.recommendation.recommendation, `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["REPLAY", detail.replay.length ? `${detail.replay.length} persisted session(s)` : "NOT RECORDED", transactionHref],
    ["TRUST MEMORY", detail.trustMemory.length ? `${detail.trustMemory.length} material record(s)` : "NO MATERIAL RECORD", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}`],
    ["NATIVE VERIFICATION", latestNative?.status ?? "NOT YET VERIFIED", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#native-verification`],
    ["CREDENTIAL FINGERPRINT", nativeCredential?.credential_fingerprint ?? "NOT REGISTERED", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#native-verification`],
    ["MANIFEST DIGEST", nativeManifest?.manifest_digest ?? "NOT REGISTERED", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#native-verification`],
    ["CONTINUITY FINGERPRINT", latestNative?.continuity_fingerprint ?? "NOT ESTABLISHED", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#native-verification`],
    ["RUNTIME BINDING", latestNative?.runtime_binding ?? "RUNTIME_UNVERIFIED", `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#native-verification`],
  ];

  return (
    <main className="min-h-screen bg-[#05080d] px-5 py-12 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-slate-800 pb-8 lg:flex-row lg:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Authenticated internal demonstration · Persisted data only</p><h1 className="mt-3 text-4xl font-semibold">Trust Runtime transaction proof</h1><p className="mt-3 max-w-3xl text-slate-400">This surface projects the selected tenant’s stored Operational Entity, canonical decisions, evidence, execution records, Replay and Trust Memory. It never runs a fixture on page load.</p></div>
          <form className="flex gap-2" action="/demo/trust-runtime"><label className="sr-only" htmlFor="entityId">Operational Entity</label><select id="entityId" name="entityId" defaultValue={detail.entity.entityId} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">{entities.map((entity) => <option key={entity.entityId} value={entity.entityId}>{entity.displayReference}</option>)}</select><button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Load</button></form>
        </header>

        {(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") ? <NativeEntityVerificationPanel
          enterpriseId={detail.entity.enterpriseId}
          operationalEntityId={detail.entity.entityId}
          canonicalTrustObjectId={detail.entity.canonicalTrustObjectId}
          displayName={detail.entity.displayReference}
          entityType={detail.entity.entityType}
          accountableOwnerId={detail.entity.accountableOwnerId}
          organizationId={detail.entity.organizationReference}
          authorityReference={detail.entity.currentAuthorityReferences[0] ?? null}
          environmentReference={detail.entity.environmentReferences[0] ?? null}
          activeCredentialId={nativeCredential ? String(nativeCredential.credential_id) : null}
        /> : null}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {items.map(([label, item, href]) => <Link href={href} key={label} className={`${panel} transition hover:border-cyan-500`}><p className="text-xs font-semibold tracking-[0.12em] text-slate-500">{label}</p><p className="mt-3 break-words text-lg font-semibold text-slate-100">{text(item)}</p><p className="mt-3 text-xs text-cyan-300">Open underlying record →</p></Link>)}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <article className={panel}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Why did Cyber Sentinels make this decision?</p>
            <h2 className="mt-3 text-2xl font-semibold">Exact reason codes and evidence</h2>
            <div className="mt-5 flex flex-wrap gap-2">{values(latest?.reason_codes).length ? values(latest?.reason_codes).map((reason) => <code key={reason} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{reason}</code>) : <span className="text-sm text-amber-300">NO DECISION REASON CODES RECORDED</span>}</div>
            <div className="mt-6 space-y-3">{intelligence.evidenceIndex.length ? intelligence.evidenceIndex.map((entry) => <Link href={entry.href} key={entry.reference} className="block rounded-xl border border-slate-800 p-4 hover:border-cyan-700"><p className="font-medium">{entry.label}</p><p className="mt-1 break-all font-mono text-xs text-slate-500">{entry.reference}</p></Link>) : <p className="rounded-xl border border-amber-800/40 p-4 text-amber-200">INSUFFICIENT EVIDENCE</p>}</div>
          </article>
          <aside className={panel}>
            <h2 className="text-xl font-semibold">Deterministic explanation</h2>
            <div className="mt-5 space-y-4">{intelligence.narrative.map((sentence) => <div key={sentence.text}><p className="text-slate-300">{sentence.text}</p><p className="mt-1 break-all font-mono text-xs text-slate-600">{sentence.evidenceReferences.join(", ")}</p></div>)}</div>
            <dl className="mt-6 space-y-4 text-sm"><div><dt className="text-slate-500">What changed?</dt><dd className="mt-1">{intelligence.drift.reasonCodes.join(", ") || "NO MATERIAL DRIFT RECORDED"}</dd></div><div><dt className="text-slate-500">What is unknown?</dt><dd className="mt-1">{intelligence.explanation.unknowns.join(", ") || "No unknown condition was derived from the current snapshot."}</dd></div><div><dt className="text-slate-500">What would restore trust?</dt><dd className="mt-1">{intelligence.explanation.restorationRequirements.join(", ") || "NO ACTION REQUIRED"}</dd></div></dl>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className={panel}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">CPTO question</p>
            <h2 className="mt-3 text-2xl font-semibold">How do you know that is the same agent?</h2>
            <dl className="mt-5 space-y-3 text-sm">
              {([
                ["Canonical entity ID", detail.entity.entityId],
                ["Credential fingerprint", nativeCredential?.credential_fingerprint],
                ["Signed challenge", latestNative?.challenge_id],
                ["Manifest digest", nativeManifest?.manifest_digest],
                ["Continuity fingerprint", latestNative?.continuity_fingerprint],
                ["Runtime binding", latestNative?.runtime_binding],
                ["Accountable owner", detail.entity.accountableOwnerId],
                ["Authority", latest?.authority_reference],
                ["Evidence references", latestNative?.evidence_references],
              ] as Array<[string, unknown]>).map(([label, item]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-all font-mono text-xs text-slate-200">{text(item)}</dd></div>)}
            </dl>
          </article>
          <article className={panel}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Attack result</p>
            <h2 className="mt-3 text-2xl font-semibold">What happens if somebody copies its ID?</h2>
            <p className="mt-5 leading-7 text-slate-300">The ID is a public reference, not a credential. A copy cannot answer the tenant-, entity-, audience-, nonce-, timestamp-, manifest-, and key-bound challenge without possession of the registered private Ed25519 key.</p>
            <div className="mt-5 rounded-xl border border-red-900/60 bg-red-950/20 p-4"><p className="font-semibold text-red-200">Copied ID alone → INVALID_SIGNATURE / WRONG_ENTITY → no native evidence → no authority shortcut.</p></div>
            <p className="mt-4 text-sm text-slate-500">Cyber Sentinels never receives or stores the private key. Native evidence is first-party evidence and is not classified as independent corroboration of itself.</p>
          </article>
        </section>

        <section id="multi-agent-delegation" className="mt-8 rounded-2xl border border-cyan-900 bg-slate-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">CPTO demonstration · Alice → Alpha → Beta</p>
          <h2 className="mt-3 text-3xl font-semibold">Native delegated authority, without conflating identity and permission</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className={panel}><p className="text-xs text-slate-500">AGENT ALPHA</p><p className="mt-2 text-xl font-semibold">Identity {text(alphaNative?.status, "NOT YET VERIFIED")}</p><p className="mt-2 text-sm text-slate-400">Authority {alphaDetail?.entity.currentAuthorityReferences.length ? "ACTIVE" : "NOT RECORDED"} · Owner {text(alphaDetail?.entity.accountableOwnerId)}</p></article>
            <article className={panel}><p className="text-xs text-slate-500">AGENT BETA</p><p className="mt-2 text-xl font-semibold">Identity {text(betaNative?.status, "NOT YET VERIFIED")}</p><p className="mt-2 text-sm text-slate-400">Authority {text(betaDelegation?.status, "NONE")} · Source {text(betaDelegation?.delegator_operational_entity_id, "NONE")}</p></article>
            <article className={panel}><p className="text-xs text-slate-500">SIGNED DELEGATION</p><p className="mt-2 text-xl font-semibold">READ repository A</p><p className="mt-2 break-all text-sm text-slate-400">Parent {text(betaDelegation?.parent_authority_id, "NOT RECORDED")} · Digest {text(betaDelegation?.delegation_digest, "NOT RECORDED")}</p></article>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4"><p className="text-xs text-emerald-300">BETA READS REPO A</p><p className="mt-2 text-2xl font-semibold">{text(betaRead?.decision, "NOT RUN")}</p><p className="mt-2 text-sm text-slate-400">{values(betaRead?.reason_codes).join(", ") || "No persisted decision."}</p></article>
            <article className="rounded-xl border border-red-900/60 bg-red-950/20 p-4"><p className="text-xs text-red-300">BETA WRITES REPO A</p><p className="mt-2 text-2xl font-semibold">{text(betaWrite?.decision, "NOT RUN")}</p><p className="mt-2 text-sm text-slate-400">{values(betaWrite?.reason_codes).join(", ") || "Expected ACTION_OUT_OF_DELEGATED_SCOPE after execution."}</p></article>
            <article className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4"><p className="text-xs text-amber-300">PARENT AUTHORITY REVOKED</p><p className="mt-2 text-2xl font-semibold">{text(parentInvalid?.decision, "NOT RUN")}</p><p className="mt-2 text-sm text-slate-400">Beta identity remains {text(betaNative?.status, "UNKNOWN")}; delegated authority becomes invalid.</p></article>
          </div>
          <div className="mt-5 rounded-xl border border-slate-700 p-5"><p className="font-semibold text-cyan-200">WHY?</p><p className="mt-2 text-slate-300">Enterprise authority → Alice → Agent Alpha → signed attenuated delegation → Agent Beta → exact action. Parent revocation breaks the authority chain, not Beta’s cryptographic identity.</p><p className="mt-3 text-lg font-semibold">Beta is still Beta. Its cryptographic identity has not failed. What changed is that its delegated authority is no longer valid.</p></div>
        </section>

        <section id="native-enforcement-outcome" className="mt-8 rounded-2xl border border-violet-900 bg-slate-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">CPTO demonstration · Decision is not execution</p>
          <h2 className="mt-3 text-3xl font-semibold">Can Cyber Sentinels prove the authorized action actually occurred?</h2>
          <p className="mt-3 max-w-4xl text-slate-400">For controlled internal Repository A, the product preserves the immutable decision, enforcement request, acknowledgement, execution claim, runtime observation, MAC-protected destination observation, deterministic correlation and outcome as separate records.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5"><p className="text-xs font-semibold text-emerald-300">DEMO A · BETA READ</p><p className="mt-3 text-xl font-semibold">ALLOW → ACCEPTED → OBSERVED → {text(betaConfirmedOutcome?.outcome, "NOT YET EXECUTED")}</p><p className="mt-3 text-sm text-slate-400">Confirmation requires an exact destination observation. Adapter acknowledgement alone is insufficient.</p></article>
            <article className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-5"><p className="text-xs font-semibold text-amber-300">DEMO B · BETA WRITE</p><p className="mt-3 text-xl font-semibold">DENY → NO ENFORCEMENT</p><p className="mt-3 text-sm text-slate-400">READ-only delegated authority cannot authorize WRITE_TEST_RECORD. No request, acknowledgement, destination action or success outcome is created.</p></article>
            <article className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-5"><p className="text-xs font-semibold text-rose-300">DEMO C · DENY BUT EXECUTED</p><p className="mt-3 text-xl font-semibold">{text(betaCriticalOutcome?.outcome, "CONTROL FAILURE NOT INJECTED")}</p><p className="mt-3 text-sm text-slate-400">A controlled non-Production bypass writes real destination evidence, preserves DENY, opens an incident, records Trust Memory and degrades trust intelligence.</p></article>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {([[
              "DECISION", latest?.decision ?? "UNKNOWN",
            ], ["ENFORCEMENT", latestEnforcementAcknowledgement?.status ?? latestEnforcementRequest?.request_state ?? "NOT REQUESTED"], ["EXECUTION", detail.nativeEnforcement.executionClaims.at(-1)?.result ?? "UNKNOWN"], ["DESTINATION", latestDestinationObservation?.result ?? "NOT OBSERVED"], ["OUTCOME", latestNativeOutcome?.outcome ?? betaUnconfirmedOutcome?.outcome ?? "UNKNOWN"]] as Array<[string, unknown]>).map(([label, item]) => <div key={label} className="rounded-xl border border-slate-800 bg-black/40 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 font-semibold">{text(item)}</p></div>)}
          </div>
          <p className="mt-5 text-sm text-slate-500">This does not claim arbitrary third-party enforcement. Native proof covers the controlled destination and separately authenticated destination evidence ingested through the tenant-scoped API.</p>
        </section>
      </div>
    </main>
  );
}
