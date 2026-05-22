import { calculateHumanPresenceIndex } from "@/lib/human-presence-index";

export type HumanPresenceInput = {
  biometricConfidence: number;
  behaviouralConsistency: number;
  livenessScore: number;
  imageAuthenticityScore: number;
  trustTimelineScore: number;
  voiceCloneRisk: number;
  videoDeepfakeRisk: number;
  syntheticRisk: number;
};

export function calculateHumanPresence(input: HumanPresenceInput) {
  return calculateHumanPresenceIndex(input);
}
