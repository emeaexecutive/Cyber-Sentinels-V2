import type { DetectionProvider } from "./types.ts";
export const mockProvider: DetectionProvider = {
  providerName: "Mock Provider",
  supportedSignals: ["test_only"],
  credentialsPresent: () => false,
  status: () => "disabled",
  async healthCheck() {
    return {
      providerName: "Mock Provider",
      status: "Disabled",
      credentialsPresent: false,
      sourceLabel: "demo_data",
      latencyMs: 0,
      limitations: ["Test-only mock output; never production evidence."],
    };
  },
  normalizeResult: (testCase, raw) => ({ caseId: testCase.id, expected: testCase.expectedOutcome, actual: raw.outcome ?? "review", source: "demo_data", confidence: raw.confidence ?? 0, evidence: raw.evidence ?? [], limitations: ["Test-only mock output; never production evidence."], providerName: "Mock Provider" }),
  async runDetection(testCase) { return this.normalizeResult(testCase, {}); },
};
