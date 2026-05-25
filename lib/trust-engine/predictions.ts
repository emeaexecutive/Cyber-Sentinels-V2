export type PredictionState = "stable" | "watch" | "elevated" | "critical";

export type PredictionInputPassport = {
  trust_score?: number | null;
  human_presence_index?: number | null;
  origin_trace_score?: number | null;
  synthetic_risk?: number | null;
  voice_clone_risk?: number | null;
  video_deepfake_risk?: number | null;
  review_status: string | null;
  linkedin_verification_status?: string | null;
};

export type PredictionInputSignal = {
  event: string;
  created_at?: string | null;
};

export type PredictionInputAuditLog = {
  event_type: string;
  created_at?: string | null;
};

export type PredictionInputDecision = {
  decision: string | null;
  status: string | null;
  created_at?: string | null;
};

export type PredictionSources = {
  passports?: PredictionInputPassport[] | null;
  signals?: PredictionInputSignal[] | null;
  auditLogs?: PredictionInputAuditLog[] | null;
  decisions?: PredictionInputDecision[] | null;
};

export type TrustPrediction = {
  score: number;
  state: PredictionState;
  riskDirection: "improving" | "flat" | "rising" | "surging";
  trend: string;
  factors: string[];
  recentTrustChanges: string[];
  recommendedActions: string[];
  signals: string[];
  isDemo: boolean;
};

const recommendations = {
  evidence: "Request more evidence",
  review: "Trigger manual review",
  monitor: "Increase monitoring",
  escalate: "Escalate verification",
  hpi: "Recalculate Human Presence Index™",
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stateFromScore(score: number): PredictionState {
  if (score >= 85) return "critical";
  if (score >= 60) return "elevated";
  if (score >= 30) return "watch";

  return "stable";
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function createDemoPrediction(): TrustPrediction {
  return {
    score: 41,
    state: "watch",
    riskDirection: "rising",
    trend: "Trust drift detected across demo signals.",
    factors: [
      "Trust drift detected",
      "Reality Drift high",
      "HPG instability detected",
      "Clone risk elevated",
      "Origin Trace weakening",
      "Repeated manual reviews",
    ],
    recentTrustChanges: [
      "Trust Score: 92 → 88",
      "Human Presence: 87 → 82",
      "Origin Trace: 61 → 55",
    ],
    recommendedActions: [
      recommendations.evidence,
      recommendations.monitor,
      recommendations.hpi,
    ],
    signals: [
      "Trust drift detected",
      "Reality drift detected",
      "Human Presence Genome instability",
      "Synthetic clone risk detected",
      "Behavior anomaly forecast",
      "Synthetic escalation forecast",
    ],
    isDemo: true,
  };
}

export function predictTrustRisk(sources: PredictionSources): TrustPrediction {
  const passports = sources.passports ?? [];
  const signals = sources.signals ?? [];
  const auditLogs = sources.auditLogs ?? [];
  const decisions = sources.decisions ?? [];

  if (
    !passports.length &&
    !signals.length &&
    !auditLogs.length &&
    !decisions.length
  ) {
    return createDemoPrediction();
  }

  const factors: string[] = [];
  const recentTrustChanges: string[] = [];
  const emittedSignals: string[] = [];
  let score = 12;

  const averageHpi = average(
    passports
      .map((passport) => passport.human_presence_index)
      .filter((value): value is number => typeof value === "number")
  );
  const averageOrigin = average(
    passports
      .map((passport) => passport.origin_trace_score)
      .filter((value): value is number => typeof value === "number")
  );
  const averageTrust = average(
    passports
      .map((passport) => passport.trust_score)
      .filter((value): value is number => typeof value === "number")
  );
  const maxSyntheticRisk = Math.max(
    0,
    ...passports.map((passport) => passport.synthetic_risk ?? 0)
  );
  const maxVoiceRisk = Math.max(
    0,
    ...passports.map((passport) => passport.voice_clone_risk ?? 0)
  );
  const maxVideoRisk = Math.max(
    0,
    ...passports.map((passport) => passport.video_deepfake_risk ?? 0)
  );
  const manualReviews =
    passports.filter((passport) =>
      ["pending", "in_review", "manual_review"].includes(
        passport.review_status ?? ""
      )
    ).length +
    decisions.filter((decision) =>
      ["manual_review", "needs_more_evidence"].includes(decision.decision ?? "")
    ).length;
  const linkedInMismatchCount = passports.filter((passport) =>
    ["mismatch", "manual_review"].includes(
      passport.linkedin_verification_status ?? ""
    )
  ).length;
  const riskSignalCount = signals.filter((signal) =>
    /(drift|anomaly|risk|deepfake|mismatch|weak|escalat)/i.test(signal.event)
  ).length;
  const realityDriftSignalCount = signals.filter((signal) =>
    /reality_drift|reality drift|origin_confidence|reality_chain/i.test(
      signal.event
    )
  ).length;
  const hpgSignalCount = signals.filter((signal) =>
    /hpg|presence_shift|behavioral_drift|synthetic_deviation/i.test(
      signal.event
    )
  ).length;
  const cloneRiskSignalCount = signals.filter((signal) =>
    /clone_risk|synthetic_clone|identity_exposure|reality_twin/i.test(
      signal.event
    )
  ).length;
  const reviewAuditCount = auditLogs.filter((log) =>
    /review|decision|verification/i.test(log.event_type)
  ).length;

  if (averageHpi !== null && averageHpi < 70) {
    score += 18;
    factors.push("Human Presence falling");
    emittedSignals.push("Behavior anomaly forecast");
    recentTrustChanges.push(`Human Presence: 87 → ${Math.round(averageHpi)}`);
  }

  if (averageOrigin !== null && averageOrigin < 65) {
    score += 18;
    factors.push("Origin Trace weakening");
    emittedSignals.push("Trust drift detected");
    recentTrustChanges.push(`Origin Trace: 61 → ${Math.round(averageOrigin)}`);
  }

  if (averageTrust !== null && averageTrust < 70) {
    score += 12;
    factors.push("Trust drift detected");
    emittedSignals.push("Trust drift detected");
    recentTrustChanges.push(`Trust Score: 92 → ${Math.round(averageTrust)}`);
  }

  if (maxSyntheticRisk >= 50 || maxVoiceRisk >= 45 || maxVideoRisk >= 45) {
    score += 20;
    factors.push("Deepfake probability increasing");
    emittedSignals.push("Synthetic escalation forecast");
  }

  if (manualReviews >= 2) {
    score += 12;
    factors.push("Repeated manual reviews");
  }

  if (linkedInMismatchCount > 0) {
    score += 14;
    factors.push("LinkedIn mismatch emerging");
  }

  if (riskSignalCount >= 2) {
    score += 12;
    factors.push("Verification anomalies increasing");
    emittedSignals.push("Prediction escalated");
  }

  if (realityDriftSignalCount > 0) {
    score += 16;
    factors.push("Reality Drift high");
    emittedSignals.push("Reality drift detected");
    recentTrustChanges.push("Reality Drift: low → high");
  }

  if (hpgSignalCount > 0) {
    score += 14;
    factors.push("HPG instability detected");
    emittedSignals.push("Human Presence Genome instability");
    recentTrustChanges.push("HPG: stable → drifting");
  }

  if (cloneRiskSignalCount > 0) {
    score += 18;
    factors.push("Clone risk elevated");
    emittedSignals.push("Synthetic clone risk detected");
    recentTrustChanges.push("Clone Risk: watch → elevated");
  }

  if (reviewAuditCount >= 4) {
    score += 8;
    factors.push("Review history indicates elevated scrutiny");
  }

  const predictionScore = clampScore(score);
  const state = stateFromScore(predictionScore);
  const riskDirection =
    predictionScore >= 85
      ? "surging"
      : predictionScore >= 55
        ? "rising"
        : predictionScore >= 30
          ? "flat"
          : "improving";
  const recommendedActions = unique([
    ...(predictionScore >= 30 ? [recommendations.monitor] : []),
    ...(manualReviews || linkedInMismatchCount ? [recommendations.review] : []),
    ...(predictionScore >= 55 ? [recommendations.evidence, recommendations.hpi] : []),
    ...(predictionScore >= 80 ? [recommendations.escalate] : []),
  ]);

  return {
    score: predictionScore,
    state,
    riskDirection,
    trend:
      factors[0] ??
      (state === "stable"
        ? "Trust state remains stable."
        : "Emerging trust risk detected."),
    factors: unique(factors.length ? factors : ["No major trust decay detected"]),
    recentTrustChanges: recentTrustChanges.length
      ? unique(recentTrustChanges)
      : ["Trust Score: stable", "Human Presence: stable", "Origin Trace: stable"],
    recommendedActions: recommendedActions.length
      ? recommendedActions
      : [recommendations.monitor],
    signals: unique(
      emittedSignals.length
        ? emittedSignals
        : ["Trust drift detected", "Behavior anomaly forecast"]
    ),
    isDemo: false,
  };
}
