export type FusionSignalSource =
  | "Provider API"
  | "Heuristic Baseline"
  | "Runtime Intelligence"
  | "Demo Data"
  | "Awaiting Credentials"
  | "Not Implemented";

export type FusionSignal = {
  id: string;
  source: FusionSignalSource;
  risk: number;
  confidence: number;
  evidence: string[];
  limitations?: string[];
  providerStatus?: "Live" | "Simulated" | "Awaiting Credentials" | "Disabled";
};

export type TrustRecommendation =
  | "allow"
  | "review"
  | "escalate"
  | "block"
  | "insufficient evidence";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function fuseTrustSignals(input: {
  signals: FusionSignal[];
  provenanceConfidence?: number | null;
  governanceHistory?: Array<"approved" | "review" | "escalated" | "blocked">;
  reviewerOutcome?: "allow" | "review" | "escalate" | "block" | null;
}) {
  const usable = input.signals.filter(
    (signal) =>
      !["Awaiting Credentials", "Not Implemented"].includes(signal.source) &&
      signal.evidence.length > 0
  );
  const weightedRiskDenominator = usable.reduce(
    (total, signal) => total + clamp(signal.confidence),
    0
  );
  const weightedRisk = weightedRiskDenominator
    ? usable.reduce(
        (total, signal) =>
          total + clamp(signal.risk) * clamp(signal.confidence),
        0
      ) / weightedRiskDenominator
    : null;
  const provenanceRisk =
    input.provenanceConfidence == null
      ? null
      : 1 - clamp(input.provenanceConfidence);
  const combinedRisk =
    weightedRisk == null
      ? provenanceRisk
      : provenanceRisk == null
        ? weightedRisk
        : weightedRisk * 0.8 + provenanceRisk * 0.2;
  const priorEscalations = (input.governanceHistory ?? []).filter(
    (outcome) => outcome === "escalated" || outcome === "blocked"
  ).length;
  const governedRisk = combinedRisk == null
    ? null
    : clamp(combinedRisk + Math.min(0.15, priorEscalations * 0.05));
  let recommendation: TrustRecommendation =
    governedRisk == null
      ? "insufficient evidence"
      : governedRisk >= 0.85
        ? "block"
        : governedRisk >= 0.6
          ? "escalate"
          : governedRisk >= 0.3
            ? "review"
            : "allow";
  if (input.reviewerOutcome) recommendation = input.reviewerOutcome;
  const confidence = usable.length
    ? clamp(usable.reduce((total, signal) => total + signal.confidence, 0) / usable.length)
    : 0;
  const confidenceBand =
    confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";

  return {
    recommendation,
    confidence: Number(confidence.toFixed(3)),
    confidenceBand,
    source: "Runtime Intelligence" as const,
    evidenceSummary: [...new Set(usable.flatMap((signal) => signal.evidence))],
    sources: [...new Set(input.signals.map((signal) => signal.source))],
    providerStatuses: [...new Set(input.signals.map((signal) => signal.providerStatus).filter(Boolean))],
    escalationRecommendation:
      recommendation === "block" || recommendation === "escalate"
        ? "Route to a named governance reviewer before execution continues."
        : recommendation === "insufficient evidence"
          ? "Collect additional evidence before relying on this recommendation."
          : "Retain evidence and continue under configured workflow policy.",
    escalationReason:
      priorEscalations
        ? `${priorEscalations} prior governance escalation(s) increased review priority.`
        : governedRisk == null
          ? "No usable evidence was available."
          : `Explainable fused risk band: ${governedRisk.toFixed(3)}.`,
    limitations: [
      "Deterministic signal fusion; not a certainty or final regulated decision.",
      ...new Set(input.signals.flatMap((signal) => signal.limitations ?? [])),
    ],
  };
}

