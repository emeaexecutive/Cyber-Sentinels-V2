import Link from "next/link";
import type { CapabilityGovernanceDecisionSnapshot } from "@/lib/operational-entities/capability-governance";
import type { InterAgentConflictDecisionSnapshot } from "@/lib/operational-entities/inter-agent-authority-conflict";
import {
  projectCapabilityGovernanceUx,
  projectInterAgentConflictUx,
  projectOperationalGovernanceSummary,
  type GovernanceTone,
} from "@/lib/operational-entities/governance-ux";

const panel = "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
const focus = "rounded-sm underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-700";
const toneStyles: Record<GovernanceTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  caution: "border-amber-200 bg-amber-50 text-amber-950",
  negative: "border-rose-200 bg-rose-50 text-rose-950",
  neutral: "border-slate-200 bg-slate-50 text-slate-800",
};

function Status({ label, tone }: { label: string; tone: GovernanceTone }) {
  return <span className={`inline-flex max-w-full rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toneStyles[tone]}`}>{label}</span>;
}

function EvidenceLinks({ transactionHref, evidenceHref = "#evidence-graph", lineageHref = "#delegated-authority", replayHref = "#native-replay" }: {
  transactionHref?: string | null;
  evidenceHref?: string;
  lineageHref?: string;
  replayHref?: string;
}) {
  return <nav aria-label="Inspect supporting trust evidence" className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
    <Link className={focus} href={evidenceHref}>View evidence</Link>
    <Link className={focus} href={lineageHref}>View authority lineage</Link>
    <Link className={focus} href={replayHref}>Open Replay</Link>
    {transactionHref ? <Link className={focus} href={transactionHref}>View transaction</Link> : null}
  </nav>;
}

export function OperationalEntityGovernanceSummary(props: {
  entityName: string;
  identityStatus?: string | null;
  authorityStatus?: string | null;
  canonicalDecision?: string | null;
  capabilityGovernance?: CapabilityGovernanceDecisionSnapshot | null;
  interAgentConflict?: InterAgentConflictDecisionSnapshot | null;
  sourceAgentName?: string | null;
  targetAgentName?: string | null;
  transactionHref?: string | null;
  idPrefix?: string;
  evidenceHref?: string;
  lineageHref?: string;
  replayHref?: string;
}) {
  const summary = projectOperationalGovernanceSummary(props);
  const model = projectCapabilityGovernanceUx(props.capabilityGovernance);
  const conflict = projectInterAgentConflictUx({ snapshot: props.interAgentConflict, sourceName: props.sourceAgentName, targetName: props.targetAgentName });
  const capability = props.capabilityGovernance;
  const relationship = props.interAgentConflict;
  const decisionExplanation = relationship
    ? conflict.explanation
    : capability
      ? model.explanation
      : "No canonical model-governance or inter-agent relationship evidence affected the latest decision.";

  const headingId = `${props.idPrefix ?? "operational-entity"}-trust-at-a-glance`;

  return <section aria-labelledby={headingId} className="space-y-5" data-testid="operational-governance-summary">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Decision context · {props.entityName}</p>
      <h2 id={headingId} className="mt-2 text-2xl font-semibold tracking-tight">Trust at a glance</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Identity establishes who this is. Authority establishes what it may do. Operational trust is the canonical decision for the requested action.</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      {[
        ["Identity", "Who is this?", summary.identity],
        ["Authority", "Can it act?", summary.authority],
        ["Operational trust", "What did Cyber Sentinels decide?", summary.operationalTrust],
      ].map(([label, question, status]) => <article className={panel} key={label as string}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label as string}</p>
        <p className="mt-2 text-sm text-slate-600">{question as string}</p>
        <div className="mt-4"><Status {...status as { label: string; tone: GovernanceTone }} /></div>
      </article>)}
    </div>

    <div className="grid gap-4 lg:grid-cols-2" aria-label="Capability and relationship governance">
      <article className={panel} data-testid="model-governance-card">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Model Governance</p><h3 className="mt-2 text-xl font-semibold">Capability evidence</h3></div>
          <Status label={model.state} tone={model.tone} />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-700" data-testid="model-explanation">{model.explanation}</p>
        {capability ? <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-slate-500">Model</dt><dd className="mt-1 break-words font-semibold">{capability.model.modelId}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Version</dt><dd className="mt-1 break-words">{capability.model.modelVersion}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Deployment</dt><dd className="mt-1 break-words">{model.classification}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Capability evidence</dt><dd className="mt-1">{capability.capabilityAssessmentReferences.length} attributed assessment(s)</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Environment</dt><dd className="mt-1 break-words">{capability.environmentAttestationReference ?? "Unknown"}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Safeguards</dt><dd className="mt-1 break-words">{capability.safeguardState.length ? capability.safeguardState.join(", ") : "None evidenced"}</dd></div>
          <div className="min-w-0 sm:col-span-2"><dt className="text-slate-500">Evidence freshness</dt><dd className="mt-1 break-words">{model.freshness}</dd></div>
        </dl> : <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No model-governance evidence affected the latest canonical decision.</p>}
        {model.reasonLabels.length ? <details className="mt-5 text-sm"><summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-700">Technical reasons</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">{model.reasonLabels.map((reason) => <li key={reason}>{reason}</li>)}</ul></details> : null}
      </article>

      <article className={panel} data-testid="authority-relationships-card">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Authority Relationships</p><h3 className="mt-2 text-xl font-semibold">Agent compatibility</h3></div>
          <Status label={conflict.state} tone={conflict.tone} />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-700" data-testid="conflict-explanation">{conflict.explanation}</p>
        {relationship ? <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-slate-500">Other affected entities</dt><dd className="mt-1 break-words font-semibold">{props.sourceAgentName ?? relationship.sourceAgent} ↔ {props.targetAgentName ?? relationship.targetAgent}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Relationship</dt><dd className="mt-1 break-words">{relationship.relationshipType} · {relationship.sharedWorkflow ?? "Workflow unknown"}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Shared resource</dt><dd className="mt-1 break-words">{relationship.authorityIntersection.resources.length ? relationship.authorityIntersection.resources.join(", ") : "None established"}</dd></div>
          <div className="min-w-0"><dt className="text-slate-500">Policy response</dt><dd className="mt-1 break-words">{relationship.policyResponse.toLowerCase().replaceAll("_", " ")}</dd></div>
        </dl> : <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No inter-agent relationship evidence affected the latest canonical decision.</p>}
        {conflict.reasonLabels.length ? <details className="mt-5 text-sm"><summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700">Technical reasons</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">{conflict.reasonLabels.map((reason) => <li key={reason}>{reason}</li>)}</ul></details> : null}
      </article>
    </div>

    <article className={`${panel} border-slate-300`} data-testid="decision-explanation">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Decision explanation</p>
      <h3 className="mt-2 text-xl font-semibold">Why?</h3>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-700">{decisionExplanation}</p>
      <EvidenceLinks transactionHref={props.transactionHref} evidenceHref={props.evidenceHref} lineageHref={props.lineageHref} replayHref={props.replayHref} />
    </article>
  </section>;
}
