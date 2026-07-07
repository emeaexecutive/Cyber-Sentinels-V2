export type FusionSignalSource =
  | "Real ML"
  | "Provider API"
  | "Heuristic Baseline"
  | "Runtime Intelligence"
  | "Governance Review"
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
  providerStatus?: "Live" | "Simulated" | "Awaiting Credentials" | "Timeout" | "Failed" | "Disabled";
  escalationReason?: string;
};

export type TrustRecommendation =
  | "allow"
  | "review"
  | "escalate"
  | "block"
  | "insufficient_evidence";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function fuseTrustSignals(input: {
  signals: FusionSignal[];
  intentRisk?: {
    riskScore: number;
    recommendation?: "allow" | "review" | "escalate" | "block";
    evidence?: string[];
    escalationReason?: string | null;
  } | null;
  sessionIntegrityRisk?: number | null;
  provenanceConfidence?: number | null;
  agentPostureRisk?: number | null;
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
  const intentRisk = input.intentRisk == null ? null : clamp(input.intentRisk.riskScore / 100);
  const sessionIntegrityRisk = input.sessionIntegrityRisk == null ? null : clamp(input.sessionIntegrityRisk);
  const agentPostureRisk = input.agentPostureRisk == null ? null : clamp(input.agentPostureRisk);
  const contextualRisks = [intentRisk, sessionIntegrityRisk, agentPostureRisk].filter(
    (value): value is number => value !== null
  );
  const contextualRisk = contextualRisks.length
    ? contextualRisks.reduce((total, value) => total + value, 0) / contextualRisks.length
    : null;
  const combinedRisk =
    weightedRisk == null
      ? provenanceRisk
      : provenanceRisk == null
        ? weightedRisk
        : weightedRisk * 0.8 + provenanceRisk * 0.2;
  const contextAdjustedRisk =
    combinedRisk == null
      ? contextualRisk
      : contextualRisk == null
        ? combinedRisk
        : combinedRisk * 0.75 + contextualRisk * 0.25;
  const agreementAdjustedRisk =
    contextAdjustedRisk == null
      ? providerAgreementRisk
      : providerAgreementRisk == null
        ? contextAdjustedRisk
        : contextAdjustedRisk * 0.85 + providerAgreementRisk * 0.15;
  const priorEscalations = (input.governanceHistory ?? []).filter(
    (outcome) => outcome === "escalated" || outcome === "blocked"
  ).length;
  const governedRisk = agreementAdjustedRisk == null
    ? null
    : clamp(agreementAdjustedRisk + Math.min(0.15, priorEscalations * 0.05));
  let recommendation: TrustRecommendation =
    governedRisk == null
      ? "insufficient_evidence"
      : governedRisk >= 0.85
        ? "block"
        : governedRisk >= 0.6
          ? "escalate"
          : governedRisk >= 0.3
            ? "review"
            : "allow";
  if (input.reviewerOutcome) recommendation = input.reviewerOutcome;
  if (!input.reviewerOutcome && input.intentRisk?.recommendation === "block") recommendation = "block";
  if (!input.reviewerOutcome && input.intentRisk?.recommendation === "escalate" && recommendation === "allow") {
    recommendation = "escalate";
  }
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
    evidenceSummary: [...new Set([
      ...usable.flatMap((signal) => signal.evidence),
      ...(input.intentRisk?.evidence ?? []),
    ])],
    sources: [...new Set(input.signals.map((signal) => signal.source))],
    providerStatuses: [...new Set(input.signals.map((signal) => signal.providerStatus).filter(Boolean))],
    providerAgreement: input.providerAgreement == null ? null : clamp(input.providerAgreement),
    contextRisks: {
      intentRisk,
      sessionIntegrityRisk,
      provenanceRisk,
      agentPostureRisk,
    },
    sourceTransparency,
    escalationRecommendation:
      recommendation === "block" || recommendation === "escalate"
        ? "Route to a named governance reviewer before execution continues."
        : recommendation === "insufficient_evidence"
          ? "Collect additional evidence before relying on this recommendation."
          : "Retain evidence and continue under configured workflow policy.",
    escalationReason:
      input.intentRisk?.escalationReason
        ? input.intentRisk.escalationReason
        : priorEscalations
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
      input.intentRisk == null
        ? "No intent-risk assessment was supplied."
        : "Intent-aware trust scoring is heuristic and must not be described as confirmed ML.",
      ...new Set(input.signals.flatMap((signal) => signal.limitations ?? [])),
    ],
  };
}
