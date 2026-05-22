type OriginTraceSignals = {
  attributionConfidence: number;
  modelFingerprintRisk: number;
  metadataIntegrity: string;
  watermarkStatus: string;
  c2paStatus: string;
  uploadChainStatus: string;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusScore(value: string) {
  if (value === "verified" || value === "intact" || value === "found") {
    return 90;
  }

  if (value === "missing" || value === "stripped" || value === "not_found") {
    return 20;
  }

  if (value === "tampered" || value === "broken") {
    return 10;
  }

  return 50;
}

export function calculateOriginTraceScore(signals: OriginTraceSignals) {
  return clampScore(
    signals.attributionConfidence * 0.3 +
      statusScore(signals.metadataIntegrity) * 0.2 +
      statusScore(signals.watermarkStatus) * 0.15 +
      statusScore(signals.c2paStatus) * 0.15 +
      statusScore(signals.uploadChainStatus) * 0.1 -
      signals.modelFingerprintRisk * 0.1
  );
}

export function requiresAttributionReview(signals: OriginTraceSignals) {
  return (
    signals.attributionConfidence < 50 ||
    signals.metadataIntegrity === "stripped" ||
    signals.metadataIntegrity === "tampered" ||
    signals.watermarkStatus === "not_found" ||
    signals.c2paStatus === "missing" ||
    signals.modelFingerprintRisk > 70
  );
}
