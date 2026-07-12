import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { getMfaStatus } from "@/lib/auth/mfa";
import { buildPlatformHealth, type ProviderOperationalHealth } from "@/lib/core/platform-health";
import { getVerificationProviderRegistry } from "@/lib/providers";
import { buildProviderReadinessChecklist, summarizeProviderReadiness } from "@/lib/providers/provider-readiness";
import { orchestrateProviders } from "@/lib/providers/provider-orchestrator";
import { evaluateGeoSessionIntelligence } from "@/lib/runtime/geo-session-intelligence";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function statusTone(state: string) {
  const normalized = state.toLowerCase().replaceAll("_", " ");
  if (normalized === "healthy") return "border-emerald-800 text-emerald-200";
  if (normalized === "configured") return "border-cyan-800 text-cyan-200";
  if (normalized === "degraded" || normalized === "awaiting credentials") return "border-amber-800 text-amber-200";
  if (normalized === "offline") return "border-red-800 text-red-200";
  return "border-zinc-700 text-zinc-300";
}

function providerOperationalLabel(state: ProviderOperationalHealth) {
  return state.replaceAll("_", " ");
}

export default async function ProviderStatusAdminPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login?next=/admin/provider-status");
    redirect("/back-office?denied=1");
  }
  await requireAdminPageAccess(supabase, { path: "/admin/provider-status" });

  const registry = getVerificationProviderRegistry();
  const providerReadinessChecks = buildProviderReadinessChecklist();
  const providerReadiness = summarizeProviderReadiness(providerReadinessChecks);
  const providerSnapshot = await orchestrateProviders({ timeoutMs: 220, includeDisabled: true });
  const platformHealth = buildPlatformHealth({ providerSnapshot, authConfigured: true });
  const platformProviderByName = new Map(platformHealth.providers.map((provider) => [provider.name, provider]));
  const mfa = getMfaStatus();
  const geo = evaluateGeoSessionIntelligence({ currentCountry: "unknown", currentDevice: "server runtime" });
  const rows = [
    {
      name: "Supabase email auth",
      state: "configured",
      latency: "runtime managed",
      notes: "Password, email verification and session cookies are handled by Supabase auth.",
    },
    {
      name: "Magic links",
      state: "configured",
      latency: "runtime managed",
      notes: "Magic-link requests use Supabase OTP email flow with existing rate-limit handling.",
    },
    {
      name: "MFA provider",
      state: mfa.step_up_available ? "configured" : "awaiting credentials",
      latency: "not measured",
      notes: mfa.summary,
    },
    {
      name: "SMS provider",
      state: mfa.sms_otp === "Live" ? "configured" : "awaiting credentials",
      latency: "not measured",
      notes: mfa.sms_otp === "Live" ? "SMS provider configuration is present." : "Awaiting Credentials.",
    },
    {
      name: "Geo intelligence",
      state: "degraded",
      latency: "heuristic",
      notes: geo.limitations[0],
    },
    {
      name: "Provider orchestration",
      state: providerSnapshot.some((provider) => ["Timeout", "Failed"].includes(provider.state))
        ? "offline"
        : providerSnapshot.some((provider) => provider.state === "Live")
          ? "configured"
          : "degraded",
      latency: `${Math.max(...providerSnapshot.map((provider) => provider.latency_ms), 0)}ms max snapshot latency`,
      notes: "Provider orchestration summarizes adapter states and isolates degraded providers from the decision path.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <h1 className="mt-4 text-4xl font-semibold">Provider Status</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Runtime status for auth, MFA, geo intelligence and provider orchestration. States describe configuration and code-path readiness; they do not claim biometric certainty, provider accuracy or delivered SMS messages.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <article key={row.name} className="rounded-lg border border-zinc-800 bg-black p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-100">{row.name}</h2>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(row.state)}`}>{row.state}</span>
              </div>
              <p className="mt-3 text-sm text-zinc-500">Latency: {row.latency}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{row.notes}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Readiness checklist</p>
          <h2 className="mt-3 text-xl font-semibold">Provider integration gates</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {providerReadiness.evidence} {providerReadiness.nextAction}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {providerReadinessChecks.map((provider) => (
              <article key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-100">{provider.name}</p>
                    <p className="mt-1 text-xs text-zinc-600">{provider.category.replaceAll("_", " ")}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${statusTone(platformProviderByName.get(provider.name)?.state ?? "degraded")}`}>
                    {providerOperationalLabel(platformProviderByName.get(provider.name)?.state ?? "degraded")}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <p>Credentials: {provider.credentialPresent ? "present" : "missing"}</p>
                  <p>Health check: {provider.healthCheckAvailable ? "yes" : "no"}</p>
                  <p>Test mode: {provider.testModeAvailable ? "yes" : "no"}</p>
                  <p>Production: {provider.productionModeAvailable ? "yes" : "no"}</p>
                  <p>Normalized: {provider.normalizedResultImplemented ? "yes" : "no"}</p>
                  <p>Timeouts: {provider.timeoutHandlingImplemented ? "yes" : "no"}</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{provider.evidence}</p>
                <p className="mt-3 text-xs leading-5 text-amber-200">Blocker: {provider.blocker}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Verification provider registry</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {registry.map((provider) => {
              const operationalState = platformProviderByName.get(provider.name)?.state ?? "degraded";
              return (
                <article key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{provider.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">{provider.category.replaceAll("_", " ")}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${statusTone(operationalState)}`}>{providerOperationalLabel(operationalState)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{provider.notes}</p>
                  <p className="mt-3 text-xs text-zinc-600">
                    Missing env: {provider.missingEnv.length ? provider.missingEnv.join(", ") : "none"} / replay: {provider.replayIntegration}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
