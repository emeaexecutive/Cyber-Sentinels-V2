export type TrustFreshnessState =
  | "fresh"
  | "checkpoint"
  | "reverification_due"
  | "governance_review";

export type TrustPostureBadge =
  | "trusted"
  | "context_shift"
  | "elevated_risk"
  | "reverification_due"
  | "governance_review";

export type ContextualTrustSignalType =
  | "contextual_trust"
  | "session_trust_drift"
  | "reverification_due"
  | "operational_risk_shift"
  | "identity_confidence_change";

export type ContextualTrustSignal = {
  type: ContextualTrustSignalType;
  label: string;
  status: "stable" | "changed" | "due" | "elevated" | "review";
  explanation: string;
  observedAt: string | null;
};

export type ContinuousTrustInput = {
  posture: TrustPosture;
  verificationSignals?: Array<Record<string, any>>;
  sessionChecks?: Array<Record<string, any>>;
  governanceActions?: Array<Record<string, any>>;
};

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

function riskRank(value: unknown) {
  if (value === "high" || value === "failed") return 3;
  if (value === "medium" || value === "elevated" || value === "needs_review") return 2;
  if (value === "low" || value === "clear" || value === "verified" || value === "reviewable") return 1;
  return 0;
}

function latestTimestamp(rows: Array<Record<string, any>>) {
  return latestCreatedAt(rows.map((row) => ({ created_at: row.created_at })));
}

export function buildContinuousTrustSignals(
  input: ContinuousTrustInput
): ContextualTrustSignal[] {
  const verificationSignals = [...(input.verificationSignals ?? [])].sort(
    (left, right) => new Date(String(right.created_at ?? 0)).getTime() - new Date(String(left.created_at ?? 0)).getTime()
  );
  const sessionChecks = [...(input.sessionChecks ?? [])].sort(
    (left, right) => new Date(String(right.created_at ?? 0)).getTime() - new Date(String(left.created_at ?? 0)).getTime()
  );
  const governanceActions = input.governanceActions ?? [];
  const elevated = verificationSignals.filter(
    (row) => riskRank(row.risk_level) >= 2 || row.requires_manual_review === true
  );
  const latestCheck = sessionChecks[0];
  const previousCheck = sessionChecks.find(
    (row, index) => index > 0 &&
      String(row.interview_session_id ?? "") === String(latestCheck?.interview_session_id ?? "")
  );
  const sessionChanged = Boolean(
    latestCheck && previousCheck &&
      (latestCheck.overall_status !== previousCheck.overall_status ||
        latestCheck.identity_verification_state !== previousCheck.identity_verification_state)
  );
  const openGovernance = governanceActions.filter((row) =>
    ["pending", "in_review", "escalated"].includes(String(row.action_status ?? row.status ?? ""))
  );
  const latestIdentity = latestCheck?.identity_verification_state ?? "not recorded";
  const previousIdentity = previousCheck?.identity_verification_state ?? null;

  return [
    {
      type: "contextual_trust",
      label: "Contextual trust signals",
      status: elevated.length ? "changed" : "stable",
      explanation: elevated.length
        ? `${elevated.length} current signal${elevated.length === 1 ? "" : "s"} require context-aware review.`
        : "No elevated contextual signal is visible in the current review window.",
      observedAt: latestTimestamp(verificationSignals),
    },
    {
      type: "session_trust_drift",
      label: "Session trust drift",
      status: sessionChanged ? "changed" : "stable",
      explanation: sessionChanged
        ? "The latest session state differs from its previous recorded state. Review replay before relying on the current posture."
        : "No recorded session-state drift is visible between the latest checks.",
      observedAt: latestCheck?.created_at ?? null,
    },
    {
      type: "reverification_due",
      label: "Reverification state",
      status: input.posture.reverificationRecommended ? "due" : "stable",
      explanation: input.posture.reverificationRecommended
        ? input.posture.nextReview
        : "Existing verification and review context remain inside the active review window.",
      observedAt: latestCheck?.created_at ?? null,
    },
    {
      type: "operational_risk_shift",
      label: "Operational risk shift",
      status: elevated.length ? "elevated" : "stable",
      explanation: elevated.length
        ? `Elevated session evidence is present across ${new Set(elevated.map((row) => row.category)).size} signal categor${new Set(elevated.map((row) => row.category)).size === 1 ? "y" : "ies"}.`
        : "Operational risk indicators remain stable in the available session evidence.",
      observedAt: latestTimestamp(elevated),
    },
    {
      type: "identity_confidence_change",
      label: "Identity confidence change",
      status: previousIdentity && latestIdentity !== previousIdentity ? "changed" : "stable",
      explanation: previousIdentity && latestIdentity !== previousIdentity
        ? `Identity state changed from ${previousIdentity} to ${latestIdentity}.`
        : `Latest identity state is ${latestIdentity}; no recorded confidence change requires escalation.`,
      observedAt: latestCheck?.created_at ?? null,
    },
    ...(openGovernance.length
      ? [{
          type: "contextual_trust" as const,
          label: "Governance review status",
          status: "review" as const,
          explanation: `${openGovernance.length} governance review${openGovernance.length === 1 ? " is" : "s are"} open. Human resolution remains authoritative.`,
          observedAt: latestTimestamp(openGovernance),
        }]
      : []),
  ];
}

export function continuousTrustBadge(input: ContinuousTrustInput): TrustPostureBadge {
  const signals = buildContinuousTrustSignals(input);
  if (signals.some((signal) => signal.status === "review")) return "governance_review";
  if (signals.some((signal) => signal.status === "elevated")) return "elevated_risk";
  if (input.posture.reverificationRecommended) return "reverification_due";
  if (signals.some((signal) => signal.status === "changed")) return "context_shift";
  return "trusted";
}
