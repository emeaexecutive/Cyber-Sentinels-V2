export type StagingApplicationValidationInput = {
  environment: string;
  deploymentId: string;
  buildSha: string;
  stagingHostname: string;
  releaseId: string;
  protectionEnabled: boolean;
  noindexEnabled: boolean;
  productionReference: boolean;
  syntheticMode: boolean;
};

export type StagingApplicationValidationResult = {
  status: "pass" | "fail";
  codes: string[];
  deploymentId: string;
  buildSha: string;
  releaseId: string;
  environment: string;
};

export function evaluateStagingApplicationValidation(input: StagingApplicationValidationInput): StagingApplicationValidationResult {
  const codes: string[] = [];

  if (input.environment !== "staging") {
    codes.push("ENVIRONMENT_REFERENCE_MISMATCH");
  }

  if (!input.protectionEnabled) {
    codes.push("PROTECTION_DISABLED");
  }

  if (!input.noindexEnabled) {
    codes.push("NOINDEX_REQUIRED");
  }

  if (input.productionReference) {
    codes.push("ENVIRONMENT_REFERENCE_MISMATCH");
  }

  if (!input.syntheticMode) {
    codes.push("SYNTHETIC_MODE_REQUIRED");
  }

  return {
    status: codes.length === 0 ? "pass" : "fail",
    codes,
    deploymentId: input.deploymentId,
    buildSha: input.buildSha,
    releaseId: input.releaseId,
    environment: input.environment,
  };
}
