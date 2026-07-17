import { redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  buildProviderReadinessChecklist,
  providerRealityState,
  summarizeProviderReadiness,
} from "@/lib/providers/provider-readiness";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";

export const dynamic = "force-dynamic";

function statusTone(state: string) {
  const normalized = state.toLowerCase().replaceAll("_", " ");
  if (normalized === "production") return "border-emerald-800 text-emerald-200";
  if (normalized === "sandbox") return "border-cyan-800 text-cyan-200";
  if (normalized === "awaiting credentials") return "border-amber-800 text-amber-200";
  if (normalized === "disabled") return "border-red-800 text-red-200";
  return "border-zinc-700 text-zinc-300";
}

export default async function ProviderStatusAdminPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login?next=/admin/provider-status");
    redirect("/back-office?denied=1");
  }
  await requireAdminPageAccess(supabase, { path: "/admin/provider-status" });

  const providerReadinessChecks = buildProviderReadinessChecklist();
  const providerReadiness = summarizeProviderReadiness(providerReadinessChecks);
  const healthByProviderId = new Map(providerReadiness.healthSummaries.map((item) => [item.providerId, item]));
  const admin = createServiceRoleClient();
  const [registryResult, executionResult, evidenceResult, auditResult] = await Promise.all([
    admin.from("provider_registry").select("provider_id,display_name,adapter_version,api_version,environment,enabled,configured_state,health_status,last_successful_call,last_failed_call,last_health_check,timeout_ms,retry_policy,retention_classification,data_residency_notes,updated_at").eq("provider_id", "hopae_connect").maybeSingle(),
    admin.from("provider_execution_records").select("environment,runtime_mode,status,signature_status,idempotency_status,latency_ms,callback_received_at,replay_reference,evidence_graph_reference,trust_memory_reference,updated_at").eq("provider_id", "hopae_connect").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("normalized_identity_evidence").select("evidence_type,outcome,observed_at,expires_at,mapping_version,replay_reference,evidence_graph_reference,trust_memory_reference,created_at").eq("provider_id", "hopae_connect").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("provider_state_audit").select("enabled,reason,changed_at").eq("provider_id", "hopae_connect").order("changed_at", { ascending: false }).limit(5),
  ]);
  const hopaeConfig = inspectHopaeProviderConfig();
  const registry = registryResult.error ? null : registryResult.data;
  const latestExecution = executionResult.error ? null : executionResult.data;
  const latestEvidence = evidenceResult.error ? null : evidenceResult.data;
  const stateAudit = auditResult.error ? [] : auditResult.data ?? [];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <h1 className="mt-4 text-4xl font-semibold">Provider Operations</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Runtime status for auth, MFA, geo intelligence and provider orchestration. States describe configuration and code-path readiness; they do not claim biometric certainty, provider accuracy or delivered SMS messages.
          </p>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(providerReadiness.operationsStates).map(([label, count]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs capitalize text-zinc-500">{label.replace(/([A-Z])/g, " $1")}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{count}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-cyan-950/10 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Provider Abstraction Layer · Hopae Connect</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Environment", hopaeConfig.config.environment],
              ["Configuration", !hopaeConfig.config.enabled ? "DISABLED" : hopaeConfig.configured ? "CONFIGURED" : "MISCONFIGURED"],
              ["Registry", registry ? (registry.enabled ? "Enabled" : "Disabled") : "Migration awaiting verification"],
              ["Health", registry?.health_status ?? "UNKNOWN"],
              ["Adapter / API", `${registry?.adapter_version ?? "pal-hopae-1.0.0"} / ${registry?.api_version ?? "connect-v1"}`],
              ["Callback security", latestExecution?.signature_status ?? "Awaiting signed callback"],
              ["Last execution", latestExecution?.status ?? "Awaiting data"],
              ["Latency", latestExecution?.latency_ms == null ? "Awaiting data" : `${latestExecution.latency_ms} ms`],
              ["Mapping", latestEvidence?.mapping_version ?? "hopae-connect-v1-2026-07-17"],
              ["Evidence freshness", latestEvidence?.observed_at ?? "Awaiting data"],
              ["Idempotency", latestExecution?.idempotency_status ?? "Awaiting callback"],
              ["Retention", registry?.retention_classification ?? "normalized evidence only"],
            ].map(([label, value]) => (
              <article key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
                <p className="mt-2 text-sm text-zinc-200">{String(value)}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Replay: {latestExecution?.replay_reference ?? "Awaiting data"} · Evidence Graph: {latestExecution?.evidence_graph_reference ?? "Awaiting data"} · Trust Memory: {latestExecution?.trust_memory_reference ?? "Awaiting data"}. Trust Decision remains authoritative; no secret values are available on this surface.
          </p>
          <div className="mt-4 grid gap-2 text-xs text-zinc-500">
            {stateAudit.length ? stateAudit.map((item, index) => <p key={`${item.changed_at}-${index}`}>{item.changed_at}: {item.enabled ? "enabled" : "disabled"} · {item.reason}</p>) : <p>No provider state audit is available. No enablement is inferred.</p>}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Readiness checklist</p>
          <h2 className="mt-3 text-xl font-semibold">Provider integration gates</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {providerReadiness.evidence} {providerReadiness.nextAction} Authentication and auxiliary controls remain visible in Enterprise Readiness, avoiding a second provider registry here.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {providerReadinessChecks.map((provider) => (
              <article key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-100">{provider.name}</p>
                    <p className="mt-1 text-xs text-zinc-600">{provider.purpose}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(providerRealityState(provider))}`}>
                    {providerRealityState(provider)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-zinc-500">
                  <p>Current status: {provider.runtimeState}</p>
                  <p>Health: {healthByProviderId.get(provider.id)?.state ?? "Unknown"}</p>
                  <p>Availability: {healthByProviderId.get(provider.id)?.availability ?? "Unknown"}</p>
                  <p>Latency: {healthByProviderId.get(provider.id)?.latencyMs === null || healthByProviderId.get(provider.id)?.latencyMs === undefined ? "Awaiting data" : `${healthByProviderId.get(provider.id)?.latencyMs} ms`}</p>
                  <p>Credential state: {provider.credentialState.replaceAll("_", " ")}</p>
                  <p>Adapter maturity: {provider.adapterMaturity.replaceAll("_", " ")}</p>
                  <p>Last successful connection: {provider.lastSuccessfulCheck ?? "No successful real connection recorded"}</p>
                  <p>Supported signals: {provider.supportedFeatures.join(", ")}</p>
                  <p>Confidence: {healthByProviderId.get(provider.id)?.confidence === null || healthByProviderId.get(provider.id)?.confidence === undefined ? "Unavailable" : `${Math.round((healthByProviderId.get(provider.id)?.confidence ?? 0) * 100)}%`}</p>
                  <p>Error rate: {healthByProviderId.get(provider.id)?.errorRate === null || healthByProviderId.get(provider.id)?.errorRate === undefined ? "Unavailable" : `${Math.round((healthByProviderId.get(provider.id)?.errorRate ?? 0) * 100)}% of retained health observations`}</p>
                  <p>Retry state: {healthByProviderId.get(provider.id)?.retryState ?? "Inactive"}</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Normalized response: {provider.normalizedResultImplemented ? "implemented" : "not implemented"}. {healthByProviderId.get(provider.id)?.evidence}
                </p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">Known limitations: {provider.limitations.join(" ")}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={provider.documentationHref} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-cyan-200 hover:border-cyan-700">Documentation</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
