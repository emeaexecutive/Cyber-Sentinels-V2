export type FusionSignalSource =
  | "Real ML"
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
  escalationReason?: string;
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
  providerAgreement?: number | null;
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
  const providerAgreementRisk =
    input.providerAgreement == null ? null : 1 - clamp(input.providerAgreement);
  const combinedRisk =
    weightedRisk == null
      ? provenanceRisk
      : provenanceRisk == null
        ? weightedRisk
        : weightedRisk * 0.8 + provenanceRisk * 0.2;
  const agreementAdjustedRisk =
    combinedRisk == null
      ? providerAgreementRisk
      : providerAgreementRisk == null
        ? combinedRisk
        : combinedRisk * 0.85 + providerAgreementRisk * 0.15;
  const priorEscalations = (input.governanceHistory ?? []).filter(
    (outcome) => outcome === "escalated" || outcome === "blocked"
  ).length;
  const governedRisk = agreementAdjustedRisk == null
    ? null
    : clamp(agreementAdjustedRisk + Math.min(0.15, priorEscalations * 0.05));
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
  const confidences = usable.map((signal) => clamp(signal.confidence));
  const confidenceSpread = confidences.length
    ? Number((Math.max(...confidences) - Math.min(...confidences)).toFixed(3))
    : null;
  const sourceTransparency = input.signals.map((signal) => ({
    id: signal.id,
    source: signal.source,
    providerStatus: signal.providerStatus ?? null,
    confidence: clamp(signal.confidence),
    evidenceCount: signal.evidence.length,
    limitations: [...(signal.limitations ?? [])],
    escalationReason: signal.escalationReason ?? null,
    usedInFusion: usable.some((item) => item.id === signal.id),
  }));

  return {
    recommendation,
    confidence: Number(confidence.toFixed(3)),
    confidenceBand,
    confidenceSpread,
    source: "Runtime Intelligence" as const,
    evidenceSummary: [...new Set(usable.flatMap((signal) => signal.evidence))],
    sources: [...new Set(input.signals.map((signal) => signal.source))],
    providerStatuses: [...new Set(input.signals.map((signal) => signal.providerStatus).filter(Boolean))],
    providerAgreement: input.providerAgreement == null ? null : clamp(input.providerAgreement),
    sourceTransparency,
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
    reviewerOverrideApplied: Boolean(input.reviewerOutcome),
    limitations: [
      "Deterministic signal fusion; not a certainty or final regulated decision.",
      input.providerAgreement == null
        ? "No provider-agreement score was supplied."
        : "Provider agreement is weighted evidence, not proof of authenticity.",
      ...new Set(input.signals.flatMap((signal) => signal.limitations ?? [])),
    ],
  };
}
