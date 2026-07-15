import type { ProviderRuntimeState } from "./types.ts";

export type ProviderSignalCategory =
  | "identity"
  | "deepfake"
  | "device_integrity"
  | "session_integrity"
  | "liveness"
  | "voice"
  | "document_verification"
  | "behavioral_analytics";

export type ProviderConsensusSignalInput = {
  provider: string;
  category: ProviderSignalCategory;
  state: ProviderRuntimeState;
  signal?: "support" | "challenge" | "unknown";
  model?: string | null;
  version?: string | null;
  latencyMs?: number | null;
  confidence?: number | null;
  reliabilityWeight?: number | null;
  limitations?: string[];
  evidenceRefs?: string[];
};

export type NormalizedProviderConsensusSignal = {
  provider: string;
  category: ProviderSignalCategory;
  state: ProviderRuntimeState;
  signal: "support" | "challenge" | "unknown";
  model: string;
  version: string;
  latencyMs: number | null;
  confidence: number | null;
  categoryWeight: number;
  stateWeight: number;
  reliabilityWeight: number;
  effectiveWeight: number;
  contributes: boolean;
  limitations: string[];
  evidenceRefs: string[];
};

export type ProviderConsensusResult = {
  decision: "support" | "challenge" | "conflict" | "insufficient_evidence";
  trustConfidence: number | null;
  consensusConfidence: number | null;
  categoryCoverage: ProviderSignalCategory[];
  contributions: NormalizedProviderConsensusSignal[];
  explanation: string[];
  disagreements: string[];
  evidenceRefs: string[];
  limitations: string[];
  boundary: string;
};

const categoryWeights: Record<ProviderSignalCategory, number> = {
  identity: 0.9,
  deepfake: 0.75,
  device_integrity: 0.8,
  session_integrity: 0.85,
  liveness: 0.8,
  voice: 0.65,
  document_verification: 0.8,
  behavioral_analytics: 0.55,
};

const stateWeights: Record<ProviderRuntimeState, number> = {
  Live: 1,
  "Test Mode": 0.6,
  Simulated: 0.25,
  "Awaiting Credentials": 0,
  Degraded: 0.4,
  Timeout: 0,
  Failed: 0,
  Disabled: 0,
  Unsupported: 0,
};

function clamp(value: number | null | undefined, fallback: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return fallback;
  const numeric = Number(value);
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

function unique(values: string[] = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function direction(input: ProviderConsensusSignalInput, confidence: number | null) {
  if (input.signal) return input.signal;
  if (confidence === null) return "unknown";
  if (confidence >= 0.65) return "support";
  if (confidence <= 0.35) return "challenge";
  return "unknown";
}

export function normalizeProviderConsensusSignal(input: ProviderConsensusSignalInput): NormalizedProviderConsensusSignal {
  const confidence = clamp(input.confidence, null);
  const categoryWeight = categoryWeights[input.category];
  const stateWeight = stateWeights[input.state];
  const reliabilityWeight = clamp(input.reliabilityWeight, 1) ?? 1;
  const normalizedDirection = direction(input, confidence);
  const contributes = stateWeight > 0 && confidence !== null && normalizedDirection !== "unknown";
  return {
    provider: String(input.provider || "Unattributed provider"),
    category: input.category,
    state: input.state,
    signal: normalizedDirection,
    model: input.model?.trim() || "Not reported",
    version: input.version?.trim() || "Not reported",
    latencyMs: input.latencyMs === null || input.latencyMs === undefined || !Number.isFinite(Number(input.latencyMs))
      ? null
      : Math.max(0, Number(Number(input.latencyMs).toFixed(3))),
    confidence,
    categoryWeight,
    stateWeight,
    reliabilityWeight,
    effectiveWeight: contributes ? Number((categoryWeight * stateWeight * reliabilityWeight).toFixed(3)) : 0,
    contributes,
    limitations: unique(input.limitations),
    evidenceRefs: unique(input.evidenceRefs),
  };
}

export function createProviderConsensus(inputs: ProviderConsensusSignalInput[]): ProviderConsensusResult {
  const contributions = inputs.map(normalizeProviderConsensusSignal);
  const usable = contributions.filter((signal) => signal.contributes);
  const categoryCoverage = [...new Set(usable.map((signal) => signal.category))];
  const supportScore = usable
    .filter((signal) => signal.signal === "support")
    .reduce((total, signal) => total + signal.effectiveWeight * Number(signal.confidence), 0);
  const challengeScore = usable
    .filter((signal) => signal.signal === "challenge")
    .reduce((total, signal) => total + signal.effectiveWeight * Number(signal.confidence), 0);
  const totalScore = supportScore + challengeScore;
  const conflictRatio = Math.min(supportScore, challengeScore) / Math.max(supportScore, challengeScore, 0.0001);
  const disagreements = usable.length > 1 && supportScore > 0 && challengeScore > 0
    ? [`Provider evidence conflicts across ${categoryCoverage.join(", ") || "reported categories"}.`]
    : [];

  let decision: ProviderConsensusResult["decision"] = "insufficient_evidence";
  if (categoryCoverage.length >= 2 && conflictRatio >= 0.35) decision = "conflict";
  else if (categoryCoverage.length >= 2 && supportScore > challengeScore) decision = "support";
  else if (categoryCoverage.length >= 2 && challengeScore > supportScore) decision = "challenge";

  const trustConfidence = totalScore
    ? Number((supportScore / totalScore).toFixed(3))
    : null;
  const consensusConfidence = totalScore
    ? Number((Math.abs(supportScore - challengeScore) / totalScore).toFixed(3))
    : null;
  const limitations = unique([
    ...contributions.flatMap((signal) => signal.limitations),
    ...(categoryCoverage.length < 2 ? ["Fewer than two independent signal categories contributed; consensus is insufficient."] : []),
    ...(contributions.some((signal) => signal.model === "Not reported" || signal.version === "Not reported")
      ? ["At least one provider did not report model or version metadata."]
      : []),
    ...(decision === "conflict" ? ["Conflicting signals require policy or human review; no average is treated as truth."] : []),
  ]);

  return {
    decision,
    trustConfidence,
    consensusConfidence,
    categoryCoverage,
    contributions,
    explanation: usable.map((signal) => `${signal.provider} ${signal.signal}s ${signal.category} at weight ${signal.effectiveWeight} (${signal.state}; model ${signal.model}; version ${signal.version}).`),
    disagreements,
    evidenceRefs: unique(contributions.flatMap((signal) => signal.evidenceRefs)),
    limitations,
    boundary: "Provider consensus normalizes and weights explainable signals by category, runtime state and reliability. It never treats a blind average or provider output as the final trust decision.",
  };
}
