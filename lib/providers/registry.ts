import type {
  VerificationProviderDefinition,
  VerificationProviderId,
  ProviderRuntimeState,
} from "./types.ts";

type ProviderBlueprint = {
  id: VerificationProviderId;
  name: string;
  category: VerificationProviderDefinition["category"];
  requiredEnv: string[];
  statusWhenMissing: VerificationProviderDefinition["status"];
  purpose: string;
  evidenceReference: string;
  configuredNotes: string;
  missingNotes: string;
  enabledWhen?: () => boolean;
  implementationState: VerificationProviderDefinition["implementationState"];
  usesMockData?: boolean;
  authProtection: VerificationProviderDefinition["authProtection"];
  replayIntegration?: VerificationProviderDefinition["replayIntegration"];
  receiptIntegration?: VerificationProviderDefinition["receiptIntegration"];
};

const providerBlueprints: ProviderBlueprint[] = [
  {
    id: "external_unattributed",
    name: "External verification source",
    category: "future_adapter",
    requiredEnv: [],
    statusWhenMissing: "placeholder",
    purpose: "Safe fallback for provider evidence without a recognized adapter identifier.",
    evidenceReference: "Unattributed external verification reference",
    configuredNotes: "Disabled until a supported provider identifier is attached.",
    missingNotes: "Disabled until a supported provider identifier is attached.",
    enabledWhen: () => false,
    implementationState: "placeholder",
    authProtection: "not_exposed",
  },
  {
    id: "world_id",
    name: "World ID",
    category: "proof_of_personhood",
    requiredEnv: ["WORLD_ACTION"],
    statusWhenMissing: "safely_disabled",
    purpose: "Optional proof-of-personhood signal for supported verification workflows.",
    evidenceReference: "World ID proof response and action context",
    configuredNotes: "World ID action is configured. Provider exchange remains external and evidence-based.",
    missingNotes: "World ID is not configured. Workflows continue without proof-of-personhood enrichment.",
    implementationState: "placeholder",
    authProtection: "session",
  },
  {
    id: "stripe_identity",
    name: "Stripe Identity",
    category: "identity",
    requiredEnv: ["STRIPE_SECRET_KEY"],
    statusWhenMissing: "safely_disabled",
    purpose: "Optional identity verification source when Stripe Identity is enabled for a workflow.",
    evidenceReference: "Stripe Identity verification session",
    configuredNotes: "Stripe server key is present. Identity verification still requires workflow-specific setup.",
    missingNotes: "Stripe Identity is not configured for verification workflows.",
    implementationState: "placeholder",
    authProtection: "not_exposed",
  },
  {
    id: "persona",
    name: "Persona",
    category: "future_adapter",
    requiredEnv: ["PERSONA_API_KEY"],
    statusWhenMissing: "future",
    purpose: "Disabled identity verification adapter pending validated configuration.",
    evidenceReference: "Persona inquiry or verification report",
    configuredNotes: "Persona key is present, but adapter behavior should remain workflow-gated.",
    missingNotes: "Persona is disabled until credentials and a validated workflow are configured.",
    implementationState: "placeholder",
    authProtection: "not_exposed",
  },
  {
    id: "entrust",
    name: "Entrust",
    category: "future_adapter",
    requiredEnv: ["ENTRUST_API_KEY"],
    statusWhenMissing: "future",
    purpose: "Disabled identity and document-check adapter pending validated configuration.",
    evidenceReference: "Entrust verification or identity-check report",
    configuredNotes: "Entrust key is present, but adapter behavior should remain workflow-gated.",
    missingNotes: "Entrust is disabled until credentials and a validated workflow are configured.",
    implementationState: "placeholder",
    authProtection: "not_exposed",
  },
  {
    id: "onfido",
    name: "Onfido",
    category: "future_adapter",
    requiredEnv: ["ONFIDO_API_TOKEN"],
    statusWhenMissing: "future",
    purpose: "Disabled identity verification adapter pending validated configuration.",
    evidenceReference: "Onfido applicant check or report",
    configuredNotes: "Onfido token is present, but adapter behavior should remain workflow-gated.",
    missingNotes: "Onfido is disabled until credentials and a validated workflow are configured.",
    implementationState: "placeholder",
    authProtection: "not_exposed",
  },
  {
    id: "hopae_connect",
    name: "Hopae Connect",
    category: "identity",
    requiredEnv: ["HOPAE_CLIENT_ID", "HOPAE_CLIENT_SECRET", "HOPAE_WEBHOOK_SECRET", "HOPAE_PROVIDER_ID"],
    statusWhenMissing: "safely_disabled",
    enabledWhen: () => process.env.HOPAE_ENABLED?.trim().toLowerCase() === "true",
    purpose: "Optional upstream eID verification evidence.",
    evidenceReference: "Hopae normalized upstream identity proof",
    configuredNotes: "Hopae Connect is enabled. Cyber Sentinels remains the governance layer.",
    missingNotes: "Hopae Connect is safely disabled until server-side credentials and HOPAE_ENABLED are set.",
    implementationState: "active",
    authProtection: "server_form",
    replayIntegration: "normalized_evidence",
    receiptIntegration: "normalized_evidence",
  },
  {
    id: "cloudflare_turnstile",
    name: "Cloudflare Turnstile",
    category: "bot_protection",
    requiredEnv: ["TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"],
    statusWhenMissing: "safely_disabled",
    purpose: "Bot and abuse-resistance signal for public forms.",
    evidenceReference: "Turnstile challenge verification result",
    configuredNotes: "Turnstile variables are present. Form submissions can use provider challenge evidence.",
    missingNotes: "Turnstile is safely disabled or warning-only outside configured production form checks.",
    implementationState: "active",
    authProtection: "server_form",
  },
  {
    id: "fingerprint_device_risk",
    name: "Fingerprint / device risk",
    category: "device_risk",
    requiredEnv: ["FINGERPRINT_SECRET_KEY"],
    statusWhenMissing: "placeholder",
    purpose: "Disabled device-risk enrichment pending validated configuration.",
    evidenceReference: "Device-risk event or visitor confidence signal",
    configuredNotes: "Device-risk key is present. Treat output as a session integrity signal.",
    missingNotes: "Device-risk provider is disabled until credentials and a validated workflow are configured.",
    implementationState: "placeholder",
    authProtection: "not_exposed",
  },
];

function envPresent(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

export function getVerificationProviderRegistry(): VerificationProviderDefinition[] {
  return providerBlueprints.map((provider) => {
    const presentEnv = provider.requiredEnv.filter(envPresent);
    const missingEnv = provider.requiredEnv.filter((name) => !envPresent(name));
    const enabled = missingEnv.length === 0 && (provider.enabledWhen?.() ?? true);
    const implementationState = enabled
      ? provider.implementationState === "active"
        ? "active"
        : "configured_unverified"
      : provider.statusWhenMissing === "safely_disabled"
        ? "safely_disabled"
        : "placeholder";

    return {
      id: provider.id,
      name: provider.name,
      category: provider.category,
      status: enabled ? "configured" : provider.statusWhenMissing,
      requiredEnv: provider.requiredEnv,
      presentEnv,
      missingEnv,
      purpose: provider.purpose,
      evidenceReference: provider.evidenceReference,
      notes: enabled ? provider.configuredNotes : provider.missingNotes,
      implementationState,
      usesMockData: provider.usesMockData ?? false,
      safeFailure: true,
      authProtection: provider.authProtection,
      replayIntegration: provider.replayIntegration ?? "not_connected",
      receiptIntegration: provider.receiptIntegration ?? "not_connected",
    };
  });
}

export function getVerificationProviderDefinition(id: VerificationProviderId) {
  return getVerificationProviderRegistry().find((provider) => provider.id === id);
}

export function providerRuntimeState(
  provider: VerificationProviderDefinition
): ProviderRuntimeState {
  if (provider.usesMockData) return "Simulated";
  if (provider.implementationState === "active" && provider.status === "configured") {
    return "Test Mode";
  }
  if (provider.implementationState === "configured_unverified") {
    return "Disabled";
  }
  if (provider.requiredEnv.length > 0 && provider.missingEnv.length > 0) {
    return "Awaiting Credentials";
  }
  return "Disabled";
}
