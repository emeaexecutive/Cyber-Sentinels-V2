export const interviewRiskSignalTypes = [
  "liveness_pending",
  "identity_conflict",
  "suspicious_behavior",
  "location_risk",
  "device_risk",
  "proxy_candidate_risk",
  "voice_mismatch_placeholder",
] as const;

export const interviewSessionStatuses = [
  "scheduled",
  "active",
  "in_review",
  "verified",
  "escalated",
  "closed",
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

export function confidenceLevel(score?: number | null) {
  const value = Number(score ?? 0);
  if (value >= 80) return "high";
  if (value >= 50) return "medium";
  if (value > 0) return "low";
  return "unknown";
}

export function hiringSignalExplanation(signalType?: string | null) {
  const normalized = String(signalType ?? "interview_signal");

  const explanations: Record<string, string> = {
    liveness_pending:
      "Liveness review is pending. This is a placeholder workflow state, not a detection result.",
    identity_conflict:
      "Identity information may need reviewer confirmation before the interview workflow is trusted.",
    suspicious_behavior:
      "Behavioral context was flagged for human review. No automated conclusion is made.",
    location_risk:
      "Location context may require operational review against hiring policy.",
    device_risk:
      "Device or session provenance may require reviewer confirmation.",
    proxy_candidate_risk:
      "The workflow may need reviewer confirmation that the interviewed person matches the candidate record.",
    voice_mismatch_placeholder:
      "Voice mismatch review is a placeholder interface only and does not claim detection accuracy.",
  };

  return explanations[normalized] ?? "Interview integrity signal recorded for explainable human review.";
}
