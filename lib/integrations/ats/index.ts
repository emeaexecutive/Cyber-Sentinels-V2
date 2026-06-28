import "server-only";

import { GenericATSProvider } from "@/lib/integrations/ats/generic-provider";
import type {
  ATSProviderDefinition,
  ATSProviderId,
  ATSProviderStatus,
} from "@/lib/integrations/ats/types";

export * from "@/lib/integrations/ats/types";

type BaseDefinition = Omit<
  ATSProviderDefinition,
  | "status"
  | "credentialsPresent"
  | "endpointConfigured"
  | "webhookConfigured"
  | "apiAccessVerified"
  | "notes"
>;

const providerDefinitions: BaseDefinition[] = [
  {
    id: "greenhouse",
    name: "Greenhouse",
    credentialEnv: "ATS_GREENHOUSE_API_KEY",
    endpointEnv: "ATS_GREENHOUSE_RECEIPT_ENDPOINT",
    webhookSecretEnv: "ATS_GREENHOUSE_WEBHOOK_SECRET",
    capabilities: ["candidate_events", "interview_events", "offer_events", "verification_trigger", "receipt_export", "replay_link"],
  },
  {
    id: "lever",
    name: "Lever",
    credentialEnv: "ATS_LEVER_API_KEY",
    endpointEnv: "ATS_LEVER_RECEIPT_ENDPOINT",
    webhookSecretEnv: "ATS_LEVER_WEBHOOK_SECRET",
    capabilities: ["candidate_events", "interview_events", "offer_events", "verification_trigger", "receipt_export", "replay_link"],
  },
  {
    id: "workday",
    name: "Workday",
    credentialEnv: "ATS_WORKDAY_API_KEY",
    endpointEnv: "ATS_WORKDAY_RECEIPT_ENDPOINT",
    webhookSecretEnv: "ATS_WORKDAY_WEBHOOK_SECRET",
    capabilities: ["candidate_events", "interview_events", "offer_events", "verification_trigger", "receipt_export", "replay_link"],
  },
  {
    id: "ashby",
    name: "Ashby",
    credentialEnv: "ATS_ASHBY_API_KEY",
    endpointEnv: "ATS_ASHBY_RECEIPT_ENDPOINT",
    webhookSecretEnv: "ATS_ASHBY_WEBHOOK_SECRET",
    capabilities: ["candidate_events", "interview_events", "offer_events", "verification_trigger", "receipt_export", "replay_link"],
  },
  {
    id: "smartrecruiters",
    name: "SmartRecruiters",
    credentialEnv: "ATS_SMARTRECRUITERS_API_KEY",
    endpointEnv: "ATS_SMARTRECRUITERS_RECEIPT_ENDPOINT",
    webhookSecretEnv: "ATS_SMARTRECRUITERS_WEBHOOK_SECRET",
    capabilities: ["candidate_events", "interview_events", "offer_events", "verification_trigger", "receipt_export", "replay_link"],
  },
  {
    id: "atlas",
    name: "ATLAST / Atlas",
    credentialEnv: "ATS_ATLAS_API_KEY",
    endpointEnv: "ATS_ATLAS_RECEIPT_ENDPOINT",
    webhookSecretEnv: "ATS_ATLAS_WEBHOOK_SECRET",
    capabilities: ["candidate_events", "interview_events", "offer_events", "verification_trigger", "receipt_export", "replay_link"],
  },
];

function present(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

function statusFor(definition: BaseDefinition): ATSProviderStatus {
  const prefix = `ATS_${definition.id.toUpperCase()}_ENABLED`;
  const enabledValue = String(process.env[prefix] ?? "").trim().toLowerCase();
  const credentialsPresent = present(definition.credentialEnv);
  const endpointConfigured = present(definition.endpointEnv);
  const webhookConfigured = present(definition.webhookSecretEnv);

  if (enabledValue === "false") return "Disabled";
  if (credentialsPresent && endpointConfigured) return "Connected";
  if (webhookConfigured) return "Webhook configured";
  if (enabledValue === "true" && !credentialsPresent) {
    return "Awaiting API credentials";
  }
  return "Placeholder";
}

export function getATSProviderDefinitions(): ATSProviderDefinition[] {
  return providerDefinitions.map((definition) => {
    const status = statusFor(definition);
    const credentialsPresent = present(definition.credentialEnv);
    const endpointConfigured = present(definition.endpointEnv);
    const webhookConfigured = present(definition.webhookSecretEnv);
    const apiAccessVerified = credentialsPresent && endpointConfigured;

    return {
      ...definition,
      status,
      credentialsPresent,
      endpointConfigured,
      webhookConfigured,
      apiAccessVerified,
      notes:
        status === "Connected"
          ? "Server-side API credentials and receipt endpoint are configured. Live provider behavior still requires provider-side validation."
          : status === "Webhook configured"
            ? "Signed inbound events are configured; outbound API access is not connected."
            : status === "Awaiting API credentials"
              ? "Provider enablement was requested, but required API credentials are absent."
              : status === "Disabled"
                ? "Integration is explicitly disabled."
                : definition.id === "atlas"
                  ? "Adapter placeholder only. Activate after ATLAST/Atlas API access and documentation are verified."
                  : "Generic adapter placeholder only. No live provider connection is claimed.",
    };
  });
}

export function getATSProvider(id: string) {
  const definition = getATSProviderDefinitions().find(
    (candidate) => candidate.id === id
  );
  return definition ? new GenericATSProvider(definition) : null;
}

export function getATSProviderSecret(id: ATSProviderId) {
  const definition = getATSProviderDefinitions().find(
    (candidate) => candidate.id === id
  );
  if (!definition) return "";
  return String(
    process.env[definition.webhookSecretEnv] ??
      process.env.ATS_WEBHOOK_SECRET ??
      ""
  ).trim();
}
