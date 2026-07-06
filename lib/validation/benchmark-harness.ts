import type { DetectionSource } from "@/lib/detection/detection-engine";

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
      providerBacked: cases.filter((item) => item.detectionSource === "Provider API").length,
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
