import { createPublicApiContext, publicApiSuccess } from "@/lib/api/public-contracts";
import { summarizeIntegrationStatus } from "@/lib/integrations/registry";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const integrations = summarizeIntegrationStatus();
  const optionalWarnings = [
    integrations.stripe,
    integrations.openai,
    integrations.worldId,
    integrations.email,
  ].filter((status) => status === "disabled").length;
  const deploymentState =
    integrations.supabase === "connected"
      ? optionalWarnings
        ? "CAUTION"
        : "READY"
      : "BLOCKED";

  return publicApiSuccess({
    status: "ok",
    deployment_state: deploymentState,
    warnings: optionalWarnings,
    integrations,
  }, createPublicApiContext(request, "status"));
}
