import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import { HopaeAdapter } from "@/lib/providers/adapters/hopae/hopae-adapter";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityFailure, identitySuccess } from "@/lib/identity-signals/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveIdentityEnterprise(request);
    const config = inspectHopaeProviderConfig();
    const hopae = config.configured
      ? await new HopaeAdapter({ correlationId: crypto.randomUUID() }).healthCheck()
      : { provider: "hopae_connect", environment: config.config.environment, configured: false, enabled: config.config.enabled, state: config.config.enabled ? "MISCONFIGURED" : "DISABLED", reason: config.config.enabled ? "Required credentials or configuration are missing." : "Provider is disabled.", checkedAt: new Date().toISOString(), latencyMs: null, providerRequestId: null };
    return identitySuccess({ providers: [hopae, { provider: "world_id", configured: false, enabled: false, state: "MISCONFIGURED", reason: "Server verification exchange is not connected.", checkedAt: new Date().toISOString(), latencyMs: null, providerRequestId: null }, ...["email","phone","ip_reputation","network_anonymity","geolocation","device_context"].map((provider) => ({ provider, configured: provider === "device_context" ? Boolean(process.env.SECURITY_HASH_SECRET) : false, enabled: false, state: "DISABLED", reason: provider === "device_context" ? "Context collection is non-verifying and depends on SECURITY_HASH_SECRET." : "No provider adapter is configured.", checkedAt: new Date().toISOString(), latencyMs: null, providerRequestId: null }))] });
  } catch (error) { return identityFailure(error); }
}
