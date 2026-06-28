export type TrustJourneyState =
  | "verified"
  | "elevated_risk"
  | "governance_review"
  | "session_integrity_failed"
  | "manual_review_required"
  | "replay_available"
  | "trusted_workforce";

export type TrustJourneyStage =
  | "identity_submitted"
  | "human_presence_checked"
  | "session_integrity_checked"
  | "injection_risk_reviewed"
  | "authorization_changed"
  | "governance_review_opened"
  | "manual_review_completed"
  | "receipt_issued";

export type TrustJourneyEvent = {
  id: string;
  title: string;
  description: string;
  occurredAt?: string | null;
  state: TrustJourneyState;
  stage?: TrustJourneyStage;
  score?: number | null;
  evidenceLabel?: string | null;
  flag?: string | null;
  reviewerAction?: string | null;
  reviewer?: string | null;
  escalationReason?: string | null;
  workflowReference?: string | null;
  analystNote?: string | null;
};

export type TrustProofState = {
  currentVerificationState?: string | null;
  riskLevel?: string | null;
  lastEvidenceEvent?: string | null;
  trustStateChange?: string | null;
  authorizationLineage?: string | null;
  evidenceContinuity?: string | null;
  reviewerAction?: string | null;
  finalOutcome?: string | null;
};

const journeyStages: Array<{ id: TrustJourneyStage; label: string; evidence: string }> = [
  { id: "identity_submitted", label: "Verification started", evidence: "Identity submitted" },
  { id: "human_presence_checked", label: "Human presence checked", evidence: "Presence evidence" },
  { id: "session_integrity_checked", label: "Session integrity checked", evidence: "Integrity evidence" },
  { id: "injection_risk_reviewed", label: "Injection risk events", evidence: "Flag review" },
  { id: "authorization_changed", label: "Authorization changes", evidence: "Lineage record" },
  { id: "governance_review_opened", label: "Governance escalation", evidence: "Governance review" },
  { id: "manual_review_completed", label: "Reviewer actions", evidence: "Decision record" },
  { id: "receipt_issued", label: "Receipt issued", evidence: "Receipt proof" },
];

const stateDetails: Record<TrustJourneyState, { label: string; className: string; dotClassName: string }> = {
  verified: {
    label: "Verified",
    className: "border-emerald-900 text-emerald-200",
    dotClassName: "border-emerald-500 bg-emerald-300",
  },
  elevated_risk: {
    label: "Elevated Risk",
    className: "border-red-900 text-red-200",
    dotClassName: "border-red-500 bg-red-300",
  },
  governance_review: {
    label: "Governance Review",
    className: "border-amber-900 text-amber-100",
    dotClassName: "border-amber-500 bg-amber-300",
  },
  session_integrity_failed: {
    label: "Session Integrity Failed",
    className: "border-red-900 text-red-100",
    dotClassName: "border-red-500 bg-red-300",
  },
  manual_review_required: {
    label: "Manual Review Required",
    className: "border-amber-900 text-amber-200",
    dotClassName: "border-amber-500 bg-amber-300",
  },
  replay_available: {
    label: "Replay Available",
    className: "border-cyan-900 text-cyan-100",
    dotClassName: "border-cyan-500 bg-cyan-300",
  },
  trusted_workforce: {
    label: "Verified",
    className: "border-emerald-900 text-emerald-100",
    dotClassName: "border-emerald-500 bg-emerald-300",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function clampScore(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clean(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function inferStage(event: TrustJourneyEvent): TrustJourneyStage {
  if (event.stage) return event.stage;
  const text = `${event.title} ${event.description} ${event.state}`.toLowerCase();

  if (text.includes("receipt")) return "receipt_issued";
  if (text.includes("manual") || text.includes("completed") || text.includes("approved") || text.includes("resolved")) {
    return "manual_review_completed";
  }
  if (text.includes("authorization") || text.includes("permission") || text.includes("lineage") || text.includes("access")) {
    return "authorization_changed";
  }
  if (text.includes("governance") || text.includes("review opened")) return "governance_review_opened";
  if (text.includes("injection")) return "injection_risk_reviewed";
  if (text.includes("session") || text.includes("integrity")) return "session_integrity_checked";
  if (text.includes("human") || text.includes("presence") || text.includes("liveness")) return "human_presence_checked";
  return "identity_submitted";
}

function stageState(
  stageId: TrustJourneyStage,
  orderedEvents: TrustJourneyEvent[]
): "completed" | "current" | "pending" {
  const completedStages = new Set(orderedEvents.map(inferStage));
  if (completedStages.has(stageId)) return "completed";

  const firstPendingIndex = journeyStages.findIndex((stage) => !completedStages.has(stage.id));
  const currentStage = journeyStages[firstPendingIndex]?.id;
  return currentStage === stageId ? "current" : "pending";
}

function stageClass(value: "completed" | "current" | "pending") {
  if (value === "completed") return "border-emerald-900 bg-emerald-950/10 text-emerald-100";
  if (value === "current") return "border-amber-900 bg-amber-950/10 text-amber-100";
  return "border-zinc-800 bg-black text-zinc-400";
}

export function TrustStateBadge({ state }: { state: TrustJourneyState }) {
  const detail = stateDetails[state];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${detail.className}`}>
      {detail.label}
    </span>
  );
}

export function TrustJourneyVisualization({
  title = "Operational Trust Journey",
  description = "Chronological verification, integrity and governance progression.",
  events,
  finalState,
  proofState,
}: {
  title?: string;
  description?: string;
  events: TrustJourneyEvent[];
  finalState?: TrustJourneyState;
  proofState?: TrustProofState;
}) {
  const orderedEvents = [...events]
    .sort((left, right) => {
      const leftTime = left.occurredAt ? new Date(left.occurredAt).getTime() : 0;
      const rightTime = right.occurredAt ? new Date(right.occurredAt).getTime() : 0;
      return leftTime - rightTime;
    })
    .map((event) => ({
      ...event,
      score: clampScore(event.score),
    }));
  const outcome = finalState ?? orderedEvents.at(-1)?.state ?? "manual_review_required";
  const latestEvent = orderedEvents.at(-1);
  const proofItems = [
    ["Current verification state", proofState?.currentVerificationState ?? stateDetails[outcome].label],
    ["Risk level", proofState?.riskLevel ?? stateDetails[outcome].label],
    ["Last evidence event", proofState?.lastEvidenceEvent ?? latestEvent?.title],
    ["Trust state change", proofState?.trustStateChange ?? latestEvent?.flag],
    ["Authorization lineage", proofState?.authorizationLineage ?? latestEvent?.workflowReference],
    ["Evidence continuity", proofState?.evidenceContinuity ?? latestEvent?.evidenceLabel],
    ["Reviewer action", proofState?.reviewerAction ?? latestEvent?.reviewerAction],
    ["Final outcome", proofState?.finalOutcome ?? latestEvent?.description],
  ] as const;
  const evidenceOrdered = orderedEvents.map((event) => inferStage(event));

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 print:border-zinc-300 print:bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300 print:text-zinc-600">
            Trust Progression Timeline
          </p>
          <h2 className="mt-2 text-xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400 print:text-zinc-700">
            {description}
          </p>
        </div>
        <TrustStateBadge state={outcome} />
      </div>

      <div className="mt-6 rounded-lg border border-cyan-950 bg-black p-4 print:border-zinc-300 print:bg-white">
        <p className="text-xs uppercase tracking-[0.16em] text-cyan-300 print:text-zinc-600">
          Evidence-chain continuity
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-400 print:text-zinc-700">
          Trust evolves over time as verification events, provider-backed evidence, authorization changes,
          reviewer interventions, governance escalations, replay chronology and workflow outcomes accumulate.
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
          Federated workflow trust relationships
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-400 print:text-zinc-700">
          Workflow, evidence, replay, governance outcome, authorization event and trust posture remain linked
          as reviewable enterprise records. Shared anomaly indicators and federated trust signals are context for
          governance intelligence, not centralized surveillance or social scoring.
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {proofItems.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">{label}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-100 print:text-zinc-800">
              {clean(value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        {journeyStages.map((stage, index) => {
          const value = stageState(stage.id, orderedEvents);
          const matchingEvent = orderedEvents.find((event) => inferStage(event) === stage.id);
          const priorEventCount = evidenceOrdered.filter((id) => id === stage.id).length;

          return (
            <article key={stage.id} className={`rounded-lg border p-3 ${stageClass(value)} print:border-zinc-300 print:bg-white print:text-zinc-800`}>
              <p className="text-xs text-zinc-500 print:text-zinc-500">Stage {index + 1}</p>
              <h3 className="mt-2 text-sm font-semibold leading-5">{stage.label}</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500 print:text-zinc-600">{stage.evidence}</p>
              <p className="mt-3 text-xs capitalize text-zinc-500 print:text-zinc-600">
                {value}{priorEventCount > 1 ? ` / ${priorEventCount} events` : ""}
              </p>
              {matchingEvent ? (
                <p className="mt-2 text-xs leading-5 text-zinc-400 print:text-zinc-600">
                  {formatDate(matchingEvent.occurredAt)}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4">
        {orderedEvents.length ? orderedEvents.map((event, index) => {
          const detail = stateDetails[event.state];
          return (
            <article key={event.id} className="grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white md:grid-cols-[110px_1fr_240px]">
              <div>
                <p className="text-xs text-zinc-600">Step {index + 1}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{formatDate(event.occurredAt)}</p>
                <div className={`mt-3 h-3 w-3 rounded-full border ${detail.dotClassName}`} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-zinc-100 print:text-zinc-900">{event.title}</h3>
                  <TrustStateBadge state={event.state} />
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400 print:text-zinc-700">{event.description}</p>
                <div className="mt-3 grid gap-2 text-xs leading-5 text-zinc-500 print:text-zinc-600 md:grid-cols-2">
                  <p>Reviewer: {clean(event.reviewer, "Pending assignment")}</p>
                  <p>Escalation reason: {clean(event.escalationReason ?? event.flag, "Not escalated")}</p>
                  <p>Workflow reference: {clean(event.workflowReference, "Workflow reference pending")}</p>
                  <p>Analyst note: {clean(event.analystNote ?? event.reviewerAction, "No analyst note recorded")}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">Journey stage</p>
                <p className="mt-2 text-sm capitalize text-zinc-300 print:text-zinc-700">{clean(inferStage(event))}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">Evidence label</p>
                <p className="mt-2 text-sm text-zinc-300 print:text-zinc-700">{clean(event.evidenceLabel ?? inferStage(event))}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-zinc-600">Flag / reviewer action</p>
                <p className="mt-2 text-sm leading-5 text-zinc-400 print:text-zinc-700">
                  {clean(event.flag ?? event.reviewerAction ?? stateDetails[event.state].label)}
                </p>
              </div>
            </article>
          );
        }) : (
          <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500 print:border-zinc-300 print:bg-white">
            No trust journey events are available yet.
          </p>
        )}
      </div>
    </section>
  );
}
