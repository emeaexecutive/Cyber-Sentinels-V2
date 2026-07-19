import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import { identityRepository } from "@/lib/identity-signals/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const capabilities = await identityRepository().capabilities();
    const hopae = inspectHopaeProviderConfig();
    return Response.json({ schemaVersion: 1, service: "identity-signals", status: "operational", databaseSchema: "available", capabilityCount: capabilities.length, hopae: hopae.configured ? "configured_not_live_verified" : hopae.config.enabled ? "misconfigured" : "disabled", worldId: "server_verification_not_connected", checkedAt: new Date().toISOString() });
  } catch {
    return Response.json({ schemaVersion: 1, service: "identity-signals", status: "degraded", databaseSchema: "unavailable", checkedAt: new Date().toISOString() }, { status: 503 });
  }
}
