import {
  assertProviderSafe,
  awaitingCredentialsResult,
  type DetectionProvider,
  type ProviderRawResult,
} from "./types.ts";
import { recordRuntimeProfileSample } from "../../performance/runtime-profiler.ts";
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
    async healthCheck() {
      const started = Date.now();
      const status = this.status();
      const sourceLabel =
        status === "live"
          ? "provider_api"
          : status === "awaiting_credentials"
            ? "awaiting_credentials"
            : "not_implemented";
      const latencyMs = Math.max(0, Date.now() - started);
      recordRuntimeProfileSample({
        stage: "provider",
        label: `${config.providerName} health check`,
        latencyMs,
        outcome: status === "live" || status === "simulated" ? "ok" : "failed",
      });
      return {
        providerName: config.providerName,
        status:
          status === "live"
            ? "Live"
            : status === "simulated"
              ? "Simulated"
              : status === "awaiting_credentials"
                ? "Awaiting Credentials"
                : "Disabled",
        credentialsPresent: credentialsPresent(),
        sourceLabel,
        latencyMs,
        limitations:
          status === "live"
            ? ["Provider credentials are present; benchmark validation and human review remain required."]
            : [`${config.providerName} is ${status.replaceAll("_", " ")}.`],
      };
    },
    status: () => {
      if (config.enabledEnv && process.env[config.enabledEnv] === "false") return "disabled";
      if (config.implementation === "simulated") return "simulated";
      if (config.implementation === "live" && credentialsPresent()) return "live";
      return credentialsPresent() ? "disabled" : "awaiting_credentials";
    },
    normalizeResult,
    async runDetection(testCase) {
      const started = Date.now();
      if (!credentialsPresent()) {
        const result = awaitingCredentialsResult(config.providerName, testCase);
        recordRuntimeProfileSample({
          stage: "provider",
          label: config.providerName,
          latencyMs: Date.now() - started,
          outcome: "failed",
        });
        return result;
      }
      assertProviderSafe(testCase);
      // Credentials alone never imply a working integration. Network execution is
      // enabled only when a reviewed endpoint-specific implementation is supplied.
      recordRuntimeProfileSample({
        stage: "provider",
        label: config.providerName,
        latencyMs: Date.now() - started,
        outcome: "failed",
      });
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
