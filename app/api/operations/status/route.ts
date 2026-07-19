import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityCorrelationId, identityFailure, identitySuccess } from "@/lib/identity-signals/http";
import { externalControlTruth, type ExternalControlTruth } from "@/lib/operations/external-control-truth";
import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = identityCorrelationId(request);
  try {
    await resolveIdentityEnterprise(request);
    const hopae = inspectHopaeProviderConfig();
    const controls: ExternalControlTruth[] = [
      {
        id: "identity-tenant-authorization",
        label: "Identity tenant authorization",
        state: "VERIFIED_FROM_RUNTIME",
        reasonCode: "AUTHENTICATED_TENANT_CONTEXT_RESOLVED",
        evidence: ["The authenticated request resolved an authorized enterprise membership."],
      },
      {
        id: "identity-api-contracts",
        label: "Identity enterprise API contracts",
        state: "VERIFIED_FROM_REPOSITORY",
        reasonCode: "IDENTITY_API_ROUTES_PRESENT",
        evidence: ["Protected identity provider, health, verification, subject signal and confidence routes are compiled in this release."],
      },
      {
        id: "hopae-configuration",
        label: "Hopae runtime configuration",
        state: hopae.configured ? "BLOCKED_BY_EXTERNAL_CONFIGURATION" : "NOT_CONFIGURED",
        reasonCode: hopae.configured ? "HOPAE_LIVE_TRANSACTION_REQUIRED" : "HOPAE_CONFIGURATION_NOT_PRESENT",
        evidence: [],
      },
      ...externalControlTruth(),
    ];
    return identitySuccess({
      controls,
      truthNotice: "External production controls remain blocked until authoritative evidence is supplied directly by their control planes.",
    }, 200, correlationId);
  } catch (error) { return identityFailure(error, correlationId); }
}
