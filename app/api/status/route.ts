import { NextResponse } from "next/server";
import { summarizeIntegrationStatus } from "@/lib/integrations/registry";

export const dynamic = "force-dynamic";

export function GET() {
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

  return NextResponse.json({
    ok: true,
    status: "ok",
    deployment_state: deploymentState,
    warnings: optionalWarnings,
    integrations,
    timestamp: new Date().toISOString(),
  });
}
