import {
  demoSyntheticCounterpartInput,
  evaluateSyntheticCounterpart,
  type CloneRiskState,
  type SyntheticCounterpartInput,
  type SyntheticCounterpartResult,
} from "@/lib/trust-engine/syntheticCounterpart";

export type RealityTwinProfile = {
  id: string;
  subject_name: string;
  subject_type: "human" | "candidate" | "ai_agent" | "company" | "creator";
  public_interviews: "low" | "medium" | "high";
  voice_exposure: "low" | "medium" | "high";
  video_exposure: "low" | "medium" | "high";
  evidence_strength: "low" | "medium" | "high";
  inputs: SyntheticCounterpartInput;
  result: SyntheticCounterpartResult;
};

export type RealityTwinAnalysis = {
  clone_risk: CloneRiskState;
  reality_resilience: "weak" | "moderate" | "strong";
  recommendations: string[];
};

export type RealityTwinResult = Omit<
  SyntheticCounterpartResult,
  "reality_resilience"
> &
  RealityTwinAnalysis & {
    reality_resilience_score: number;
  };

function resilienceBand(value: number): RealityTwinAnalysis["reality_resilience"] {
  if (value >= 78) return "strong";
  if (value >= 58) return "moderate";

  return "weak";
}

export function createRealityTwin(
  input: SyntheticCounterpartInput
): RealityTwinResult {
  const result = evaluateSyntheticCounterpart(input);

  return {
    ...result,
    reality_resilience_score: result.reality_resilience,
    clone_risk: result.risk_state,
    reality_resilience: resilienceBand(result.reality_resilience),
    recommendations: result.recommendations,
  };
}

export const demoRealityTwin: RealityTwinProfile = {
  id: "reality-twin-founder-demo",
  subject_name: "Founder public trust profile",
  subject_type: "human",
  public_interviews: "high",
  voice_exposure: "high",
  video_exposure: "medium",
  evidence_strength: "high",
  inputs: demoSyntheticCounterpartInput,
  result: evaluateSyntheticCounterpart(demoSyntheticCounterpartInput),
};

export const demoRealityTwinAnalysis = createRealityTwin(
  demoRealityTwin.inputs
);
