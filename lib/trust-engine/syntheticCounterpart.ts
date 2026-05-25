export const cloneRiskStates = [
  "low",
  "watch",
  "elevated",
  "high",
  "critical",
] as const;

export const syntheticCounterpartSignals = [
  "reality_twin_created",
  "synthetic_clone_risk_detected",
  "identity_exposure_increased",
  "reality_resilience_changed",
] as const;

export const syntheticCounterpartAuditEvents = [
  "reality_twin_created",
  "synthetic_counterpart_evaluated",
] as const;

export type CloneRiskState = (typeof cloneRiskStates)[number];

export type SyntheticCounterpartInput = {
  hpg?: number | null;
  origin_dna?: number | null;
  reality_chain?: number | null;
  trust_timeline?: number | null;
  trust_graph?: number | null;
  voice_presence?: number | null;
  video_presence?: number | null;
  behavior_pattern?: number | null;
  public_profile_exposure?: number | null;
  social_signal_density?: number | null;
  media_exposure?: number | null;
  agent_activity?: number | null;
  evidence_chain_strength?: number | null;
};

export type SyntheticCounterpartResult = {
  synthetic_clone_risk: number;
  reality_resilience: number;
  identity_exposure: number;
  clone_complexity: number;
  impersonation_probability: number;
  risk_state: CloneRiskState;
  recommendations: string[];
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function score(value: number | null | undefined, fallback = 60) {
  return typeof value === "number" && Number.isFinite(value)
    ? clampScore(value)
    : fallback;
}

function riskState(value: number): CloneRiskState {
  if (value >= 88) return "critical";
  if (value >= 72) return "high";
  if (value >= 50) return "elevated";
  if (value >= 30) return "watch";

  return "low";
}

export function evaluateSyntheticCounterpart(
  input: SyntheticCounterpartInput
): SyntheticCounterpartResult {
  const publicProfileExposure = score(input.public_profile_exposure);
  const socialSignalDensity = score(input.social_signal_density);
  const mediaExposure = score(input.media_exposure);
  const voicePresence = score(input.voice_presence);
  const videoPresence = score(input.video_presence);
  const behaviorPattern = score(input.behavior_pattern, 75);
  const evidenceStrength = score(input.evidence_chain_strength, 70);
  const hpg = score(input.hpg, 75);
  const originDna = score(input.origin_dna, 70);
  const realityChain = score(input.reality_chain, 70);
  const trustTimeline = score(input.trust_timeline, 70);
  const trustGraph = score(input.trust_graph, 65);
  const agentActivity = score(input.agent_activity, 30);
  const identityExposure = clampScore(
    publicProfileExposure * 0.28 +
      socialSignalDensity * 0.22 +
      mediaExposure * 0.26 +
      voicePresence * 0.12 +
      videoPresence * 0.12
  );
  const realityResilience = clampScore(
    hpg * 0.24 +
      originDna * 0.2 +
      realityChain * 0.18 +
      trustTimeline * 0.16 +
      behaviorPattern * 0.12 +
      evidenceStrength * 0.1
  );
  const cloneComplexity = clampScore(
    realityResilience * 0.55 +
      evidenceStrength * 0.25 +
      trustGraph * 0.12 +
      (100 - agentActivity) * 0.08
  );
  const impersonationProbability = clampScore(
    identityExposure * 0.52 +
      (100 - cloneComplexity) * 0.32 +
      (100 - realityResilience) * 0.16
  );
  const syntheticCloneRisk = clampScore(
    impersonationProbability * 0.72 + identityExposure * 0.28
  );
  const state = riskState(syntheticCloneRisk);
  const recommendations = [
    ...(state === "high" || state === "critical" || state === "elevated"
      ? ["Require step-up", "Increase evidence", "Enable Origin DNA"]
      : ["Monitor exposure"]),
    ...(realityResilience < 75 ? ["Increase HPG frequency"] : []),
  ];

  return {
    synthetic_clone_risk: syntheticCloneRisk,
    reality_resilience: realityResilience,
    identity_exposure: identityExposure,
    clone_complexity: cloneComplexity,
    impersonation_probability: impersonationProbability,
    risk_state: state,
    recommendations,
  };
}

export const demoSyntheticCounterpartInput: SyntheticCounterpartInput = {
  hpg: 88,
  origin_dna: 82,
  reality_chain: 78,
  trust_timeline: 86,
  trust_graph: 73,
  voice_presence: 90,
  video_presence: 63,
  behavior_pattern: 91,
  public_profile_exposure: 88,
  social_signal_density: 78,
  media_exposure: 72,
  agent_activity: 35,
  evidence_chain_strength: 86,
};

export const demoSyntheticCounterpartResult = evaluateSyntheticCounterpart(
  demoSyntheticCounterpartInput
);
