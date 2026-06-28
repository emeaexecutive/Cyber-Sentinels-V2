import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import {
  atsEventTypes,
  getATSProviderDefinitions,
  type ATSProviderStatus,
} from "@/lib/integrations/ats";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function statusClass(status: ATSProviderStatus) {
  if (status === "Connected") {
    return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  }
  if (status === "Webhook configured") {
    return "border-cyan-800 bg-cyan-950/20 text-cyan-100";
  }
  if (status === "Awaiting API credentials") {
    return "border-amber-800 bg-amber-950/20 text-amber-100";
  }
  return "border-zinc-700 bg-black text-zinc-300";
}

export default async function ATSIntegrationStatusPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/integrations/ats");
    }
    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, {
    path: "/admin/integrations/ats",
  });
  const providers = getATSProviderDefinitions();
  const connected = providers.filter((provider) => provider.status === "Connected").length;
  const webhookReady = providers.filter(
    (provider) => provider.status === "Webhook configured"
  ).length;
  const placeholders = providers.filter(
    (provider) => provider.status === "Placeholder"
  ).length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">
                Integration readiness
              </p>
              <h1 className="mt-3 text-4xl font-semibold">ATS Integration Status</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Generic ATS adapters for candidate events, verification triggers,
                replay references and trust receipt export. Status reflects server configuration,
                not assumed provider connectivity.
              </p>
            </div>
            <Link
              href="/admin/integrations"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              API integrity registry
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["ATS providers", providers.length],
            ["Connected", connected],
            ["Webhook configured", webhookReady],
            ["Placeholders", placeholders],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {providers.map((provider) => (
            <article key={provider.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{provider.name}</h2>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-zinc-600">
                    Provider ID: {provider.id}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(provider.status)}`}>
                  {provider.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">{provider.notes}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  ["Credentials", provider.credentialsPresent],
                  ["Webhook", provider.webhookConfigured],
                  ["Receipt endpoint", provider.endpointConfigured],
                ].map(([label, available]) => (
                  <div key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-3">
                    <p className="text-xs text-zinc-600">{label}</p>
                    <p className="mt-1 text-sm text-zinc-300">{available ? "Configured" : "Not configured"}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">Declared capabilities</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {provider.capabilities.map((capability) => (
                    <span key={capability} className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                      {capability.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-zinc-600">
                Required configuration names: {provider.credentialEnv}, {provider.endpointEnv},{" "}
                {provider.webhookSecretEnv}. Values are never displayed.
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Accepted ATS events</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {atsEventTypes.map((eventType) => (
                <p key={eventType} className="rounded-lg border border-zinc-800 bg-black p-3 font-mono text-sm text-zinc-300">
                  {eventType}
                </p>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Webhooks require an HMAC-SHA256 signature, provider identifier and supported event type.
              Raw webhook bodies are not retained.
            </p>
          </article>

          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Cyber Sentinels actions</h2>
            <div className="mt-4 grid gap-2">
              {[
                "Create or update a candidate verification workflow",
                "Calculate contextual trust posture",
                "Return recorded replay and receipt links",
                "Export an existing verification receipt",
                "Escalate offer-stage governance review",
              ].map((action) => (
                <p key={action} className="rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-300">
                  {action}
                </p>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-600">
              Receipts are never generated as proof of a completed verification unless recorded evidence exists.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
