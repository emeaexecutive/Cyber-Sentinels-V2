import type { AssuranceDimension, LivingTrustProfile } from "@/lib/trust/living-trust-profile";

function stateClass(state: AssuranceDimension["state"]) {
  if (["revoked", "expired"].includes(state)) return "border-rose-900/70 bg-rose-950/20 text-rose-100";
  if (["review_required", "insufficient_evidence"].includes(state)) return "border-amber-900/70 bg-amber-950/15 text-amber-100";
  if (state === "unavailable") return "border-zinc-800 bg-zinc-950 text-zinc-300";
  return "border-cyan-900/70 bg-cyan-950/10 text-cyan-100";
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function LivingTrustProfileView({ profile }: { profile: LivingTrustProfile | null }) {
  if (!profile) {
    return (
      <section aria-labelledby="living-trust-profile" className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Living Trust Profile</p>
        <h2 id="living-trust-profile" className="mt-3 text-2xl font-semibold text-white">Awaiting workflow context</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
          A contextual profile appears when this workspace has an entity, workflow, policy, authority and observed evidence to assess. Missing data is not converted into a universal score.
        </p>
      </section>
    );
  }

  const dimensions = Object.values(profile.dimensionalAssurance);
  const observedDimensions = dimensions.filter((item) => !["unavailable", "insufficient_evidence"].includes(item.state)).length;
  const coverageDegrees = Math.round((observedDimensions / dimensions.length) * 360);
  const summaryId = "living-trust-profile-summary";
  return (
    <section aria-labelledby="living-trust-profile" aria-describedby={summaryId} className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <p id={summaryId} className="sr-only">Living Trust Profile for {profile.entityType} {profile.entityId}. Current posture {label(profile.currentPosture)}. {observedDimensions} of {dimensions.length} assurance dimensions have observed evidence. Authority is {label(profile.activeAuthority.state)}.</p>
      <div className="border-b border-zinc-800 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.15),transparent_38%)] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Living Trust Profile · Trust DNA™</p>
            <h2 id="living-trust-profile" className="mt-3 text-3xl font-semibold text-white">Contextual operational trust</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{profile.productBoundary}</p>
          </div>
          <div className="rounded-xl border border-cyan-900 bg-black/60 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Current posture</p>
            <p className="mt-1 text-lg font-semibold capitalize text-cyan-100">{label(profile.currentPosture)}</p>
            <p className="mt-1 text-xs text-zinc-500">Confidence band: {profile.confidenceBand}</p>
          </div>
        </div>
        <p className="mt-6 rounded-xl border border-cyan-900/70 bg-cyan-950/15 px-4 py-3 text-sm font-medium text-cyan-100">
          {profile.contextBoundary}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Entity", `${label(profile.entityType)} · ${profile.entityId}`],
            ["Workflow", profile.workflowContext.workflowId],
            ["Purpose", profile.purpose],
            ["Requested action", label(profile.workflowContext.requestedAction)],
            ["Policy", profile.workflowContext.policyVersion],
          ].map(([itemLabel, value]) => (
            <div key={itemLabel} className="min-w-0 rounded-xl border border-zinc-800 bg-black/50 p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-600">{itemLabel}</p>
              <p className="mt-1 truncate text-sm text-zinc-200" title={value}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dimensions.map((item) => (
            <article key={item.name} className={`rounded-xl border p-4 ${stateClass(item.state)}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{item.label}</h3>
                <span className="rounded-full border border-current/30 px-2 py-0.5 text-[0.68rem] capitalize opacity-80">{label(item.state)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 opacity-80">{item.reason}</p>
              <details className="mt-4 border-t border-current/15 pt-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.1em] opacity-70">Evidence and boundary</summary>
                <div className="mt-3 space-y-2 text-xs leading-5 opacity-75">
                  <p>Sources: {item.sourceEvidence.length ? item.sourceEvidence.join(", ") : "Not recorded"}</p>
                  <p>Last updated: {item.lastChanged ?? "Not recorded"}</p>
                  <p>Expiry: {item.expiry ?? "Not recorded"}</p>
                  <p>Reviewer: {label(item.reviewerStatus)}</p>
                  <p>{item.limitation}</p>
                </div>
              </details>
            </article>
          ))}
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          <article className="rounded-xl border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Authority status</p>
            <p className="mt-2 text-xl font-semibold capitalize text-white">{label(profile.activeAuthority.state)}</p>
            <dl className="mt-3 grid gap-2 text-xs leading-5 text-zinc-500">
              <div><dt className="inline text-zinc-300">Delegator:</dt> <dd className="inline">{profile.activeAuthority.delegatorId ?? "Not recorded"}</dd></div>
              <div><dt className="inline text-zinc-300">Delegate:</dt> <dd className="inline">{profile.activeAuthority.delegateId ?? "Not recorded"}</dd></div>
              <div><dt className="inline text-zinc-300">Resource scope:</dt> <dd className="inline">{profile.activeAuthority.resourceScope.join(", ") || "Not recorded"}</dd></div>
              <div><dt className="inline text-zinc-300">Permitted:</dt> <dd className="inline">{profile.activeAuthority.permittedActions.join(", ") || "None recorded"}</dd></div>
              <div><dt className="inline text-zinc-300">Prohibited:</dt> <dd className="inline">{profile.activeAuthority.prohibitedActions.join(", ") || "None recorded"}</dd></div>
              <div><dt className="inline text-zinc-300">Maximum delegation depth:</dt> <dd className="inline">{profile.activeAuthority.maximumDelegationDepth ?? "Not recorded"}</dd></div>
              <div><dt className="inline text-zinc-300">Expiry:</dt> <dd className="inline">{profile.activeAuthority.expiresAt ?? "Not recorded"}</dd></div>
              <div><dt className="inline text-zinc-300">Policy:</dt> <dd className="inline">{profile.activeAuthority.policyVersion}</dd></div>
              <div><dt className="inline text-zinc-300">Last runtime reassessment:</dt> <dd className="inline">{profile.activeAuthority.lastRuntimeReassessment}</dd></div>
            </dl>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Evidence completeness</p>
            <div className="mt-4 flex items-center gap-4">
              <div role="img" aria-label={`${observedDimensions} of ${dimensions.length} assurance dimensions have observed evidence`} className="grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(34 211 238) 0deg ${coverageDegrees}deg, rgb(39 39 42) ${coverageDegrees}deg 360deg)` }}>
                <div className="grid h-14 w-14 place-items-center rounded-full bg-black text-sm font-semibold text-white">{observedDimensions}/{dimensions.length}</div>
              </div>
              <p className="text-xl font-semibold capitalize text-white">{profile.evidenceCompleteness.state}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{profile.evidenceCompleteness.present} observed categories for {profile.evidenceCompleteness.expected} required.</p>
            <p className="mt-2 text-xs text-zinc-600">Missing: {profile.evidenceCompleteness.missing.join(", ") || "None recorded"}</p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Operational next step</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white">{profile.recommendedAction}</p>
            <p className="mt-2 text-xs text-zinc-600">Reassessment due: {profile.expiryOrReassessmentDate ?? "Not recorded"}</p>
            <p className="mt-2 text-xs text-zinc-600">Replay: {profile.replayAvailable ? "Available" : "Awaiting evidence"}</p>
          </article>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-xl border border-zinc-800 bg-black p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Recent trust evolution</h3>
              <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">Explained changes only</span>
            </div>
            <div className="mt-4 grid gap-3">
              {profile.recentTrustChanges.length ? profile.recentTrustChanges.map((change) => (
                <details key={change.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <summary className="cursor-pointer text-sm font-medium capitalize text-zinc-200">{label(change.transition)} · {change.whatChanged}</summary>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-500">
                    <p>Previous posture: {label(change.previousPosture)}</p>
                    <p>New posture: {label(change.newPosture)}</p>
                    <p>Reason: {change.why}</p>
                    <p>Evidence: {change.evidenceChanged.join(", ") || "Not recorded"}</p>
                    <p>Authority changed: {change.authorityChanged ? "Yes" : "No"}</p>
                    <p>Policy: {change.policyApplied.join(", ") || "Not recorded"}</p>
                    <p>Actor or reviewer: {change.actorOrReviewer}</p>
                    <p>Replay: {change.replayReference ?? "Not recorded"}</p>
                    <p>Timestamp: {change.changedAt}</p>
                    <p>{change.recommendedAction}</p>
                  </div>
                </details>
              )) : <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">No attributable Trust Memory changes are available for this exact context.</p>}
            </div>
          </article>

          <article className="rounded-xl border border-zinc-800 bg-black p-5">
            <h3 className="text-lg font-semibold text-white">Open risks and governance</h3>
            <p className="mt-2 text-sm text-zinc-500">Governance state: <span className="capitalize text-zinc-300">{label(profile.governanceState)}</span></p>
            <div className="mt-4 grid gap-3">
              {profile.unresolvedRisks.length ? profile.unresolvedRisks.map((risk) => (
                <div key={risk.id} className="rounded-lg border border-amber-900/60 bg-amber-950/10 p-3">
                  <p className="text-sm text-amber-100">{risk.reason}</p>
                  <p className="mt-1 text-xs text-amber-200/50">{risk.evidenceRefs.join(", ") || "Evidence reference not recorded"}</p>
                </div>
              )) : <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">No unresolved risk is recorded for this contextual profile.</p>}
            </div>
          </article>
        </div>
        <details className="mt-7 rounded-xl border border-zinc-800 bg-black p-5">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Source references and operational limitations</summary>
          <div className="mt-4 grid gap-5 text-xs leading-5 text-zinc-500 lg:grid-cols-2">
            <div><p className="font-semibold text-zinc-300">Sources</p><ul className="mt-2 grid gap-1">{profile.sourceReferences.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><p className="font-semibold text-zinc-300">Limitations</p><ul className="mt-2 grid gap-1">{profile.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </details>
      </div>
    </section>
  );
}
