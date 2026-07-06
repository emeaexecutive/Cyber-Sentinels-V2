import type {
  DetectionExpectedOutcome,
  DetectionSource,
  ValidationCase,
  ValidationResult,
} from "../validation/validation-case.ts";

const WEIGHTS: Record<string, number> = {
  metadataMissing: 0.12,
  repeatedVerificationAttempts: 0.14,
  repeatedVerificationFailures: 0.14,
  deviceSessionMismatch: 0.18,
  behavioralInconsistency: 0.16,
  impossibleSessionVelocity: 0.2,
  impossibleWorkflowVelocity: 0.2,
  virtualCameraIndicator: 0.2,
  provenanceConflict: 0.22,
  documentMismatch: 0.24,
  agentActionAnomaly: 0.2,
  agentRuntimeAnomaly: 0.2,
};

export type BaselineScore = {
  score: number;
  outcome: DetectionExpectedOutcome;
  source: Extract<DetectionSource, "baseline_model_assisted" | "heuristic_baseline">;
  confidence: number;
  evidence: string[];
  limitations: string[];
};

export function runBaselineDetection(
  signals: ValidationCase["signals"],
  mode: "assisted" | "heuristic" = "heuristic"
): BaselineScore {
  const evidence = Object.entries(WEIGHTS)
    .filter(([key]) => signals[key] === true)
    .map(([key]) => key);
  const score = Math.min(1, evidence.reduce((total, key) => total + WEIGHTS[key], 0));
  const outcome: DetectionExpectedOutcome =
    score >= 0.45 ? "positive" : score >= 0.2 ? "review" : "negative";

  return {
    score,
    outcome,
    source: mode === "assisted" ? "baseline_model_assisted" : "heuristic_baseline",
    confidence: Number(Math.max(0.5, score).toFixed(3)),
    evidence,
    limitations: [
      "Explainable weighted baseline; not trained machine learning.",
      "Requires representative validation before production threshold claims.",
    ],
  };
}

export function baselineResult(testCase: ValidationCase): ValidationResult {
  const result = runBaselineDetection(testCase.signals);
  return {
    caseId: testCase.id,
    expected: testCase.expectedOutcome,
    actual: result.outcome,
    source: result.source,
    confidence: result.confidence,
    evidence: result.evidence,
    limitations: result.limitations,
  };
}
