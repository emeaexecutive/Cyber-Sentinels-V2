import type { DetectionSource } from "@/lib/detection/detection-engine";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { baselineResult } from "../detection/baseline-model.ts";
import { fuseTrustSignals } from "../detection/signal-fusion.ts";
import type { DetectionProvider } from "../detection/providers/types.ts";
import { buildReviewedOutcomeRecords, summarizeReviewedOutcomes } from "../governance/reviewed-outcomes.ts";
import { evaluateRuntimeTrust, type RuntimeSignalKey } from "../runtime/runtime-trust-engine.ts";
import { evaluateIntentRisk } from "../trust/intent-risk.ts";
import { evaluateCalibrationReadiness } from "./calibration-engine.ts";
import { buildDatasetCoverageReport } from "./dataset-manager.ts";
import { calculateDatasetReadiness, inspectDatasetRegistry } from "./dataset-registry.ts";
import {
  buildGroundTruthDatasetRegistry,
  computeGroundTruthValidation,
  summarizeDatasetRegistry,
  summarizeGroundTruth,
  type GroundTruthRecord,
} from "./ground-truth.ts";
import type {
  ConfusionMatrix,
  PrecisionRecallMetrics,
  ReviewerAgreement,
  ValidationCase,
  ValidationResult,
} from "./validation-case.ts";

export type ExpectedOutcome = "allow" | "review" | "block" | "no_signal";
export type ProviderStatus =
  | "Live"
  | "Simulated"
  | "Awaiting Credentials"
  | "Disabled";
export type ReviewOutcome =
  | "pending"
  | "agreed"
  | "disagreed"
  | "not_reviewed";
export type BenchmarkCaseCategory =
  | "real_session"
  | "fake_session"
  | "synthetic_identity"
  | "virtual_camera"
  | "document_fraud"
  | "suspicious_agent_behavior"
  | "normal_agent_behavior"
  | "normal_workflow";
export type GovernanceOutcome =
  | "approved"
  | "escalated"
  | "blocked"
  | "more_evidence_required"
  | "pending";
export type ReviewerOverride = {
  applied: boolean;
  reviewerId?: string;
  reason?: string;
  previousOutcome?: ExpectedOutcome;
  finalOutcome?: ExpectedOutcome;
};

export const MINIMUM_CALIBRATION_SAMPLE_THRESHOLD = 30;

export type ReleaseValidationMaturityState =
  | "Implemented"
  | "Simulated"
  | "Awaiting Dataset"
  | "Awaiting Review";

export type ReleaseValidationCapability = {
  id:
    | "calibration_reports"
    | "benchmark_summaries"
    | "reviewed_outcome_statistics"
    | "confidence_calibration"
    | "provider_agreement_analysis";
  label: string;
  state: ReleaseValidationMaturityState;
  evidence: string;
  blocker: string;
  nextAction: string;
};

export function buildReleaseValidationMaturity(input: {
  caseCount: number;
  reviewedCaseCount: number;
  providerResultCount: number;
  calibrationComplete: boolean;
  simulationOnly: boolean;
}): ReleaseValidationCapability[] {
  const datasetState = (): ReleaseValidationMaturityState => {
    if (!input.caseCount) return "Awaiting Dataset";
    if (input.simulationOnly) return "Simulated";
    if (!input.reviewedCaseCount) return "Awaiting Review";
    return input.calibrationComplete ? "Implemented" : "Awaiting Dataset";
  };
  const reviewedState: ReleaseValidationMaturityState = !input.caseCount
    ? "Awaiting Dataset"
    : input.simulationOnly
      ? "Simulated"
      : input.reviewedCaseCount
        ? "Implemented"
        : "Awaiting Review";
  const providerState: ReleaseValidationMaturityState = !input.caseCount || !input.providerResultCount
    ? "Awaiting Dataset"
    : input.simulationOnly
      ? "Simulated"
      : input.reviewedCaseCount
        ? "Implemented"
        : "Awaiting Review";
  const sampleEvidence = `${input.caseCount}/${MINIMUM_CALIBRATION_SAMPLE_THRESHOLD} labelled case(s); ${input.reviewedCaseCount} reviewed case(s).`;

  return [
    {
      id: "calibration_reports",
      label: "Calibration reports",
      state: datasetState(),
      evidence: sampleEvidence,
      blocker: input.calibrationComplete ? "No release blocker in the current dataset scope." : "Calibration incomplete - insufficient reviewed ground truth.",
      nextAction: "Reach the reviewed sample and quality gates, then publish a dataset-versioned report.",
    },
    {
      id: "benchmark_summaries",
      label: "Benchmark summaries",
      state: reviewedState,
      evidence: `${input.caseCount} labelled case(s) are available to the benchmark harness.`,
      blocker: input.reviewedCaseCount ? "Results remain valid only for the named dataset." : "Human review is required before benchmark results can support release claims.",
      nextAction: "Run the versioned benchmark after reviewer adjudication and retain the audit envelope.",
    },
    {
      id: "reviewed_outcome_statistics",
      label: "Reviewed-outcome statistics",
      state: reviewedState,
      evidence: `${input.reviewedCaseCount} reviewed outcome(s) are available.`,
      blocker: input.reviewedCaseCount ? "More adjudicated false-positive and false-negative cases are required for broader conclusions." : "No reviewed outcomes are available.",
      nextAction: "Attach accountable reviewer outcomes and override reasons to validation cases.",
    },
    {
      id: "confidence_calibration",
      label: "Confidence calibration",
      state: datasetState(),
      evidence: `${sampleEvidence} Confidence bands are calculated only from supplied results.`,
      blocker: input.calibrationComplete ? "Confidence remains dataset-scoped." : "Confidence calibration cannot be declared complete before the calibration gate passes.",
      nextAction: "Compare predicted confidence with reviewed agreement by confidence band.",
    },
    {
      id: "provider_agreement_analysis",
      label: "Provider agreement analysis",
      state: providerState,
      evidence: `${input.providerResultCount} normalized provider result(s) and ${input.reviewedCaseCount} reviewed outcome(s) are available.`,
      blocker: input.providerResultCount ? (input.reviewedCaseCount ? "Agreement remains provider- and dataset-specific." : "Provider outputs require reviewer comparison.") : "No provider result dataset is available.",
      nextAction: "Compare normalized provider results with the baseline and reviewed ground truth.",
    },
  ];
}

export type BenchmarkTestCase = {
  id: string;
  category: BenchmarkCaseCategory;
  description: string;
  expectedOutcome: ExpectedOutcome;
  detectionSource: DetectionSource;
  trustScoreBefore: number;
  trustScoreAfter: number;
  providerStatus: ProviderStatus;
  governanceOutcome: GovernanceOutcome;
  reviewerOutcome: ReviewOutcome;
  reviewerOverride: ReviewerOverride;
  falsePositive: boolean;
  falseNegative: boolean;
  latencyMs?: number;
  evidenceReferences?: string[];
};

function score(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Trust scores must be finite values from 0 to 100.");
  }
  return Math.round(value);
}

export class BenchmarkHarness {
  private readonly cases = new Map<string, BenchmarkTestCase>();

  register(testCase: BenchmarkTestCase) {
    if (!testCase.id.trim()) throw new Error("Benchmark test case id is required.");
    if (this.cases.has(testCase.id)) {
      throw new Error(`Benchmark test case already registered: ${testCase.id}`);
    }
    if (testCase.reviewerOverride.applied) {
      if (!testCase.reviewerOverride.reviewerId?.trim() || !testCase.reviewerOverride.reason?.trim()) {
        throw new Error("Reviewer overrides require an accountable reviewer and reason.");
      }
      if (!testCase.reviewerOverride.finalOutcome) {
        throw new Error("Reviewer overrides require a final outcome.");
      }
    }
    const normalized = {
      ...testCase,
      trustScoreBefore: score(testCase.trustScoreBefore),
      trustScoreAfter: score(testCase.trustScoreAfter),
      evidenceReferences: [...(testCase.evidenceReferences ?? [])],
    };
    this.cases.set(normalized.id, normalized);
    return normalized;
  }

  list() {
    return [...this.cases.values()];
  }

  summary() {
    const cases = this.list();
    return {
      total: cases.length,
      falsePositives: cases.filter((item) => item.falsePositive).length,
      falseNegatives: cases.filter((item) => item.falseNegative).length,
      reviewerAgreements: cases.filter((item) => item.reviewerOutcome === "agreed").length,
      reviewerOverrides: cases.filter((item) => item.reviewerOverride.applied).length,
      reviewerDisagreements: cases.filter((item) => item.reviewerOutcome === "disagreed").length,
      providerBacked: cases.filter((item) => item.detectionSource === "Provider API").length,
      escalationRate: cases.length
        ? cases.filter((item) => ["escalated", "blocked"].includes(item.governanceOutcome)).length / cases.length
        : null,
      averageTrustDrift: cases.length
        ? cases.reduce((total, item) => total + (item.trustScoreAfter - item.trustScoreBefore), 0) / cases.length
        : null,
      byCategory: Object.fromEntries(
        [...new Set(cases.map((item) => item.category))].map((category) => [
          category,
          cases.filter((item) => item.category === category).length,
        ])
      ),
    };
  }
}

export function createBenchmarkHarness() {
  return new BenchmarkHarness();
}

export function calculateConfusionMatrix(results: ValidationResult[]): ConfusionMatrix {
  return results.reduce<ConfusionMatrix>(
    (matrix, result) => {
      if (result.expected === "review" || result.actual === "review") matrix.reviewOnly += 1;
      else if (result.expected === "positive" && result.actual === "positive") matrix.truePositives += 1;
      else if (result.expected === "negative" && result.actual === "positive") matrix.falsePositives += 1;
      else if (result.expected === "negative" && result.actual === "negative") matrix.trueNegatives += 1;
      else if (result.expected === "positive" && result.actual === "negative") matrix.falseNegatives += 1;
      return matrix;
    },
    { truePositives: 0, falsePositives: 0, trueNegatives: 0, falseNegatives: 0, reviewOnly: 0 }
  );
}

export function calculatePrecisionRecall(matrix: ConfusionMatrix): PrecisionRecallMetrics {
  const precisionDenominator = matrix.truePositives + matrix.falsePositives;
  const recallDenominator = matrix.truePositives + matrix.falseNegatives;
  const precision = precisionDenominator ? matrix.truePositives / precisionDenominator : null;
  const recall = recallDenominator ? matrix.truePositives / recallDenominator : null;
  const f1 =
    precision !== null && recall !== null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;
  return { precision, recall, f1 };
}

function calculateRates(matrix: ConfusionMatrix) {
  const falsePositiveDenominator = matrix.falsePositives + matrix.trueNegatives;
  const falseNegativeDenominator = matrix.falseNegatives + matrix.truePositives;
  return {
    falsePositiveRate: falsePositiveDenominator ? matrix.falsePositives / falsePositiveDenominator : null,
    falseNegativeRate: falseNegativeDenominator ? matrix.falseNegatives / falseNegativeDenominator : null,
  };
}

function metricsByCategory(cases: ValidationCase[], results: ValidationResult[]) {
  const categories = [...new Set(cases.map((testCase) => String(testCase.datasetMetadata?.source ?? testCase.label)))];
  return Object.fromEntries(
    categories.map((category) => {
      const caseIds = new Set(
        cases
          .filter((testCase) => String(testCase.datasetMetadata?.source ?? testCase.label) === category)
          .map((testCase) => testCase.id)
      );
      const categoryResults = results.filter((result) => caseIds.has(result.caseId));
      const matrix = calculateConfusionMatrix(categoryResults);
      return [
        category,
        {
          caseCount: caseIds.size,
          resultCount: categoryResults.length,
          confusionMatrix: matrix,
          metrics: calculatePrecisionRecall(matrix),
          ...calculateRates(matrix),
        },
      ];
    })
  );
}

export function calculateReviewerAgreement(
  cases: ValidationCase[],
  results: ValidationResult[]
): ReviewerAgreement {
  const reviewed = cases.filter((testCase) => testCase.reviewerOutcome);
  const agreements = reviewed.filter((testCase) =>
    results.some(
      (result) =>
        result.caseId === testCase.id &&
        result.source === "heuristic_baseline" &&
        result.actual === testCase.reviewerOutcome
    )
  ).length;
  return {
    reviewedCases: reviewed.length,
    agreements,
    disagreements: reviewed.length - agreements,
    agreementRate: reviewed.length ? agreements / reviewed.length : null,
  };
}

function runtimeSignals(testCase: ValidationCase) {
  const aliases: Record<RuntimeSignalKey, string[]> = {
    deviceMismatch: ["deviceMismatch", "deviceSessionMismatch", "sessionInconsistency"],
    impossibleVelocity: ["impossibleVelocity", "impossibleWorkflowVelocity", "impossibleSessionVelocity"],
    suspiciousSessionChange: ["suspiciousSessionChange", "sessionAnomaly", "behavioralInconsistency"],
    repeatedFailedVerification: ["repeatedFailedVerification", "repeatedVerificationFailures"],
    provenanceConflict: ["provenanceConflict", "metadataMissing"],
    agentRuntimeAnomaly: ["agentRuntimeAnomaly", "agentActionAnomaly", "suspiciousRuntimeBehavior"],
    authorizationAnomaly: ["authorizationAnomaly"],
    virtualCameraIndicator: ["virtualCameraIndicator"],
    documentMismatch: ["documentMismatch", "documentConflict"],
  };
  return Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      names.some((name) => testCase.signals[name] === true),
    ])
  ) as Partial<Record<RuntimeSignalKey, boolean>>;
}

function confidenceCalibration(results: ValidationResult[]) {
  const bands = [
    { id: "low", min: 0, max: 0.5 },
    { id: "medium", min: 0.5, max: 0.8 },
    { id: "high", min: 0.8, max: 1.01 },
  ];
  return Object.fromEntries(
    bands.map((band) => {
      const members = results.filter(
        (result) => result.confidence >= band.min && result.confidence < band.max
      );
      return [
        band.id,
        {
          caseCount: members.length,
          averageConfidence: members.length
            ? members.reduce((total, result) => total + result.confidence, 0) / members.length
            : null,
          observedAgreement: members.length
            ? members.filter((result) => result.actual === result.expected).length / members.length
            : null,
        },
      ];
    })
  );
}

function benchmarkMaturity(input: {
  caseCount: number;
  providerResultCount: number;
  reviewerReviewedCases: number;
}) {
  const hasDataset = input.caseCount > 0;
  const hasProviderComparison = input.providerResultCount > 0;
  const hasReviewerReview = input.reviewerReviewedCases > 0;
  return {
    level: hasDataset && hasProviderComparison && hasReviewerReview ? 3 : hasDataset ? 2 : 1,
    label: hasDataset
      ? hasProviderComparison
        ? "Provider comparison and calibration in progress"
        : "Labelled validation baseline available"
      : "Validation dataset required",
    runtimeReplayValidation: hasDataset ? "available_on_run" : "unavailable_until_cases_exist",
    signalFusionComparison: hasDataset ? "available_on_run" : "unavailable_until_cases_exist",
    confidenceCalibration: hasDataset ? "available_on_run" : "unavailable_until_cases_exist",
    governanceOverrideTracking: hasDataset ? "available_on_run" : "unavailable_until_cases_exist",
    reviewerDisagreementTracking: hasReviewerReview ? "available_on_run" : "awaiting_reviewed_cases",
    trustDriftTracking: hasDataset ? "available_on_run" : "unavailable_until_cases_exist",
    boundary: "Benchmark metrics are scoped to approved labelled cases and must not be generalized beyond the dataset.",
  };
}

function rocPlaceholders() {
  return {
    available: false,
    auc: null as number | null,
    curve: [] as Array<{ threshold: number; truePositiveRate: number; falsePositiveRate: number }>,
    blocker: "ROC/AUC requires threshold sweeps across a reviewed dataset; no synthetic curve is generated.",
  };
}

function benchmarkHistory(input: { caseCount: number; datasetVersion: string; reviewedOutcomeCount: number }) {
  return {
    version: "benchmark-v1",
    datasetVersion: input.datasetVersion,
    caseCount: input.caseCount,
    reviewedOutcomeCount: input.reviewedOutcomeCount,
    generatedAt: new Date().toISOString(),
    previousVersions: [] as string[],
    boundary: "Benchmark history records comparable runs only; it does not imply production accuracy.",
  };
}

function groundTruthRecordsFromCases(
  cases: ValidationCase[],
  results: ValidationResult[]
): GroundTruthRecord[] {
  return cases.map((testCase) => {
    const primary =
      results.find((result) => result.caseId === testCase.id && result.source === "heuristic_baseline") ??
      results.find((result) => result.caseId === testCase.id) ??
      null;
    const reviewedOutcome = testCase.reviewerOutcome ?? testCase.governanceOverride?.outcome ?? null;
    const reviewStatus = reviewedOutcome
      ? "reviewed"
      : testCase.reviewerId || testCase.datasetMetadata?.reviewer
        ? "in_review"
        : "unreviewed";
    const providerAgreement =
      testCase.datasetMetadata?.providerAgreement === "agreed"
        ? 1
        : testCase.datasetMetadata?.providerAgreement === "disagreed"
          ? 0
          : null;
    const humanAgreement =
      reviewedOutcome && primary
        ? reviewedOutcome === primary.actual
          ? 1
          : 0
        : null;

    return {
      groundTruthId: `gt:${testCase.id}`,
      datasetId: String(testCase.datasetMetadata?.source ?? "unregistered"),
      reviewStatus,
      reviewSource: testCase.governanceOverride
        ? "internal_audit"
        : testCase.datasetMetadata?.source === "public_benchmark"
          ? "benchmark_panel"
          : testCase.datasetMetadata?.source === "synthetic"
            ? "synthetic_fixture"
            : "human_reviewer",
      reviewConfidence: Math.min(1, Math.max(0, testCase.datasetMetadata?.confidence ?? (reviewedOutcome ? 0.7 : 0.35))),
      labelVersion: "label-v1",
      datasetVersion: testCase.datasetMetadata?.source ? `${testCase.datasetMetadata.source}:v1` : "unregistered:v0",
      providerAgreement,
      humanAgreement,
      confidence: Math.min(1, Math.max(0, primary?.confidence ?? testCase.datasetMetadata?.confidence ?? 0.35)),
      expectedOutcome: testCase.expectedOutcome,
      systemOutcome: primary?.actual ?? null,
      reviewedOutcome,
      weighting: reviewedOutcome ? 1 : 0,
      trustPosture:
        testCase.governanceOverride || reviewedOutcome
          ? testCase.expectedOutcome === "positive"
            ? "weaken"
            : testCase.expectedOutcome === "review"
              ? "investigate"
              : "strengthen"
          : "hold",
    };
  });
}

export async function loadValidationCases(root = path.join(process.cwd(), "data", "validation")) {
  const cases: ValidationCase[] = [];
  async function visit(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.name.endsWith(".json")) {
        const parsed = JSON.parse(await readFile(target, "utf8")) as ValidationCase | ValidationCase[];
        cases.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      }
    }
  }
  await visit(root);
  return cases;
}

export async function runValidationBenchmark(options: {
  cases?: ValidationCase[];
  providers?: readonly DetectionProvider[];
} = {}) {
  const cases = options.cases ?? (await loadValidationCases());
  const registry = await inspectDatasetRegistry();
  const datasetReadiness = calculateDatasetReadiness({ cases, registry });
  const datasetCoverageReport = buildDatasetCoverageReport(cases);
  const groundTruthDatasetRegistry = buildGroundTruthDatasetRegistry();
  const groundTruthRecords = groundTruthRecordsFromCases(cases, []);
  const groundTruthSummary = summarizeGroundTruth(groundTruthRecords);
  const groundTruthValidation = computeGroundTruthValidation(groundTruthRecords);
  const groundTruthDatasetSummary = summarizeDatasetRegistry(groundTruthDatasetRegistry);
  if (!cases.length) {
    const emptyConfusionMatrix = calculateConfusionMatrix([]);
    const emptyMetrics = calculatePrecisionRecall(emptyConfusionMatrix);
    const calibrationStatus = evaluateCalibrationReadiness({
      sampleCount: 0,
      minimumSampleThreshold: MINIMUM_CALIBRATION_SAMPLE_THRESHOLD,
      metrics: emptyMetrics,
      confusionMatrix: emptyConfusionMatrix,
      reviewedOutcomeCount: 0,
      providerAgreement: null,
      perCategoryCount: 0,
      confidenceBandCount: 0,
      groundTruthQuality: 0,
      minimumGroundTruthQuality: 0.75,
      datasetVersion: datasetCoverageReport.datasetVersion,
      benchmarkVersion: "benchmark-schema-1",
    });
    const releaseMaturity = buildReleaseValidationMaturity({
      caseCount: 0,
      reviewedCaseCount: 0,
      providerResultCount: 0,
      calibrationComplete: false,
      simulationOnly: false,
    });
    return {
      caseCount: 0,
      message: "Validation incomplete — insufficient reviewed dataset.",
      calibrationStatus,
      releaseMaturity,
      datasetReadiness,
      datasetCoverageReport,
      roc: rocPlaceholders(),
      detectionSourcesUsed: [] as string[],
      results: [] as ValidationResult[],
      confusionMatrix: emptyConfusionMatrix,
      metrics: emptyMetrics,
      perCategoryMetrics: {},
      confidenceDistribution: { low: 0, medium: 0, high: 0 },
      providerAgreement: null,
      reviewerAgreement: calculateReviewerAgreement([], []),
      providerCoverage: 0,
      detectionSourceCoverage: {} as Record<string, number>,
      runtimeReplayValidation: [] as ValidationResult[],
      signalFusionComparison: [] as Array<Record<string, unknown>>,
      confidenceCalibration: confidenceCalibration([]),
      escalationRate: null,
      falsePositiveRate: null,
      falseNegativeRate: null,
      governanceOverrideTracking: { overrides: 0, reviewerDisagreements: 0 },
      reviewedOutcomeSummary: summarizeReviewedOutcomes([]),
      reviewedOutcomes: [],
      groundTruth: {
        records: groundTruthRecords,
        summary: groundTruthSummary,
        validation: groundTruthValidation,
        datasetRegistry: groundTruthDatasetRegistry,
        datasetSummary: groundTruthDatasetSummary,
      },
      trustDriftTracking: { average: null, cases: [] as Array<Record<string, unknown>> },
      falsePositiveCaseIds: [] as string[],
      falseNegativeCaseIds: [] as string[],
      benchmarkMaturity: benchmarkMaturity({
        caseCount: 0,
        providerResultCount: 0,
        reviewerReviewedCases: 0,
      }),
      benchmarkHistory: benchmarkHistory({
        caseCount: 0,
        datasetVersion: datasetCoverageReport.datasetVersion,
        reviewedOutcomeCount: 0,
      }),
      audit: {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        caseIds: [] as string[],
        sourcePolicy: "Source-specific results remain separate; review outcomes are non-final evidence.",
      },
      warnings: ["Metrics are unavailable until labelled validation cases are added."],
    };
  }

  const heuristicResults = cases.map(baselineResult);
  const providerResults = (
    await Promise.all(
      (options.providers ?? []).map(async (provider) =>
        Promise.all(cases.map((testCase) => provider.runDetection(testCase)))
      )
    )
  ).flat();
  const usableProviderResults = providerResults.filter((result) => result.source === "provider_api");
  const results = [...heuristicResults, ...usableProviderResults];
  const confusionMatrix = calculateConfusionMatrix(results);
  const rawMetrics = calculatePrecisionRecall(confusionMatrix);
  const rates = calculateRates(confusionMatrix);
  const agreements = usableProviderResults.filter((providerResult) => {
    const baseline = heuristicResults.find((result) => result.caseId === providerResult.caseId);
    return baseline?.actual === providerResult.actual;
  }).length;
  const reviewerAgreement = calculateReviewerAgreement(cases, heuristicResults);
  const reviewedOutcomes = buildReviewedOutcomeRecords(cases, results);
  const reviewedOutcomeSummary = summarizeReviewedOutcomes(reviewedOutcomes);
  const finalGroundTruthRecords = groundTruthRecordsFromCases(cases, results);
  const finalGroundTruthSummary = summarizeGroundTruth(finalGroundTruthRecords);
  const finalGroundTruthValidation = computeGroundTruthValidation(finalGroundTruthRecords);
  const providerAgreementScore = usableProviderResults.length ? agreements / usableProviderResults.length : null;
  const perCategoryMetrics = metricsByCategory(cases, results);
  const confidenceCalibrationBands = confidenceCalibration(results);
  const calibrationStatus = evaluateCalibrationReadiness({
    sampleCount: cases.length,
    minimumSampleThreshold: MINIMUM_CALIBRATION_SAMPLE_THRESHOLD,
    metrics: rawMetrics,
    confusionMatrix,
    reviewedOutcomeCount: reviewedOutcomeSummary.reviewed,
    providerAgreement: providerAgreementScore,
    perCategoryCount: Object.keys(perCategoryMetrics).length,
    confidenceBandCount: Object.values(confidenceCalibrationBands).filter((band) => band.caseCount > 0).length,
    groundTruthQuality: datasetCoverageReport.confidence,
    minimumGroundTruthQuality: 0.75,
    datasetVersion: datasetCoverageReport.datasetVersion,
    benchmarkVersion: "benchmark-schema-1",
  });
  const releaseMaturity = buildReleaseValidationMaturity({
    caseCount: cases.length,
    reviewedCaseCount: reviewedOutcomeSummary.reviewed,
    providerResultCount: usableProviderResults.length,
    calibrationComplete: calibrationStatus.complete,
    simulationOnly: cases.every((testCase) => testCase.datasetMetadata?.source === "synthetic"),
  });
  const runtimeEvaluations = cases.map((testCase) => ({
    testCase,
    runtime: evaluateRuntimeTrust({
      previousScore: 100,
      signals: runtimeSignals(testCase),
      evidenceReferences: testCase.sampleReference ? [testCase.sampleReference] : [],
    }),
  }));
  const runtimeReplayValidation: ValidationResult[] = runtimeEvaluations.map(({ testCase, runtime }) => {
    return {
      caseId: testCase.id,
      expected: testCase.expectedOutcome,
      actual: runtime.score < 45 ? "positive" : runtime.score < 80 ? "review" : "negative",
      source: "runtime_intelligence",
      confidence: runtime.confidence,
      evidence: runtime.weightedSignals.map((signal) => signal.key),
      limitations: runtime.limitations,
    };
  });
  const signalFusionComparison = cases.map((testCase) => {
    const baseline = heuristicResults.find((result) => result.caseId === testCase.id)!;
    const runtime = runtimeReplayValidation.find((result) => result.caseId === testCase.id)!;
    const intentRisk = evaluateIntentRisk({
      actorType: testCase.intent?.actorType ?? (testCase.signals.suspiciousAgentRuntimeBehavior ? "agent" : "workflow"),
      actionType: testCase.intent?.actionType ?? String(testCase.signals.actionType ?? "workflow_action"),
      declaredIntent: testCase.intent?.declaredIntent ?? String(testCase.signals.declaredIntent ?? "Validation case replay"),
      expectedPermission: testCase.intent?.expectedPermission ?? String(testCase.signals.expectedPermission ?? "declared_scope"),
      actualPermission: testCase.intent?.actualPermission ?? String(testCase.signals.actualPermission ?? "declared_scope"),
      dataSensitivity: testCase.dataClassification,
      workflowCriticality: testCase.signals.workflowCriticality === "critical" ? "critical" : "medium",
      anomalyReason: runtime.evidence.join(", "),
      delegatedAuthorityActive: testCase.signals.delegatedAuthorityActive !== false,
      humanOwnerPresent: testCase.signals.humanOwnerPresent !== false,
      actionBeforeExecution: true,
    });
    const fusion = fuseTrustSignals({
      signals: [
        {
          id: `${testCase.id}:baseline`,
          source: "Heuristic Baseline",
          risk: baseline.actual === "positive" ? 1 : baseline.actual === "review" ? 0.5 : 0,
          confidence: baseline.confidence,
          evidence: baseline.evidence,
          limitations: baseline.limitations,
        },
        {
          id: `${testCase.id}:runtime`,
          source: "Runtime Intelligence",
          risk: runtime.actual === "positive" ? 1 : runtime.actual === "review" ? 0.5 : 0,
          confidence: runtime.confidence,
          evidence: runtime.evidence,
          limitations: runtime.limitations,
        },
      ],
      reviewerOutcome:
        testCase.reviewerOutcome === "positive"
          ? "block"
          : testCase.reviewerOutcome === "negative"
            ? "allow"
            : testCase.reviewerOutcome === "review"
            ? "review"
            : null,
      providerAgreement: providerAgreementScore,
      intentRisk,
      sessionIntegrityRisk: runtime.actual === "positive" ? 1 : runtime.actual === "review" ? 0.5 : 0,
    });
    return {
      caseId: testCase.id,
      expected: testCase.expectedOutcome,
      recommendation: fusion.recommendation,
      confidence: fusion.confidence,
      intentRisk: {
        riskScore: intentRisk.riskScore,
        riskBand: intentRisk.riskBand,
        recommendation: intentRisk.recommendation,
      },
      evidenceSummary: fusion.evidenceSummary,
      escalationReason: fusion.escalationReason,
      limitations: fusion.limitations,
    };
  });
  const positiveCases = results.filter((result) => result.expected === "positive").length;
  const negativeCases = results.filter((result) => result.expected === "negative").length;
  const falsePositiveCount = results.filter(
    (result) => result.expected === "negative" && result.actual === "positive"
  ).length;
  const falseNegativeCount = results.filter(
    (result) => result.expected === "positive" && result.actual === "negative"
  ).length;

  return {
    caseCount: cases.length,
    calibrationStatus,
    releaseMaturity,
    datasetReadiness,
    datasetCoverageReport,
    roc: rocPlaceholders(),
    detectionSourcesUsed: [...new Set(results.map((result) => result.source))],
    results,
    confusionMatrix,
    metrics: rawMetrics,
    perCategoryMetrics,
    confidenceDistribution: {
      low: results.filter((result) => result.confidence < 0.5).length,
      medium: results.filter((result) => result.confidence >= 0.5 && result.confidence < 0.8).length,
      high: results.filter((result) => result.confidence >= 0.8).length,
    },
    providerAgreement: providerAgreementScore,
    reviewerAgreement,
    providerCoverage: usableProviderResults.length / cases.length,
    detectionSourceCoverage: Object.fromEntries(
      [...new Set(results.map((result) => result.source))].map((source) => [
        source,
        results.filter((result) => result.source === source).length / cases.length,
      ])
    ),
    runtimeReplayValidation,
    signalFusionComparison,
    confidenceCalibration: confidenceCalibrationBands,
    escalationRate: signalFusionComparison.filter((item) =>
      ["escalate", "block"].includes(String(item.recommendation))
    ).length / cases.length,
    falsePositiveRate: rates.falsePositiveRate ?? (negativeCases ? falsePositiveCount / negativeCases : null),
    falseNegativeRate: rates.falseNegativeRate ?? (positiveCases ? falseNegativeCount / positiveCases : null),
    governanceOverrideTracking: {
      overrides: cases.filter((testCase) => Boolean(testCase.governanceOverride)).length,
      reviewerDisagreements: reviewerAgreement.disagreements,
      cases: cases
        .filter((testCase) => Boolean(testCase.governanceOverride))
        .map((testCase) => ({
          caseId: testCase.id,
          reviewerId: testCase.governanceOverride?.reviewerId,
          reason: testCase.governanceOverride?.reason,
          outcome: testCase.governanceOverride?.outcome,
        })),
    },
    reviewedOutcomeSummary,
    reviewedOutcomes,
    groundTruth: {
      records: finalGroundTruthRecords,
      summary: finalGroundTruthSummary,
      validation: finalGroundTruthValidation,
      datasetRegistry: groundTruthDatasetRegistry,
      datasetSummary: groundTruthDatasetSummary,
    },
    trustDriftTracking: {
      average: runtimeEvaluations.length
        ? runtimeEvaluations.reduce(
            (total, evaluation) => total + evaluation.runtime.drift,
            0
          ) / runtimeEvaluations.length
        : null,
      cases: runtimeEvaluations.map(({ testCase, runtime }) => ({
        caseId: testCase.id,
        previousScore: runtime.previousScore,
        score: runtime.score,
        drift: runtime.drift,
        posture: runtime.posture,
        evidence: runtime.weightedSignals.map((signal) => signal.key),
      })),
    },
    falsePositiveCaseIds: results
      .filter((result) => result.expected === "negative" && result.actual === "positive")
      .map((result) => result.caseId),
    falseNegativeCaseIds: results
      .filter((result) => result.expected === "positive" && result.actual === "negative")
      .map((result) => result.caseId),
    benchmarkMaturity: benchmarkMaturity({
      caseCount: cases.length,
      providerResultCount: usableProviderResults.length,
      reviewerReviewedCases: reviewerAgreement.reviewedCases,
    }),
    benchmarkHistory: benchmarkHistory({
      caseCount: cases.length,
      datasetVersion: datasetCoverageReport.datasetVersion,
      reviewedOutcomeCount: reviewedOutcomeSummary.reviewed,
    }),
    audit: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      caseIds: cases.map((testCase) => testCase.id),
      sourcePolicy: "Source-specific results remain separate; review outcomes are non-final evidence.",
    },
    warnings: usableProviderResults.length
      ? [
          "Provider results are evidence inputs, not final authenticity decisions.",
          ...(cases.length < MINIMUM_CALIBRATION_SAMPLE_THRESHOLD
            ? ["Calibration incomplete — insufficient reviewed ground truth."]
            : []),
        ]
      : [
          "No live provider inference was used.",
          ...(cases.length < MINIMUM_CALIBRATION_SAMPLE_THRESHOLD
            ? ["Calibration incomplete — insufficient reviewed ground truth."]
            : []),
        ],
  };
}

export function exportValidationBenchmark(
  benchmark: Awaited<ReturnType<typeof runValidationBenchmark>>
) {
  return JSON.stringify(benchmark, null, 2);
}
