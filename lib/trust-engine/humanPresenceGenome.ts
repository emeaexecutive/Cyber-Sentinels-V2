export const hpgSignals = [
  "face_presence",
  "voice_presence",
  "typing_pattern",
  "movement_pattern",
  "response_behavior",
  "decision_pattern",
  "device_pattern",
  "location_pattern",
  "interaction_pattern",
  "liveness_pattern",
  "retina_future",
  "fingerprint_future",
  "dna_future",
  "behavioral_signature",
  "social_signal",
  "meeting_pattern",
  "trust_timeline_signal",
] as const;

export const hpgStates = [
  "stable",
  "drifting",
  "anomalous",
  "under_review",
  "critical",
] as const;

export const hpgSignalEvents = [
  "hpg_created",
  "presence_shift_detected",
  "behavioral_drift_detected",
  "synthetic_deviation_detected",
] as const;

export const hpgAuditEvents = [
  "human_presence_genome_created",
  "presence_recalculated",
] as const;

export type HPGState = (typeof hpgStates)[number];

export type HumanPresenceGenomeInput = {
  face?: number | null;
  voice?: number | null;
  behavior?: number | null;
  timeline?: number | null;
  interaction?: number | null;
};

export type HumanPresenceGenomeResult = {
  presence_confidence: number;
  presence_stability: number;
  human_signature: string;
  reality_alignment: number;
  synthetic_deviation: number;
  state: HPGState;
  recommended_action: "allow" | "monitor" | "step_up_required" | "manual_review";
};

export type HumanPresenceGenomeDemo = HumanPresenceGenomeInput & {
  id: string;
  subject_name: string;
  timeline_changes: string[];
  related_evidence: string[];
  presence_drift: string;
};

const weights = {
  face: 0.22,
  voice: 0.2,
  behavior: 0.26,
  timeline: 0.18,
  interaction: 0.14,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreOrDefault(value: number | null | undefined, fallback = 70) {
  return typeof value === "number" && Number.isFinite(value)
    ? clampScore(value)
    : fallback;
}

type NormalizedHPGInput = {
  face: number;
  voice: number;
  behavior: number;
  timeline: number;
  interaction: number;
};

function signatureFrom(input: NormalizedHPGInput) {
  const compact = [
    input.face,
    input.voice,
    input.behavior,
    input.timeline,
    input.interaction,
  ]
    .map((value) => value.toString(36).padStart(2, "0"))
    .join("");

  return `hpg_${compact}`;
}

export function overallPresenceGenome(
  input: HumanPresenceGenomeInput
): HumanPresenceGenomeResult {
  const normalized = {
    face: scoreOrDefault(input.face),
    voice: scoreOrDefault(input.voice),
    behavior: scoreOrDefault(input.behavior),
    timeline: scoreOrDefault(input.timeline),
    interaction: scoreOrDefault(input.interaction),
  };
  const presenceConfidence = clampScore(
    normalized.face * weights.face +
      normalized.voice * weights.voice +
      normalized.behavior * weights.behavior +
      normalized.timeline * weights.timeline +
      normalized.interaction * weights.interaction
  );
  const scores = Object.values(normalized);
  const spread = Math.max(...scores) - Math.min(...scores);
  const presenceStability = clampScore(100 - spread * 1.2);
  const syntheticDeviation = clampScore(
    (100 - presenceConfidence) * 0.55 + spread * 0.45
  );
  const realityAlignment = clampScore(
    (presenceConfidence + presenceStability + (100 - syntheticDeviation)) / 3
  );
  const state: HPGState =
    syntheticDeviation >= 70 || presenceConfidence < 45
      ? "critical"
      : syntheticDeviation >= 50 || presenceStability < 55
        ? "anomalous"
        : syntheticDeviation >= 30 || presenceStability < 70
          ? "drifting"
          : presenceConfidence < 75
            ? "under_review"
            : "stable";
  const recommendedAction =
    state === "critical"
      ? "manual_review"
      : state === "anomalous"
        ? "step_up_required"
        : state === "drifting" || state === "under_review"
          ? "monitor"
          : "allow";

  return {
    presence_confidence: presenceConfidence,
    presence_stability: presenceStability,
    human_signature: signatureFrom(normalized),
    reality_alignment: realityAlignment,
    synthetic_deviation: syntheticDeviation,
    state,
    recommended_action: recommendedAction,
  };
}

export const demoHumanPresenceGenome: HumanPresenceGenomeDemo = {
  id: "hpg-demo-candidate",
  subject_name: "Verified candidate session",
  face: 91,
  voice: 88,
  behavior: 94,
  timeline: 93,
  interaction: 90,
  timeline_changes: [
    "Trust Timeline consistency 93",
    "Meeting cadence stable",
    "Device pattern consistent",
    "Response behavior unchanged",
  ],
  related_evidence: [
    "/evidence-vault",
    "/trust-timeline",
    "/origin-dna",
    "/reality-chain",
  ],
  presence_drift: "Low",
};

export const demoHumanPresenceGenomeResult =
  overallPresenceGenome(demoHumanPresenceGenome);
