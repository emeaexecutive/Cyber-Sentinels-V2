import { readdir } from "node:fs/promises";
import path from "node:path";
import type { ValidationCase } from "./validation-case.ts";

export type DatasetCategory =
  | "real_human_sessions"
  | "synthetic_face"
  | "deepfake_video"
  | "virtual_camera"
  | "forged_document"
  | "synthetic_voice"
  | "injected_session"
  | "ai_agent_risk"
  | "clean_agent_action"
  | "normal_workflow";

export type DatasetRegistryEntry = {
  name: string;
  directory: string;
  category: DatasetCategory;
  source: "synthetic" | "public_benchmark" | "consented_test" | "internal_fixture" | "metadata_scaffold";
  labelQuality: "unlabelled" | "weak" | "reviewed" | "adjudicated";
  reviewerStatus: "not_reviewed" | "review_pending" | "single_reviewer" | "multi_reviewer";
  consentStatus: "not_applicable" | "public_license_required" | "consented_test_only" | "approved_internal_fixture";
  dataOrigin: "synthetic" | "public" | "internal";
  usableForBenchmark: boolean;
  providerCoverage: readonly string[];
  riskDiversity: readonly string[];
};

export const datasetRegistry: DatasetRegistryEntry[] = [
  {
    name: "Real human sessions",
    directory: "real-human-sessions",
    category: "real_human_sessions",
    source: "metadata_scaffold",
    labelQuality: "unlabelled",
    reviewerStatus: "not_reviewed",
    consentStatus: "consented_test_only",
    dataOrigin: "internal",
    usableForBenchmark: false,
    providerCoverage: ["session_integrity"],
    riskDiversity: ["normal_presence", "consented_human_session"],
  },
  {
    name: "Synthetic face samples",
    directory: "synthetic-face-samples",
    category: "synthetic_face",
    source: "synthetic",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "not_applicable",
    dataOrigin: "synthetic",
    usableForBenchmark: false,
    providerCoverage: ["Reality Defender", "Sensity"],
    riskDiversity: ["synthetic_identity"],
  },
  {
    name: "Deepfake video samples",
    directory: "deepfake-video-samples",
    category: "deepfake_video",
    source: "public_benchmark",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "public_license_required",
    dataOrigin: "public",
    usableForBenchmark: false,
    providerCoverage: ["Reality Defender", "Sensity"],
    riskDiversity: ["deepfake_video", "live_video_trust"],
  },
  {
    name: "Virtual camera samples",
    directory: "virtual-camera-samples",
    category: "virtual_camera",
    source: "internal_fixture",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "approved_internal_fixture",
    dataOrigin: "internal",
    usableForBenchmark: false,
    providerCoverage: ["session_integrity"],
    riskDiversity: ["virtual_camera", "channel_integrity"],
  },
  {
    name: "Forged document samples",
    directory: "forged-document-samples",
    category: "forged_document",
    source: "public_benchmark",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "public_license_required",
    dataOrigin: "public",
    usableForBenchmark: false,
    providerCoverage: ["Veriff", "Onfido/Entrust", "Stripe Identity", "C2PA"],
    riskDiversity: ["document_fraud", "media_provenance"],
  },
  {
    name: "Synthetic voice samples",
    directory: "synthetic-voice-samples",
    category: "synthetic_voice",
    source: "synthetic",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "not_applicable",
    dataOrigin: "synthetic",
    usableForBenchmark: false,
    providerCoverage: ["Pindrop"],
    riskDiversity: ["synthetic_voice", "live_video_trust"],
  },
  {
    name: "Injected session samples",
    directory: "injected-session-samples",
    category: "injected_session",
    source: "internal_fixture",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "approved_internal_fixture",
    dataOrigin: "internal",
    usableForBenchmark: false,
    providerCoverage: ["session_integrity"],
    riskDiversity: ["injected_session", "runtime_anomaly"],
  },
  {
    name: "AI agent risk events",
    directory: "ai-agent-risk-events",
    category: "ai_agent_risk",
    source: "internal_fixture",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "approved_internal_fixture",
    dataOrigin: "internal",
    usableForBenchmark: false,
    providerCoverage: ["runtime_intelligence"],
    riskDiversity: ["agent_authority", "nhi_governance"],
  },
  {
    name: "Clean agent actions",
    directory: "clean-agent-actions",
    category: "clean_agent_action",
    source: "internal_fixture",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "approved_internal_fixture",
    dataOrigin: "internal",
    usableForBenchmark: false,
    providerCoverage: ["runtime_intelligence"],
    riskDiversity: ["clean_agent_action", "nhi_governance"],
  },
  {
    name: "Normal workflow approvals",
    directory: "normal-workflow-approvals",
    category: "normal_workflow",
    source: "internal_fixture",
    labelQuality: "weak",
    reviewerStatus: "review_pending",
    consentStatus: "approved_internal_fixture",
    dataOrigin: "internal",
    usableForBenchmark: false,
    providerCoverage: ["governance_review"],
    riskDiversity: ["regulated_workflow", "approval_integrity"],
  },
];

export async function inspectDatasetRegistry(root = path.join(process.cwd(), "data", "validation")) {
  const folders = await Promise.all(
    datasetRegistry.map(async (entry) => {
      const directoryPath = path.join(root, entry.directory);
      let jsonCaseCount = 0;
      try {
        const files = await readdir(directoryPath, { withFileTypes: true });
        jsonCaseCount = files.filter((file) => file.isFile() && file.name.endsWith(".json")).length;
      } catch {
        jsonCaseCount = 0;
      }
      return { ...entry, jsonCaseCount };
    })
  );
  return folders;
}

function ratio(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : 0;
}

export function calculateDatasetReadiness(input: {
  cases: ValidationCase[];
  registry?: Awaited<ReturnType<typeof inspectDatasetRegistry>>;
}) {
  const registry = input.registry ?? datasetRegistry.map((entry) => ({ ...entry, jsonCaseCount: 0 }));
  const totalCategories = registry.length;
  const categoriesWithCases = new Set(
    input.cases
      .map((testCase) => testCase.datasetMetadata?.source ? categoryForCase(testCase) : null)
      .filter((category): category is DatasetCategory => Boolean(category))
  ).size;
  const reviewedCases = input.cases.filter((testCase) => testCase.reviewerId || testCase.datasetMetadata?.reviewer).length;
  const qualityCases = input.cases.filter(
    (testCase) =>
      typeof testCase.datasetMetadata?.confidence === "number" &&
      testCase.datasetMetadata.confidence >= 0.75
  ).length;
  const providerComparedCases = input.cases.filter(
    (testCase) =>
      testCase.datasetMetadata?.providerAgreement &&
      !["not_compared", "awaiting_credentials"].includes(testCase.datasetMetadata.providerAgreement)
  ).length;
  const riskDiversity = new Set(registry.flatMap((entry) => entry.riskDiversity)).size;
  const scoreParts = {
    coverage: Math.round(ratio(categoriesWithCases, totalCategories) * 100),
    labelQuality: Math.round(ratio(qualityCases, input.cases.length) * 100),
    reviewerCoverage: Math.round(ratio(reviewedCases, input.cases.length) * 100),
    providerCoverage: Math.round(ratio(providerComparedCases, input.cases.length) * 100),
    riskDiversity: Math.round(Math.min(1, riskDiversity / 12) * 100),
  };
  const currentPercent = Math.round(
    scoreParts.coverage * 0.25 +
      scoreParts.labelQuality * 0.25 +
      scoreParts.reviewerCoverage * 0.2 +
      scoreParts.providerCoverage * 0.2 +
      scoreParts.riskDiversity * 0.1
  );

  return {
    currentPercent,
    usableCaseCount: input.cases.filter((testCase) => Boolean(testCase.datasetMetadata?.reviewer)).length,
    totalCaseCount: input.cases.length,
    areas: scoreParts,
    registry,
    evidence: input.cases.length
      ? `${input.cases.length} labelled validation case(s) found.`
      : "Metadata buckets exist, but no approved JSON validation cases are present.",
    blocker: input.cases.length
      ? "Reviewer coverage, provider comparison and category balance must be validated before benchmark claims."
      : "No approved labelled cases are present in data/validation.",
    nextAction:
      "Add consented or public benchmark JSON cases with reviewer, license/source, provider-agreement and governance outcome metadata.",
  };
}

function categoryForCase(testCase: ValidationCase): DatasetCategory | null {
  if (testCase.signals.virtualCameraIndicator) return "virtual_camera";
  if (testCase.signals.documentMismatch || testCase.label === "forged") return "forged_document";
  if (testCase.signals.agentRuntimeAnomaly || testCase.intent?.actorType === "agent") return "ai_agent_risk";
  if (testCase.label === "deepfake") return "deepfake_video";
  if (testCase.label === "synthetic") return "synthetic_face";
  if (testCase.label === "injected") return "injected_session";
  if (testCase.label === "real") return "real_human_sessions";
  if (testCase.label === "clean") return "normal_workflow";
  return null;
}
