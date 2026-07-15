import { redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  buildProviderReadinessChecklist,
  classifyProviderReadiness,
  summarizeProviderReadiness,
} from "@/lib/providers/provider-readiness";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function statusTone(state: string) {
  const normalized = state.toLowerCase().replaceAll("_", " ");
  if (normalized === "healthy") return "border-emerald-800 text-emerald-200";
  if (normalized === "production ready") return "border-emerald-800 text-emerald-200";
  if (normalized === "configured") return "border-cyan-800 text-cyan-200";
  if (normalized === "degraded" || normalized === "awaiting credentials") return "border-amber-800 text-amber-200";
  if (normalized === "offline" || normalized === "deprecated") return "border-red-800 text-red-200";
  return "border-zinc-700 text-zinc-300";
}

async function testProviderConnection(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/admin/provider-status" });
  const providerId = String(formData.get("provider_id") ?? "");
  const exists = buildProviderReadinessChecklist().some((provider) => provider.id === providerId);
  redirect(`/admin/provider-status?test_provider=${exists ? encodeURIComponent(providerId) : "unknown"}`);
}

export default async function ProviderStatusAdminPage({ searchParams }: { searchParams?: Promise<{ test_provider?: string }> }) {
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
  const query = searchParams ? await searchParams : {};
  const testedProvider = providerReadinessChecks.find((provider) => provider.id === query.test_provider);
  const testedHealth = testedProvider ? healthByProviderId.get(testedProvider.id) : null;

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

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(providerReadiness.classifications).map(([label, count]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs capitalize text-zinc-500">{label.replace(/([A-Z])/g, " $1")}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{count}</p>
            </div>
          ))}
        </section>

        {query.test_provider ? (
          <section className="mt-6 rounded-lg border border-cyan-900 bg-cyan-950/10 p-4 text-sm text-zinc-300">
            {testedProvider && testedHealth ? (
              <p><span className="font-semibold text-cyan-200">Connection evidence for {testedProvider.name}: {testedHealth.state}.</span> {testedHealth.evidence} This check never converts configuration into a Live result.</p>
            ) : <p>No matching provider was found.</p>}
          </section>
        ) : null}

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
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(classifyProviderReadiness(provider))}`}>
                    {classifyProviderReadiness(provider)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-zinc-500">
                  <p>Current status: {provider.runtimeState}</p>
                  <p>Health: {healthByProviderId.get(provider.id)?.state ?? "Unknown"}</p>
                  <p>Credential state: {provider.credentialState.replaceAll("_", " ")}</p>
                  <p>Last successful connection: {provider.lastSuccessfulCheck ?? "No successful real connection recorded"}</p>
                  <p>Supported signals: {provider.supportedFeatures.join(", ")}</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Normalized response: {provider.normalizedResultImplemented ? "implemented" : "not implemented"}. {healthByProviderId.get(provider.id)?.evidence}
                </p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">Known limitations: {provider.limitations.join(" ")}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <form action={testProviderConnection}>
                    <input type="hidden" name="provider_id" value={provider.id} />
                    <button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-cyan-700">Test Connection</button>
                  </form>
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
