import { normalizeConsentChoices } from "./policy.ts";
import type { ConsentChoices } from "./types.ts";

export type ConsentIntegrationKey = "google_tag_manager" | "google_analytics" | "posthog" | "plausible" | "cloudflare_zaraz" | "onetrust_import" | "cookiebot_import";
export type ConsentIntegrationAdapter = { key: ConsentIntegrationKey; mode: "HOOK_ONLY" | "MIGRATION_IMPORT"; enabled: boolean; requiresExternalSdk: boolean };

export const consentIntegrationAdapters: ConsentIntegrationAdapter[] = [
  { key: "google_tag_manager", mode: "HOOK_ONLY", enabled: false, requiresExternalSdk: true },
  { key: "google_analytics", mode: "HOOK_ONLY", enabled: false, requiresExternalSdk: true },
  { key: "posthog", mode: "HOOK_ONLY", enabled: false, requiresExternalSdk: true },
  { key: "plausible", mode: "HOOK_ONLY", enabled: false, requiresExternalSdk: true },
  { key: "cloudflare_zaraz", mode: "HOOK_ONLY", enabled: false, requiresExternalSdk: true },
  { key: "onetrust_import", mode: "MIGRATION_IMPORT", enabled: false, requiresExternalSdk: false },
  { key: "cookiebot_import", mode: "MIGRATION_IMPORT", enabled: false, requiresExternalSdk: false },
];

export function mapHistoricalConsent(input: unknown): ConsentChoices {
  // Only explicit boolean grants survive migration. Missing, inferred or
  // vendor-specific ambiguous values remain denied and are never fabricated.
  return normalizeConsentChoices(input, "GLOBAL_DEFAULT");
}
