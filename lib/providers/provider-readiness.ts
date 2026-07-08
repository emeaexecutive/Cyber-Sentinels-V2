import { detectionProviders, providerStatusLabel } from "@/lib/detection/providers";
import { getVerificationProviderRegistry, providerRuntimeState } from "@/lib/providers/registry";

export type ProviderReadinessRuntimeState =
  | "Live"
  | "Simulated"
  | "Awaiting Credentials"
  | "Disabled";

export type ProviderReadinessCheck = {
  id: string;
  name: string;
  category: "media_forensics" | "voice" | "identity" | "document" | "provenance" | "bot_protection" | "device_risk";
  runtimeState: ProviderReadinessRuntimeState;
  credentialPresent: boolean;
  healthCheckAvailable: boolean;
  testModeAvailable: boolean;
  productionModeAvailable: boolean;
  normalizedResultImplemented: boolean;
  timeoutHandlingImplemented: boolean;
  retryLogicImplemented: boolean;
  auditLoggingImplemented: boolean;
  health: "healthy" | "degraded" | "blocked";
  latency: {
    measured: boolean;
    p95Ms: number | null;
    timeoutMs: number;
  };
  evidence: string;
  blocker: string;
  nextAction: string;
};

const categoryByName: Record<string, ProviderReadinessCheck["category"]> = {
  "Reality Defender": "media_forensics",
  Sensity: "media_forensics",
  Pindrop: "voice",
  "Document Forensics": "document",
  "Onfido / Entrust": "identity",
  Veriff: "identity",
  "World ID": "identity",
  "Stripe Identity": "identity",
  C2PA: "provenance",
  SynthID: "provenance",
  Onfido: "identity",
  Entrust: "identity",
  "Cloudflare Turnstile": "bot_protection",
  "Fingerprint / device risk": "device_risk",
};

function providerId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildProviderReadinessChecklist(): ProviderReadinessCheck[] {
  const detection = detectionProviders
    .filter((provider) => provider.providerName !== "Mock Provider")
    .map<ProviderReadinessCheck>((provider) => {
      const status = provider.status();
      const runtimeState = providerStatusLabel(status);
      const credentialPresent = provider.credentialsPresent();
      const productionModeAvailable = status === "live";
      return {
        id: providerId(`detection-${provider.providerName}`),
        name: provider.providerName,
        category: categoryByName[provider.providerName] ?? "media_forensics",
        runtimeState,
        credentialPresent,
        healthCheckAvailable: true,
        testModeAvailable: true,
        productionModeAvailable,
        normalizedResultImplemented: true,
        timeoutHandlingImplemented: true,
        retryLogicImplemented: false,
        auditLoggingImplemented: true,
        health: productionModeAvailable ? "degraded" : credentialPresent ? "degraded" : "blocked",
        latency: {
          measured: false,
          p95Ms: null,
          timeoutMs: 250,
        },
        evidence: `${provider.providerName} exposes credential checks, health check, normalized results and supported signals: ${provider.supportedSignals.join(", ")}.`,
        blocker: productionModeAvailable
          ? "Live provider output still needs benchmark and reviewer validation before accuracy claims."
          : credentialPresent
            ? "Credentials are present, but production inference is not active or reviewed."
            : "Credentials are not configured; no provider call is made.",
        nextAction: productionModeAvailable
          ? "Run approved validation cases and record reviewed provider outcomes."
          : "Complete credential setup, endpoint review, timeout evidence and restricted-data egress review before enabling live calls.",
      };
    });

  const verification = getVerificationProviderRegistry().map<ProviderReadinessCheck>((provider) => {
    const runtimeState = providerRuntimeState(provider);
    const productionModeAvailable = runtimeState === "Live";
    const configured = provider.status === "configured";
    return {
      id: providerId(`verification-${provider.name}`),
      name: provider.name,
      category: categoryByName[provider.name] ?? "identity",
      runtimeState,
      credentialPresent: provider.presentEnv.length === provider.requiredEnv.length,
      healthCheckAvailable: provider.implementationState === "active",
      testModeAvailable: provider.implementationState !== "safely_disabled",
      productionModeAvailable,
      normalizedResultImplemented: provider.replayIntegration === "normalized_evidence" || provider.receiptIntegration === "normalized_evidence",
      timeoutHandlingImplemented: provider.implementationState === "active",
      retryLogicImplemented: false,
      auditLoggingImplemented: provider.replayIntegration === "normalized_evidence",
      health: productionModeAvailable ? "degraded" : configured ? "degraded" : "blocked",
      latency: {
        measured: false,
        p95Ms: null,
        timeoutMs: 250,
      },
      evidence: `${provider.name} registry state is ${runtimeState}; auth protection is ${provider.authProtection}; replay integration is ${provider.replayIntegration}.`,
      blocker: productionModeAvailable
        ? "Provider remains workflow-gated and must be reviewed against pilot evidence."
        : configured
          ? "Configured provider is not an active reviewed workflow adapter."
          : provider.missingEnv.length
            ? `Missing environment: ${provider.missingEnv.join(", ")}.`
            : "Provider is intentionally disabled or placeholder-only.",
      nextAction: productionModeAvailable
        ? "Validate normalized evidence in replay and receipt flows under pilot traffic."
        : "Keep disabled until credentials, workflow gating, audit logging and restricted-data controls are reviewed.",
    };
  });

  return [...detection, ...verification];
}

export function summarizeProviderReadiness(checks = buildProviderReadinessChecklist()) {
  const live = checks.filter((item) => item.runtimeState === "Live").length;
  const normalized = checks.filter((item) => item.normalizedResultImplemented).length;
  const productionReady = checks.filter(
    (item) =>
      item.runtimeState === "Live" &&
      item.normalizedResultImplemented &&
      item.timeoutHandlingImplemented &&
      item.auditLoggingImplemented
  ).length;
  const retryReady = checks.filter((item) => item.retryLogicImplemented).length;
  const latencyMeasured = checks.filter((item) => item.latency.measured).length;
  return {
    total: checks.length,
    live,
    awaitingCredentials: checks.filter((item) => item.runtimeState === "Awaiting Credentials").length,
    simulated: checks.filter((item) => item.runtimeState === "Simulated").length,
    disabled: checks.filter((item) => item.runtimeState === "Disabled").length,
    normalized,
    retryReady,
    latencyMeasured,
    productionReady,
    currentPercent: checks.length ? Math.round(((normalized + productionReady) / (checks.length * 2)) * 85) : 0,
    evidence: `${checks.length} provider readiness check(s), ${normalized} with normalized evidence/result handling, ${productionReady} production-ready reviewed path(s).`,
    blocker: productionReady ? "Provider output still requires benchmark validation." : "No fully reviewed live provider path is production-ready.",
    nextAction: "Enable one endpoint-specific provider path only after credential, timeout, audit, benchmark and restricted-data egress review.",
  };
}
