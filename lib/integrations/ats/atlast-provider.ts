import "server-only";

import { GenericATSProvider } from "@/lib/integrations/ats/generic-provider";
import type { ATSProviderDefinition } from "@/lib/integrations/ats/types";

export function getAtlastProviderDefinition(): ATSProviderDefinition {
  return {
    id: "atlast",
    name: "Atlast",
    status: "Placeholder",
    capabilities: [
      "candidate_events",
      "interview_events",
      "offer_events",
      "verification_trigger",
      "receipt_export",
      "replay_link",
    ],
    credentialEnv: "ATS_ATLAST_API_KEY",
    endpointEnv: "ATS_ATLAST_RECEIPT_ENDPOINT",
    webhookSecretEnv: "ATS_ATLAST_WEBHOOK_SECRET",
    credentialsPresent: false,
    endpointConfigured: false,
    webhookConfigured: false,
    apiAccessVerified: false,
    notes:
      "Placeholder only. Awaiting Atlast API documentation and credentials; no live integration is claimed.",
  };
}

export class AtlastATSProvider extends GenericATSProvider {
  constructor() {
    super(getAtlastProviderDefinition());
  }
}
