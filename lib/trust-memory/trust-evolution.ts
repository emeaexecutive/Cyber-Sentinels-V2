export type TrustChangeClassification =
  | "increased"
  | "decreased"
  | "decayed"
  | "recovered"
  | "escalated"
  | "blocked"
  | "restored"
  | "insufficient_evidence";

export type TrustEvolutionInput = {
  trustStateBefore: string;
  trustStateAfter: string;
  confidenceBefore: number;
  confidenceAfter: number;
  evidenceRefs?: string[];
  governanceRefs?: string[];
  reviewedOutcomeRef?: string | null;
  reason?: string;
};

export type TrustChangeExplanation = {
  classification: TrustChangeClassification;
  trustDelta: number;
  summary: string;
  drivers: string[];
  confidenceChange: {
    before: number;
    after: number;
    delta: number;
  };
};

const BLOCKED_STATES = new Set(["blocked", "denied", "revoked"]);
const ESCALATED_STATES = new Set(["escalated", "review_required", "needs_review", "step_up_required"]);
const RESTORED_STATES = new Set(["restored", "approved", "trusted", "verified"]);
const RECOVERY_STATES = new Set(["recovered", "restored", "verified", "approved"]);

function normalizedConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function calculateTrustDelta(input: Pick<TrustEvolutionInput, "confidenceBefore" | "confidenceAfter">) {
  return Number((normalizedConfidence(input.confidenceAfter) - normalizedConfidence(input.confidenceBefore)).toFixed(2));
}

export function classifyTrustChange(input: TrustEvolutionInput): TrustChangeClassification {
  const before = input.trustStateBefore.trim().toLowerCase();
  const after = input.trustStateAfter.trim().toLowerCase();
  const delta = calculateTrustDelta(input);
  const hasEvidence =
    (input.evidenceRefs?.length ?? 0) > 0 ||
    (input.governanceRefs?.length ?? 0) > 0 ||
    Boolean(input.reviewedOutcomeRef);

  if (!hasEvidence && Math.abs(delta) < 0.03) return "insufficient_evidence";
  if (BLOCKED_STATES.has(after)) return "blocked";
  if (ESCALATED_STATES.has(after)) return "escalated";
  if (RESTORED_STATES.has(after) && !RESTORED_STATES.has(before)) return "restored";
  if (delta > 0 && RECOVERY_STATES.has(after)) return "recovered";
  if (delta < -0.08 && before === after) return "decayed";
  if (delta > 0.02) return "increased";
  if (delta < -0.02) return "decreased";
  return hasEvidence ? "increased" : "insufficient_evidence";
}

export function explainTrustChange(input: TrustEvolutionInput): TrustChangeExplanation {
  const trustDelta = calculateTrustDelta(input);
  const classification = classifyTrustChange(input);
  const drivers = [
    input.reason?.trim() || null,
    input.evidenceRefs?.length ? `${input.evidenceRefs.length} evidence reference(s)` : null,
    input.governanceRefs?.length ? `${input.governanceRefs.length} governance reference(s)` : null,
    input.reviewedOutcomeRef ? "Reviewed outcome affected calibration" : null,
  ].filter((item): item is string => Boolean(item));

  return {
    classification,
    trustDelta,
    summary:
      classification === "insufficient_evidence"
        ? "Trust did not change because the memory event lacks enough evidence to explain a shift."
        : `Trust ${classification.replace("_", " ")} from ${input.trustStateBefore} to ${input.trustStateAfter}.`,
    drivers,
    confidenceChange: {
      before: normalizedConfidence(input.confidenceBefore),
      after: normalizedConfidence(input.confidenceAfter),
      delta: trustDelta,
    },
  };
}
