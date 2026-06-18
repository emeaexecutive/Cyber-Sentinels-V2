export type TrustFreshnessState =
  | "fresh"
  | "checkpoint"
  | "reverification_due"
  | "governance_review";

export type TrustPostureInput = {
  lastVerifiedAt?: string | null;
  lastGovernanceAt?: string | null;
  lastEvidenceAt?: string | null;
  lastSignalAt?: string | null;
  evidenceCount?: number;
  signalCount?: number;
  unresolvedGovernanceCount?: number;
  confidenceLabel?: string | null;
  now?: Date;
};

export type TrustPosture = {
  state: TrustFreshnessState;
  label: string;
  ageDays: number | null;
  nextReview: string;
  reverificationRecommended: boolean;
  continuityChecks: string[];
  explanation: string;
};

const dayMs = 24 * 60 * 60 * 1000;
const checkpointDays = 45;
const reverificationDays = 90;

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function maxDate(values: Array<string | null | undefined>) {
  return values
    .map(parseDate)
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

export function daysSince(value?: string | null, now = new Date()) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / dayMs));
}

export function latestCreatedAt(rows: Array<{ created_at?: string | null }>) {
  return maxDate(rows.map((row) => row.created_at))?.toISOString() ?? null;
}

export function buildTrustPosture(input: TrustPostureInput): TrustPosture {
  const now = input.now ?? new Date();
  const latestVerification = maxDate([
    input.lastVerifiedAt,
    input.lastGovernanceAt,
    input.lastEvidenceAt,
  ]);
  const ageDays = latestVerification
    ? Math.max(0, Math.floor((now.getTime() - latestVerification.getTime()) / dayMs))
    : null;
  const unresolvedGovernanceCount = input.unresolvedGovernanceCount ?? 0;
  const evidenceCount = input.evidenceCount ?? 0;
  const signalCount = input.signalCount ?? 0;

  let state: TrustFreshnessState = "fresh";
  if (unresolvedGovernanceCount > 0) {
    state = "governance_review";
  } else if (ageDays === null || ageDays >= reverificationDays) {
    state = "reverification_due";
  } else if (ageDays >= checkpointDays) {
    state = "checkpoint";
  }

  const labelByState: Record<TrustFreshnessState, string> = {
    fresh: "Fresh",
    checkpoint: "Review checkpoint",
    reverification_due: "Reverification due",
    governance_review: "Governance review",
  };

  const continuityChecks = [
    evidenceCount > 0 ? "Evidence exists" : "Evidence missing",
    input.lastGovernanceAt ? "Governance review recorded" : "No governance review recorded",
    input.lastVerifiedAt ? "Verification recorded" : "Verification date not recorded",
    signalCount > 0 ? `${signalCount} signal context item${signalCount === 1 ? "" : "s"}` : "No signal context",
  ];

  const nextReview =
    state === "fresh"
      ? "Continue normal scheduled review."
      : state === "checkpoint"
        ? "Review evidence and governance context before confidence ages further."
        : state === "governance_review"
          ? "Resolve open governance action before treating posture as current."
          : "Reverify evidence and governance context before relying on this workflow.";

  const ageText = ageDays === null ? "No verification date is recorded" : `Last review context is ${ageDays} day${ageDays === 1 ? "" : "s"} old`;
  const explanation = [
    ageText,
    `confidence is ${input.confidenceLabel ?? "not recorded"}`,
    `${evidenceCount} evidence record${evidenceCount === 1 ? "" : "s"}`,
    `${unresolvedGovernanceCount} open governance item${unresolvedGovernanceCount === 1 ? "" : "s"}`,
  ].join("; ");

  return {
    state,
    label: labelByState[state],
    ageDays,
    nextReview,
    reverificationRecommended: state === "reverification_due" || state === "governance_review",
    continuityChecks,
    explanation,
  };
}

export function trustPostureClass(state: TrustFreshnessState) {
  if (state === "fresh") return "border-emerald-800 text-emerald-200";
  if (state === "checkpoint") return "border-cyan-800 text-cyan-100";
  if (state === "governance_review") return "border-amber-800 text-amber-200";
  return "border-red-800 text-red-200";
}
