import {
  assertProviderSafe,
  awaitingCredentialsResult,
  type DetectionProvider,
  type ProviderRawResult,
} from "./types.ts";
import type { ValidationCase } from "../../validation/validation-case.ts";

export function createProviderAdapter(config: {
  providerName: string;
  env: readonly string[];
  supportedSignals: readonly string[];
  implementation?: "placeholder" | "simulated" | "live";
  enabledEnv?: string;
}): DetectionProvider {
  const credentialsPresent = () =>
    config.env.every((name) => Boolean(String(process.env[name] ?? "").trim()));
  const normalizeResult = (testCase: ValidationCase, raw: ProviderRawResult) => ({
    caseId: testCase.id,
    expected: testCase.expectedOutcome,
    actual: raw.outcome ?? ("review" as const),
    source: "provider_api" as const,
    confidence: Math.max(0, Math.min(1, raw.confidence ?? 0)),
    evidence: raw.evidence ?? [],
    limitations: ["Provider evidence requires benchmark validation and human review."],
    providerName: config.providerName,
    providerAudit: {
      providerName: config.providerName,
      state: "provider_api" as const,
      credentialsChecked: true,
      providerCallMade: true,
      degradedMode: false,
      latencyMs: 0,
    },
  });

  return {
    providerName: config.providerName,
    supportedSignals: config.supportedSignals,
    credentialsPresent,
    status: () => {
      if (config.enabledEnv && process.env[config.enabledEnv] === "false") return "disabled";
      if (config.implementation === "simulated") return "simulated";
      if (config.implementation === "live" && credentialsPresent()) return "live";
      return credentialsPresent() ? "disabled" : "awaiting_credentials";
    },
    normalizeResult,
    async runDetection(testCase) {
      if (!credentialsPresent()) return awaitingCredentialsResult(config.providerName, testCase);
      assertProviderSafe(testCase);
      // Credentials alone never imply a working integration. Network execution is
      // enabled only when a reviewed endpoint-specific implementation is supplied.
      return {
        ...normalizeResult(testCase, {}),
        source: "not_implemented",
        limitations: [`${config.providerName} credentials exist, but live detection is not implemented.`],
        providerAudit: {
          providerName: config.providerName,
          state: "not_implemented" as const,
          credentialsChecked: true,
          providerCallMade: false,
          degradedMode: true,
          latencyMs: 0,
        },
      };
    },
  };
}
