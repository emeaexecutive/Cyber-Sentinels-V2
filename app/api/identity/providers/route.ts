import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityFailure, identitySuccess } from "@/lib/identity-signals/http";
import { identityRepository } from "@/lib/identity-signals/repository";

export async function GET(request: Request) {
  try {
    await resolveIdentityEnterprise(request);
    const capabilities = await identityRepository().capabilities();
    const hopae = inspectHopaeProviderConfig();
    return identitySuccess({ capabilities: capabilities.map((capability) => capability.provider_id === "hopae_connect" ? { ...capability, runtime_status: !hopae.config.enabled ? "DISABLED" : hopae.configured ? "AVAILABLE" : "BLOCKED_BY_CREDENTIALS", configurationPresent: hopae.configured } : capability), truthNotice: "AVAILABLE means the required local configuration is present; it does not claim a successful live verification." });
  } catch (error) { return identityFailure(error); }
}
