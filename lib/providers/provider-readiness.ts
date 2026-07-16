import { detectionProviders } from "@/lib/detection/providers";
import { getVerificationProviderRegistry, providerRuntimeState } from "@/lib/providers/registry";

export type ProviderReadinessRuntimeState =
  | "Live"
  | "Test Mode"
  | "Simulated"
  | "Awaiting Credentials"
  | "Degraded"
  | "Timeout"
  | "Failed"
  | "Disabled"
  | "Unsupported";

export type ProviderReadinessClassification =
  | "Production Ready"
  | "Configured"
  | "Awaiting Credentials"
  | "Prototype"
  | "Deprecated";

export type ProviderOperationsState =
  | "Production"
  | "Sandbox"
  | "Awaiting Credentials"
  | "Prototype"
  | "Disabled";

export type ProviderHealthSummary = {
  providerId: string;
  providerName: string;
  state: "Healthy" | "Degraded" | "Blocked" | "Unknown";
  evidence: string;
  lastCheckedAt: string | null;
  latencyMs: number | null;
  availability: "Available" | "Unavailable" | "Unknown";
  credentialStatus: ProviderReadinessCheck["credentialState"];
  supportedSignals: readonly string[];
  confidence: number | null;
  errorRate: number | null;
  retryState: "Enabled" | "Not implemented" | "Inactive";
  limitation: string;
};

export type ProviderHealthEvidence = {
  status: "success" | "degraded" | "timeout" | "failed";
  checkedAt: string;
  latencyMs?: number | null;
  mode: "real" | "test";
  failure?: string | null;
};

export type ProviderReadinessCheck = {
  id: string;
  name: string;
  category: "media_forensics" | "voice" | "identity" | "document" | "provenance" | "bot_protection" | "device_risk";
  purpose: string;
  adapterMaturity: "production_candidate" | "test_ready" | "prototype" | "disabled";
  documentationHref: "/docs/PROVIDER_SETUP_GUIDE.md";
  runtimeState: ProviderReadinessRuntimeState;
  credentialState: "present" | "missing" | "not_required";
  configurationStatus: "configured" | "partial" | "not_configured" | "disabled";
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
  supportedFeatures: readonly string[];
  limitations: readonly string[];
  dataRetentionLimitation: string;
  deploymentMode: "cloud" | "hybrid" | "self-hosted";
  lastSuccessfulCheck: string | null;
  lastFailure: { at: string; reason: string } | null;
  sovereignty: {
    deploymentMode: "cloud" | "hybrid" | "self-hosted";
    restrictedDataSupport: "supported" | "limited" | "not_supported";
    customerOwnedMemoryCompatible: boolean;
    providerShutdownRisk: "low" | "medium" | "high";
    exportSupport: "full" | "partial" | "not_available";
  };
  evidence: string;
  blocker: string;
  nextAction: string;
};

export function providerRealityState(check: ProviderReadinessCheck): ProviderOperationsState {
  if (check.adapterMaturity === "disabled") return "Disabled";
  if (check.adapterMaturity === "prototype") return "Prototype";
  if (check.credentialState === "missing") return "Awaiting Credentials";
  if (classifyProviderReadiness(check) === "Production Ready") return "Production";
  return "Sandbox";
}

export function classifyProviderReadiness(
  check: ProviderReadinessCheck
): ProviderReadinessClassification {
  if (/deprecated|retired|legacy/i.test(`${check.name} ${check.blocker}`)) return "Deprecated";
  if (
    check.runtimeState === "Live" &&
    check.productionModeAvailable &&
    check.health === "healthy" &&
    check.lastSuccessfulCheck &&
    check.normalizedResultImplemented &&
    check.timeoutHandlingImplemented &&
    check.auditLoggingImplemented
  ) return "Production Ready";
  if (check.credentialPresent && check.configurationStatus === "configured") return "Configured";
  if (check.credentialState === "missing" && (check.healthCheckAvailable || check.testModeAvailable)) {
    return "Awaiting Credentials";
  }
  if (
    check.runtimeState === "Simulated"
    || check.runtimeState === "Test Mode"
    || check.normalizedResultImplemented
    || check.timeoutHandlingImplemented
  ) return "Prototype";
  return "Prototype";
}

export function buildProviderHealthSummary(check: ProviderReadinessCheck): ProviderHealthSummary {
  const state: ProviderHealthSummary["state"] = check.lastSuccessfulCheck && check.health === "healthy"
    ? "Healthy"
    : check.lastFailure || ["Degraded", "Timeout", "Failed"].includes(check.runtimeState)
      ? "Degraded"
      : check.credentialState === "missing" || ["Disabled", "Awaiting Credentials"].includes(check.runtimeState)
        ? "Blocked"
        : "Unknown";
  return {
    providerId: check.id,
    providerName: check.name,
    state,
    evidence: check.lastSuccessfulCheck
      ? `Successful ${check.runtimeState} check recorded at ${check.lastSuccessfulCheck}.`
      : check.lastFailure
        ? `Last check failed at ${check.lastFailure.at}: ${check.lastFailure.reason}.`
        : "No successful real health check is recorded in this process.",
    lastCheckedAt: check.lastSuccessfulCheck ?? check.lastFailure?.at ?? null,
    latencyMs: check.latency.measured ? check.latency.p95Ms : null,
    availability: check.lastSuccessfulCheck ? "Available" : check.lastFailure || check.credentialState === "missing" ? "Unavailable" : "Unknown",
    credentialStatus: check.credentialState,
    supportedSignals: check.supportedFeatures,
    confidence: null,
    errorRate: check.lastSuccessfulCheck ? 0 : check.lastFailure ? 1 : null,
    retryState: check.retryLogicImplemented ? "Enabled" : check.lastFailure ? "Not implemented" : "Inactive",
    limitation: "Health evidence is process-local. Confidence is unavailable without a provider-returned, normalized value; error rate reflects only the retained health observation and does not establish fleet-wide availability or an SLA.",
  };
}

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

function providerPurpose(category: ProviderReadinessCheck["category"]) {
  return ({
    media_forensics: "Media authenticity and manipulation signals",
    voice: "Voice authenticity and impersonation signals",
    identity: "Identity, authentication and assurance signals",
    document: "Document authenticity and provenance signals",
    provenance: "Content provenance and origin signals",
    bot_protection: "Automated abuse and bot-risk signals",
    device_risk: "Device continuity and risk signals",
  } as const)[category];
}

function verifiedRuntimeState(input: {
  credentialsPresent: boolean;
  configured: boolean;
  simulated?: boolean;
  health?: ProviderHealthEvidence;
}): ProviderReadinessRuntimeState {
  if (input.simulated) return "Simulated";
  if (!input.credentialsPresent) return "Awaiting Credentials";
  if (!input.configured) return "Disabled";
  if (!input.health) return "Test Mode";
  if (input.health.status === "timeout") return "Timeout";
  if (input.health.status === "failed") return "Failed";
  if (input.health.status === "degraded") return "Degraded";
  return input.health.mode === "real" ? "Live" : "Test Mode";
}

export function buildProviderReadinessChecklist(
  healthChecks: Record<string, ProviderHealthEvidence> = {}
): ProviderReadinessCheck[] {
  const detection = detectionProviders
    .filter((provider) => provider.providerName !== "Mock Provider")
    .map<ProviderReadinessCheck>((provider) => {
      const status = provider.status();
      const credentialPresent = provider.credentialsPresent();
      const healthEvidence = healthChecks[provider.providerName];
      const runtimeState = verifiedRuntimeState({
        credentialsPresent: credentialPresent,
        configured: status === "live",
        health: healthEvidence,
      });
      const productionModeAvailable = runtimeState === "Live";
      const category = categoryByName[provider.providerName] ?? "media_forensics";
      return {
        id: providerId(`detection-${provider.providerName}`),
        name: provider.providerName,
        category,
        purpose: providerPurpose(category),
        adapterMaturity: "prototype",
        documentationHref: "/docs/PROVIDER_SETUP_GUIDE.md",
        runtimeState,
        credentialState: credentialPresent ? "present" : "missing",
        configurationStatus: status === "live" ? "configured" : credentialPresent ? "partial" : "not_configured",
        credentialPresent,
        healthCheckAvailable: true,
        testModeAvailable: true,
        productionModeAvailable,
        normalizedResultImplemented: true,
        timeoutHandlingImplemented: true,
        retryLogicImplemented: false,
        auditLoggingImplemented: true,
        health: runtimeState === "Live" ? "healthy" : ["Test Mode", "Degraded"].includes(runtimeState) ? "degraded" : "blocked",
        latency: {
          measured: typeof healthEvidence?.latencyMs === "number",
          p95Ms: healthEvidence?.latencyMs ?? null,
          timeoutMs: 250,
        },
        supportedFeatures: provider.supportedSignals,
        limitations: [
          "Credentials do not prove live inference.",
          "Provider output requires reviewed dataset comparison before accuracy claims.",
          "Raw provider payloads are not exposed outside protected audit handling.",
        ],
        dataRetentionLimitation: "Provider retention is controlled by the provider contract and must be reviewed before restricted-data use.",
        deploymentMode: "cloud",
        lastSuccessfulCheck: healthEvidence?.status === "success" ? healthEvidence.checkedAt : null,
        lastFailure: healthEvidence && healthEvidence.status !== "success"
          ? { at: healthEvidence.checkedAt, reason: healthEvidence.failure ?? healthEvidence.status }
          : null,
        sovereignty: {
          deploymentMode: "cloud",
          restrictedDataSupport: "limited",
          customerOwnedMemoryCompatible: true,
          providerShutdownRisk: productionModeAvailable ? "medium" : "high",
          exportSupport: "partial",
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
    const healthEvidence = healthChecks[provider.name];
    const registryState = providerRuntimeState(provider);
    const runtimeState = verifiedRuntimeState({
      credentialsPresent: provider.presentEnv.length === provider.requiredEnv.length,
      configured: provider.implementationState === "active" && provider.status === "configured",
      simulated: registryState === "Simulated",
      health: healthEvidence,
    });
    const productionModeAvailable = runtimeState === "Live";
    const configured = provider.status === "configured";
    const category = categoryByName[provider.name] ?? "identity";
    return {
      id: providerId(`verification-${provider.name}`),
      name: provider.name,
      category,
      purpose: provider.purpose || providerPurpose(category),
      adapterMaturity: provider.id === "hopae_connect"
        ? "production_candidate"
        : provider.implementationState === "active"
          ? "test_ready"
          : provider.id === "external_unattributed"
            ? "disabled"
            : "prototype",
      documentationHref: "/docs/PROVIDER_SETUP_GUIDE.md",
      runtimeState,
      credentialState: provider.requiredEnv.length === 0 ? "not_required" : provider.presentEnv.length === provider.requiredEnv.length ? "present" : "missing",
      configurationStatus: configured ? "configured" : provider.presentEnv.length ? "partial" : provider.implementationState === "safely_disabled" ? "disabled" : "not_configured",
      credentialPresent: provider.presentEnv.length === provider.requiredEnv.length,
      healthCheckAvailable: provider.implementationState === "active",
      testModeAvailable: provider.implementationState !== "safely_disabled",
      productionModeAvailable,
      normalizedResultImplemented: provider.replayIntegration === "normalized_evidence" || provider.receiptIntegration === "normalized_evidence",
      timeoutHandlingImplemented: provider.implementationState === "active",
      retryLogicImplemented: false,
      auditLoggingImplemented: provider.replayIntegration === "normalized_evidence",
      health: runtimeState === "Live" ? "healthy" : ["Test Mode", "Degraded"].includes(runtimeState) ? "degraded" : "blocked",
      latency: {
        measured: typeof healthEvidence?.latencyMs === "number",
        p95Ms: healthEvidence?.latencyMs ?? null,
        timeoutMs: 250,
      },
      supportedFeatures: [
        provider.category,
        provider.purpose,
        provider.evidenceReference,
      ],
      limitations: [
        "Credential presence does not equal production readiness.",
        "Provider evidence must stay workflow-gated, replay-linked and governance-reviewable.",
        provider.notes,
      ],
      dataRetentionLimitation: "Only normalized provider evidence should enter Replay; provider-side retention remains contract-dependent.",
      deploymentMode: provider.category === "bot_protection" || provider.category === "device_risk" ? "hybrid" : "cloud",
      lastSuccessfulCheck: healthEvidence?.status === "success" ? healthEvidence.checkedAt : null,
      lastFailure: healthEvidence && healthEvidence.status !== "success"
        ? { at: healthEvidence.checkedAt, reason: healthEvidence.failure ?? healthEvidence.status }
        : null,
      sovereignty: {
        deploymentMode: provider.category === "bot_protection" || provider.category === "device_risk" ? "hybrid" : "cloud",
        restrictedDataSupport: provider.authProtection === "not_exposed" ? "not_supported" : "limited",
        customerOwnedMemoryCompatible: provider.replayIntegration === "normalized_evidence",
        providerShutdownRisk: productionModeAvailable ? "medium" : "high",
        exportSupport: provider.receiptIntegration === "normalized_evidence" ? "partial" : "not_available",
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

  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseHealth = healthChecks["Supabase Auth"];
  const supabaseState = verifiedRuntimeState({ credentialsPresent: supabaseConfigured, configured: supabaseConfigured, health: supabaseHealth });
  const supabaseAuth: ProviderReadinessCheck = {
    id: "platform-supabase-auth",
    name: "Supabase Auth",
    category: "identity",
    purpose: providerPurpose("identity"),
    adapterMaturity: "test_ready",
    documentationHref: "/docs/PROVIDER_SETUP_GUIDE.md",
    runtimeState: supabaseState,
    credentialState: supabaseConfigured ? "present" : "missing",
    configurationStatus: supabaseConfigured ? "configured" : "not_configured",
    credentialPresent: supabaseConfigured,
    healthCheckAvailable: true,
    testModeAvailable: true,
    productionModeAvailable: supabaseState === "Live",
    normalizedResultImplemented: true,
    timeoutHandlingImplemented: true,
    retryLogicImplemented: false,
    auditLoggingImplemented: true,
    health: supabaseState === "Live" ? "healthy" : supabaseState === "Test Mode" ? "degraded" : "blocked",
    latency: { measured: typeof supabaseHealth?.latencyMs === "number", p95Ms: supabaseHealth?.latencyMs ?? null, timeoutMs: 8000 },
    supportedFeatures: ["session authentication", "email verification", "tenant-scoped data access"],
    limitations: ["Configuration is not a health check.", "Authorization and RLS remain separate controls."],
    dataRetentionLimitation: "Auth and audit retention follow the configured Supabase project and enterprise data policy.",
    deploymentMode: "cloud",
    lastSuccessfulCheck: supabaseHealth?.status === "success" ? supabaseHealth.checkedAt : null,
    lastFailure: supabaseHealth && supabaseHealth.status !== "success" ? { at: supabaseHealth.checkedAt, reason: supabaseHealth.failure ?? supabaseHealth.status } : null,
    sovereignty: { deploymentMode: "cloud", restrictedDataSupport: "limited", customerOwnedMemoryCompatible: true, providerShutdownRisk: "medium", exportSupport: "partial" },
    evidence: supabaseHealth ? `Health evidence recorded at ${supabaseHealth.checkedAt}.` : "Supabase environment configuration is checked without exposing credential values.",
    blocker: supabaseState === "Live" ? "Production authorization and RLS still require continuous validation." : "No successful real health check is recorded in this process.",
    nextAction: "Record an authenticated health check and validate tenant isolation before declaring Live.",
  };

  return [...detection, ...verification, supabaseAuth];
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
    testMode: checks.filter((item) => item.runtimeState === "Test Mode").length,
    degraded: checks.filter((item) => ["Degraded", "Timeout", "Failed"].includes(item.runtimeState)).length,
    disabled: checks.filter((item) => item.runtimeState === "Disabled").length,
    normalized,
    retryReady,
    latencyMeasured,
    productionReady,
    classifications: {
      productionReady: checks.filter((item) => classifyProviderReadiness(item) === "Production Ready").length,
      configured: checks.filter((item) => classifyProviderReadiness(item) === "Configured").length,
      awaitingCredentials: checks.filter((item) => classifyProviderReadiness(item) === "Awaiting Credentials").length,
      prototype: checks.filter((item) => classifyProviderReadiness(item) === "Prototype").length,
      deprecated: checks.filter((item) => classifyProviderReadiness(item) === "Deprecated").length,
    },
    operationsStates: {
      production: checks.filter((item) => providerRealityState(item) === "Production").length,
      sandbox: checks.filter((item) => providerRealityState(item) === "Sandbox").length,
      awaitingCredentials: checks.filter((item) => providerRealityState(item) === "Awaiting Credentials").length,
      prototype: checks.filter((item) => providerRealityState(item) === "Prototype").length,
      disabled: checks.filter((item) => providerRealityState(item) === "Disabled").length,
    },
    healthSummaries: checks.map(buildProviderHealthSummary),
    normalizationAudit: checks.map((item) => ({
      providerId: item.id,
      providerName: item.name,
      normalized: item.normalizedResultImplemented,
      evidence: item.normalizedResultImplemented
        ? "The adapter maps provider output into the canonical evidence/result contract."
        : "Canonical response normalization is not implemented.",
    })),
    evidence: `${checks.length} provider readiness check(s), ${normalized} with normalized evidence/result handling, ${productionReady} production-ready reviewed path(s).`,
    blocker: productionReady ? "Provider output still requires benchmark validation." : "No fully reviewed live provider path is production-ready.",
    nextAction: "Enable one endpoint-specific provider path only after credential, timeout, audit, benchmark and restricted-data egress review.",
  };
}
