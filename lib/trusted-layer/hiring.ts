export const interviewRiskSignalTypes = [
  "liveness_pending",
  "voice_check_pending",
  "webcam_check_pending",
  "identity_match_pending",
  "location_risk_pending",
  "device_risk_pending",
] as const;

export type HiringScoreInput = {
  highRiskIdentity?: boolean;
  livenessUnresolved?: boolean;
  voiceMismatch?: boolean;
  webcamAnomaly?: boolean;
  suspiciousDeviceOrLocation?: boolean;
};

export function riskLevelFromHiringScore(score: number) {
  if (score >= 85) return "low";
  if (score >= 70) return "moderate";
  if (score >= 50) return "needs_review";
  return "high";
}

export function calculateHiringTrustScore(input: HiringScoreInput) {
  let score = 100;
  const reasons: string[] = [];

  if (input.highRiskIdentity) {
    score -= 15;
    reasons.push("High-risk identity flag");
  }

  if (input.livenessUnresolved) {
    score -= 10;
    reasons.push("Liveness unresolved");
  }

  if (input.voiceMismatch) {
    score -= 10;
    reasons.push("Voice mismatch flag");
  }

  if (input.webcamAnomaly) {
    score -= 10;
    reasons.push("Webcam anomaly flag");
  }

  if (input.suspiciousDeviceOrLocation) {
    score -= 10;
    reasons.push("Suspicious device or location flag");
  }

  const finalScore = Math.max(0, score);

  return {
    score: finalScore,
    risk_level: riskLevelFromHiringScore(finalScore),
    reasons: reasons.length ? reasons : ["No high-risk placeholder flags detected"],
  };
}
