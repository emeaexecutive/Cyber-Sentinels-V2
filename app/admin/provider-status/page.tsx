import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { getMfaStatus } from "@/lib/auth/mfa";
import { getVerificationProviderRegistry, providerRuntimeState } from "@/lib/providers";
import { orchestrateProviders } from "@/lib/providers/provider-orchestrator";
import { evaluateGeoSessionIntelligence } from "@/lib/runtime/geo-session-intelligence";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function statusTone(state: string) {
  if (state === "Live") return "border-emerald-800 text-emerald-200";
  if (state === "Simulated") return "border-cyan-800 text-cyan-200";
  if (state === "Awaiting Credentials") return "border-amber-800 text-amber-200";
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

  const registry = getVerificationProviderRegistry();
  const providerSnapshot = await orchestrateProviders({ timeoutMs: 220, includeDisabled: true });
  const mfa = getMfaStatus();
  const geo = evaluateGeoSessionIntelligence({ currentCountry: "unknown", currentDevice: "server runtime" });
  const rows = [
    {
      name: "Supabase email auth",
      state: "Live",
      latency: "runtime managed",
      notes: "Password, email verification and session cookies are handled by Supabase auth.",
    },
    {
      name: "Magic links",
      state: "Live",
      latency: "runtime managed",
      notes: "Magic-link requests use Supabase OTP email flow with existing rate-limit handling.",
    },
    {
      name: "MFA provider",
      state: mfa.authenticator_app,
      latency: "not measured",
      notes: mfa.summary,
    },
    {
      name: "SMS provider",
      state: mfa.sms_otp,
      latency: "not measured",
      notes: mfa.sms_otp === "Live" ? "SMS provider configuration is present." : "Awaiting Credentials.",
    },
    {
      name: "Geo intelligence",
      state: "Simulated",
      latency: "heuristic",
      notes: geo.limitations[0],
    },
    {
      name: "Provider orchestration",
      state: providerSnapshot.some((provider) => provider.state === "Live") ? "Live" : "Simulated",
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
          <h2 className="text-xl font-semibold">Verification provider registry</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {registry.map((provider) => {
              const runtimeState = providerRuntimeState(provider);
              return (
                <article key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{provider.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">{provider.category.replaceAll("_", " ")}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(runtimeState)}`}>{runtimeState}</span>
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
