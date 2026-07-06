import type {
  DetectionExpectedOutcome,
  DetectionSource,
  ValidationCase,
  ValidationResult,
} from "../../validation/validation-case.ts";

export type ProviderStatus = "live" | "awaiting_credentials" | "disabled";
export type ProviderDisplayStatus = "Live" | "Awaiting Credentials" | "Disabled";
export type ProviderRawResult = {
  outcome?: DetectionExpectedOutcome;
  confidence?: number;
  evidence?: string[];
};

export type DetectionProvider = {
  providerName: string;
  status: () => ProviderStatus;
  supportedSignals: readonly string[];
  credentialsPresent: () => boolean;
  runDetection: (testCase: ValidationCase) => Promise<ValidationResult>;
  normalizeResult: (testCase: ValidationCase, raw: ProviderRawResult) => ValidationResult;
};

export const awaitingCredentialsResult = (
  providerName: string,
  testCase: ValidationCase
): ValidationResult => ({
  caseId: testCase.id,
  expected: testCase.expectedOutcome,
  actual: "review",
  source: "awaiting_credentials" satisfies DetectionSource,
  confidence: 0,
  evidence: [],
  limitations: [`${providerName} credentials are not configured; no provider call was made.`],
  providerName,
});

export function assertProviderSafe(testCase: ValidationCase) {
  if (testCase.dataClassification === "restricted") {
    throw new Error("Restricted validation data must not enter provider calls.");
  }
}

export function providerStatusLabel(status: ProviderStatus): ProviderDisplayStatus {
  if (status === "live") return "Live";
  if (status === "awaiting_credentials") return "Awaiting Credentials";
  return "Disabled";
}
