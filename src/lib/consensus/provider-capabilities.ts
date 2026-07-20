import type { ProviderCapability } from "./types.ts";

const placeholders = ["stripe_identity", "persona", "entrust", "onfido", "email", "phone", "ip_reputation", "network_anonymity", "geolocation", "device_context"] as const;
const enabled = (env: Record<string, string | undefined>, key: string) => env[key]?.trim().toLowerCase() === "true";
const present = (env: Record<string, string | undefined>, keys: string[]) => keys.every((key) => Boolean(env[key]?.trim()));

export function providerCapabilities(env: Record<string, string | undefined> = process.env): ProviderCapability[] {
  const hopaeEnabled = enabled(env, "HOPAE_ENABLED");
  const hopaeConfigured = present(env, ["HOPAE_CLIENT_ID", "HOPAE_CLIENT_SECRET", "HOPAE_WEBHOOK_SECRET", "HOPAE_PROVIDER_ID"]);
  const hopaeState = !hopaeEnabled ? "DISABLED" : hopaeConfigured ? "ACTIVE" : "BLOCKED";
  return [
    { providerKey: "hopae_connect", displayName: "Hopae Connect", version: "consensus-capability-v1", state: hopaeState, baseWeight: hopaeState === "ACTIVE" ? 0.9 : 0, positiveEvidence: hopaeState === "ACTIVE", supportedSignals: ["identity_verification", "document_verification", "government_identity"], independenceGroup: "government_identity", cryptographicVerificationRequired: true, serverVerificationRequired: false, freshnessWindowSeconds: 86_400, reasonCodes: hopaeState === "ACTIVE" ? ["HOPAE_SIGNED_PATH_AVAILABLE"] : [hopaeState === "BLOCKED" ? "HOPAE_CREDENTIALS_INCOMPLETE" : "HOPAE_DISABLED"] },
    { providerKey: "world_id", displayName: "World ID", version: "consensus-capability-v1", state: "BLOCKED", baseWeight: 0, positiveEvidence: false, supportedSignals: ["proof_of_personhood"], independenceGroup: "identity_orchestration", cryptographicVerificationRequired: false, serverVerificationRequired: true, freshnessWindowSeconds: 3_600, reasonCodes: ["WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"] },
    ...placeholders.map((providerKey): ProviderCapability => ({ providerKey, displayName: providerKey.replaceAll("_", " "), version: "consensus-capability-v1", state: "UNSUPPORTED", baseWeight: 0, positiveEvidence: false, supportedSignals: [], independenceGroup: providerKey.includes("email") ? "email_reputation" : providerKey.includes("phone") ? "phone_reputation" : providerKey.includes("device") ? "device_reputation" : "identity_orchestration", cryptographicVerificationRequired: true, serverVerificationRequired: true, freshnessWindowSeconds: 0, reasonCodes: ["PROVIDER_ADAPTER_NOT_IMPLEMENTED"] })),
  ];
}

export function providerCapability(providerKey: string, env?: Record<string, string | undefined>) {
  return providerCapabilities(env).find((provider) => provider.providerKey === providerKey.toLowerCase()) ?? null;
}
