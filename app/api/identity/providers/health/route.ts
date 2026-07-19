import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import { HopaeAdapter } from "@/lib/providers/adapters/hopae/hopae-adapter";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityCorrelationId, identityFailure, identitySuccess } from "@/lib/identity-signals/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = identityCorrelationId(request);
  try {
    await resolveIdentityEnterprise(request);
    const config = inspectHopaeProviderConfig();
    const hopae = config.configured
      ? await new HopaeAdapter({ correlationId: crypto.randomUUID() }).healthCheck()
      : { provider: "hopae_connect", environment: config.config.environment, configured: false, enabled: config.config.enabled, state: config.config.enabled ? "MISCONFIGURED" : "DISABLED", reason: config.config.enabled ? "Required credentials or configuration are missing." : "Provider is disabled.", checkedAt: new Date().toISOString(), latencyMs: null, providerRequestId: null };
    const worldId = {
      provider: "world_id",
      configured: false,
      enabled: false,
      state: "BLOCKED",
      reasonCode: "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED",
      reason: "Proof received — server verification pending.",
      confidence: 0,
      serverVerified: false,
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      providerRequestId: null,
    };
    const placeholders = ["email", "phone", "ip_reputation", "network_anonymity", "geolocation", "device_context"].map((provider) => ({
      provider,
      configured: provider === "device_context" ? Boolean(process.env.SECURITY_HASH_SECRET) : false,
      enabled: false,
      state: provider === "device_context" ? "INCONCLUSIVE" : "UNAVAILABLE",
      reasonCode: provider === "device_context" ? "CLIENT_REPORTED_DEVICE_CONTEXT" : "PROVIDER_ADAPTER_NOT_IMPLEMENTED",
      reason: provider === "device_context" ? "Context collection is non-verifying and depends on SECURITY_HASH_SECRET." : "No provider adapter is configured.",
      confidence: 0,
      serverVerified: false,
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      providerRequestId: null,
    }));
    return identitySuccess({ providers: [hopae, worldId, ...placeholders] }, 200, correlationId);
  } catch (error) { return identityFailure(error, correlationId); }
}
