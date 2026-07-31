import type { ScopeContinuityArtifacts, ScopeContinuityDecision, ScopeContinuityEvaluationInput } from "@/src/lib/scope-continuity/types";

type Scenario = { input: ScopeContinuityEvaluationInput; decision: ScopeContinuityDecision; artifacts: ScopeContinuityArtifacts };

function State({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/60 p-4" aria-label={`${label}: ${value}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 font-semibold text-zinc-100">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-zinc-400">{detail}</p> : null}
    </div>
  );
}

function ScenarioPanel({ title, scenario }: { title: string; scenario: Scenario }) {
  const { input, decision } = scenario;
  const strongest = [...input.attestations].sort((left, right) => right.confidence - left.confidence)[0];
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-5" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Deterministic scenario</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
        </div>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold uppercase text-zinc-200" aria-label={`Decision ${decision.outcome}`}>
          {decision.outcome.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <State label="Declared" value={input.declaration.environmentClass} detail={`Internet ${input.declaration.internetAccessExpected ? "expected" : "not expected"}; production ${input.declaration.productionAccessExpected ? "expected" : "not expected"}.`} />
        <State label="Configured" value={input.declaration.testHarnessProvider ?? "Missing evidence"} detail="Harness configuration remains an attributed assertion." />
        <State label="Observed" value={strongest?.observedEnvironmentClass ?? "Missing evidence"} detail={strongest ? `Internet ${String(strongest.internetReachable)}; production ${String(strongest.productionReachable)}.` : "No runtime observation is available."} />
        <State label="Authorized" value={input.authorization.authorizedObjective} detail={`${input.authorization.permittedTargets.length} permitted target(s).`} />
        <State label="Requested" value={input.request.targetIdentifier} detail={`${input.request.action} via ${input.request.tool ?? "unspecified tool"}.`} />
        <State label="Decision" value={decision.outcome} detail={`Trust ${decision.trustImpact.nextState}; review ${decision.humanReviewRequired ? "required" : "not required"}.`} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-zinc-800 p-4" aria-label="Attestation evidence">
          <h3 className="font-semibold text-zinc-100">Attestation</h3>
          <dl className="mt-3 space-y-2 text-sm text-zinc-400">
            <div><dt className="inline text-zinc-500">Source: </dt><dd className="inline">{strongest?.attestationSourceType ?? "missing"}</dd></div>
            <div><dt className="inline text-zinc-500">Strength: </dt><dd className="inline">{strongest?.evidenceStrength ?? "missing"}</dd></div>
            <div><dt className="inline text-zinc-500">Freshness: </dt><dd className="inline">{strongest?.freshness ?? "missing"}</dd></div>
            <div><dt className="inline text-zinc-500">Isolation: </dt><dd className="inline">{strongest?.isolationControlState ?? "unknown"}</dd></div>
            <div><dt className="inline text-zinc-500">Monitoring: </dt><dd className="inline">{strongest?.monitoringState ?? "unknown"}</dd></div>
          </dl>
        </section>
        <section className="rounded-lg border border-zinc-800 p-4" aria-label="Contradictions">
          <h3 className="font-semibold text-zinc-100">Contradictions</h3>
          {decision.contradictions.length ? (
            <ul className="mt-3 space-y-2 text-sm text-amber-200">
              {decision.contradictions.map((item) => <li key={item.id}><span className="font-semibold uppercase">{item.severity}</span>: {item.type}</li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-zinc-400">No material contradiction recorded.</p>}
        </section>
        <section className="rounded-lg border border-zinc-800 p-4" aria-label="Decision reasons">
          <h3 className="font-semibold text-zinc-100">Reason codes</h3>
          <ul className="mt-3 space-y-2 text-xs text-zinc-300">{decision.reasonCodes.map((code) => <li key={code} className="break-all font-mono">{code}</li>)}</ul>
          {decision.missingEvidence.length ? <p className="mt-3 text-sm text-amber-200">Missing evidence: {decision.missingEvidence.join(", ")}</p> : null}
        </section>
      </div>
    </article>
  );
}

export function EnvironmentScopePanel({ critical, consistent }: { critical: Scenario; consistent: Scenario }) {
  return (
    <section aria-labelledby="environment-scope-title">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Environment Attestation</p>
        <h1 id="environment-scope-title" className="mt-3 text-4xl font-semibold text-white">Environment &amp; Scope</h1>
        <p className="mt-4 max-w-4xl leading-7 text-zinc-400">Scope Continuity™ compares declared, configured, observed, authorized and requested context. Missing or stale evidence remains visible; provider assertions are never displayed as independent verification.</p>
      </header>
      <div className="space-y-5">
        <ScenarioPanel title="Critical contradiction" scenario={critical} />
        <ScenarioPanel title="Consistent context" scenario={consistent} />
      </div>
      <p className="mt-5 rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-400">This surface records and explains evidence. It does not provide network isolation, guarantee detection of every environment escape, or imply containment without external evidence.</p>
    </section>
  );
}
