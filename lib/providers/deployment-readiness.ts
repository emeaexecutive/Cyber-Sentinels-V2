import { createClient } from "@supabase/supabase-js";
import { inspectHopaeProviderConfig } from "./adapters/hopae/hopae-config.ts";

export async function inspectHopaeDeploymentReadiness() {
  const inspected = inspectHopaeProviderConfig();
  const missingVariables = inspected.missing;
  const enabled = inspected.config.enabled;
  const environment = inspected.config.environment;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const callbackUrl = siteUrl ? `${siteUrl}/api/providers` : "not_configured";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  let migrationApplied = false;
  let lastExecution: Record<string, unknown> | null = null;

  if (supabaseUrl && serviceKey) {
    const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.from("provider_execution_records")
      .select("runtime_mode,status,updated_at,latency_ms,replay_reference,evidence_graph_reference,trust_memory_reference")
      .eq("provider_id", "hopae_connect")
      .eq("environment", environment)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    migrationApplied = !result.error;
    lastExecution = result.error ? null : result.data;
  }

  const linked = Boolean(lastExecution?.replay_reference && lastExecution?.evidence_graph_reference && lastExecution?.trust_memory_reference);
  const live = lastExecution?.runtime_mode === "Live" && lastExecution?.status === "completed" && linked;
  return {
    provider: "Hopae Connect",
    configured: inspected.configured,
    missingVariables,
    invalidVariables: inspected.invalid,
    enabled,
    environment,
    migrationApplied,
    callbackUrl,
    lastSuccessfulExecutionTimestamp: live ? lastExecution?.updated_at : null,
    lastExecutionStatus: lastExecution?.status ?? "not_recorded",
    lastLatencyMs: lastExecution?.latency_ms ?? null,
    evidenceLinkageState: linked ? "linked" : "incomplete",
    currentMaturityState: live ? "Live" : missingVariables.length ? "Awaiting Credentials" : "Test",
  };
}
