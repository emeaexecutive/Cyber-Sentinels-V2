import "server-only";

export type IntegrationProvider =
  | "Supabase"
  | "Stripe"
  | "OpenAI"
  | "World ID"
  | "Hopae Connect"
  | "Email";

export type IntegrationStatus =
  | "configured"
  | "missing"
  | "disabled"
  | "unsafe";

export type IntegrationRiskLevel = "low" | "medium" | "high";

export type IntegrationRegistryItem = {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  purpose: string;
  required_env: string[];
  present_env: string[];
  missing_env: string[];
  risk_level: IntegrationRiskLevel;
  notes: string;
  checked_at: string;
};

type IntegrationDefinition = {
  provider: IntegrationProvider;
  purpose: string;
  requiredEnv: string[];
  optional: boolean;
  riskLevel: IntegrationRiskLevel;
  configuredNotes: string;
  missingNotes: string;
  enabledWhen?: () => boolean;
};

const definitions: IntegrationDefinition[] = [
  {
    provider: "Supabase",
    purpose: "Authentication, database, storage and core operational trust records.",
    requiredEnv: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    optional: false,
    riskLevel: "low",
    configuredNotes: "Core Supabase variables are present. Secret values are hidden.",
    missingNotes: "Core Supabase configuration is incomplete.",
  },
  {
    provider: "Stripe",
    purpose: "Billing, checkout, customer portal and webhook verification.",
    requiredEnv: [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRO_MONTHLY_PRICE_ID",
    ],
    optional: true,
    riskLevel: "medium",
    configuredNotes: "Stripe billing variables are present. Secret values are hidden.",
    missingNotes: "Not configured yet. Billing should remain disabled until configured.",
  },
  {
    provider: "OpenAI",
    purpose: "AI-assisted governance summaries and operational recommendations only.",
    requiredEnv: ["OPENAI_API_KEY"],
    optional: true,
    riskLevel: "medium",
    configuredNotes: "OpenAI API key is present. AI remains assistive; humans decide.",
    missingNotes: "Not configured yet. AI-assisted governance should remain disabled.",
  },
  {
    provider: "World ID",
    purpose: "Optional human verification proof handling for World ID workflows.",
    requiredEnv: ["WORLD_ACTION"],
    optional: true,
    riskLevel: "medium",
    configuredNotes: "World ID action is present. Backend verification remains provider-bound.",
    missingNotes: "Not configured yet. World ID verification remains disabled or placeholder-only.",
  },
  {
    provider: "Hopae Connect",
    purpose: "Optional upstream eID verification evidence for Cyber Sentinels governance.",
    requiredEnv: ["HOPAE_CLIENT_ID", "HOPAE_CLIENT_SECRET", "HOPAE_WEBHOOK_SECRET"],
    optional: true,
    riskLevel: "medium",
    enabledWhen: () => process.env.HOPAE_ENABLED?.trim().toLowerCase() === "true",
    configuredNotes: "Hopae Connect is enabled for upstream identity proof. Cyber Sentinels remains the decision layer.",
    missingNotes: "Safely disabled. Set HOPAE_ENABLED=true and configure server-side credentials to activate it.",
  },
  {
    provider: "Email",
    purpose: "Optional transactional email delivery for notifications and pilot communications.",
    requiredEnv: ["RESEND_API_KEY"],
    optional: true,
    riskLevel: "medium",
    configuredNotes: "Email provider variables are present. In-app notifications remain the source of record.",
    missingNotes: "Not configured yet. Email delivery remains disabled; in-app notifications continue to operate.",
  },
];

function envPresent(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

export function getIntegrationRegistry(checkedAt = new Date().toISOString()) {
  return definitions.map((definition): IntegrationRegistryItem => {
    const presentEnv = definition.requiredEnv.filter(envPresent);
    const missingEnv = definition.requiredEnv.filter((name) => !envPresent(name));
    const configured = missingEnv.length === 0 && (definition.enabledWhen?.() ?? true);
    const status: IntegrationStatus = configured
      ? "configured"
      : definition.optional
        ? "disabled"
        : "missing";

    return {
      provider: definition.provider,
      status,
      purpose: definition.purpose,
      required_env: definition.requiredEnv,
      present_env: presentEnv,
      missing_env: missingEnv,
      risk_level: configured ? definition.riskLevel : definition.optional ? "low" : "high",
      notes: configured ? definition.configuredNotes : definition.missingNotes,
      checked_at: checkedAt,
    };
  });
}

export function summarizeIntegrationStatus() {
  const registry = getIntegrationRegistry();

  return {
    supabase:
      registry.find((item) => item.provider === "Supabase")?.status === "configured"
        ? "connected"
        : "missing",
    stripe:
      registry.find((item) => item.provider === "Stripe")?.status === "configured"
        ? "configured"
        : "disabled",
    openai:
      registry.find((item) => item.provider === "OpenAI")?.status === "configured"
        ? "configured"
        : "disabled",
    worldId:
      registry.find((item) => item.provider === "World ID")?.status === "configured"
        ? "configured"
        : "disabled",
    hopae:
      registry.find((item) => item.provider === "Hopae Connect")?.status === "configured"
        ? "configured"
        : "disabled",
    email:
      registry.find((item) => item.provider === "Email")?.status === "configured"
        ? "configured"
        : "disabled",
  };
}
