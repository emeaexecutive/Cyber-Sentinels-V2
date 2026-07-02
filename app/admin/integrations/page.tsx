import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { getIntegrationRegistry, type IntegrationRegistryItem } from "@/lib/integrations/registry";
import {
  getVerificationProviderRegistry,
  providerRuntimeState,
} from "@/lib/providers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type IntegrationStatusRow = {
  id: string;
  provider: string | null;
  status: string | null;
  purpose: string | null;
  required_env: string[] | null;
  risk_level: string | null;
  notes: string | null;
  checked_at: string | null;
};

type HopaeVerificationRow = {
  verification_id: string;
  status: string;
  provider_id: string;
  verification_model: string | null;
  hopae_loa: number | null;
  provenance: Record<string, unknown> | null;
  provenance_confidence: boolean;
  created_at: string;
  completed_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function statusClass(status: string) {
  if (status === "configured" || status === "Live") {
    return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  }

  if (status === "disabled" || status === "Disabled") {
    return "border-zinc-700 bg-zinc-950 text-zinc-300";
  }

  if (status === "unsafe") {
    return "border-red-800 bg-red-950/20 text-red-200";
  }

  return "border-amber-800 bg-amber-950/20 text-amber-200";
}

function riskClass(risk: string) {
  if (risk === "low") return "border-emerald-800 text-emerald-200";
  if (risk === "high") return "border-red-800 text-red-200";
  return "border-amber-800 text-amber-200";
}

async function persistIntegrationSnapshot(registry: IntegrationRegistryItem[]) {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("integration_status")
      .insert(
        registry.map((item) => ({
          provider: item.provider,
          status: item.status,
          purpose: item.purpose,
          required_env: item.required_env,
          risk_level: item.risk_level,
          notes: item.notes,
          checked_at: item.checked_at,
        }))
      )
      .select("*")
      .order("checked_at", { ascending: false })
      .returns<IntegrationStatusRow[]>();

    if (error) {
      console.warn("Integration status snapshot insert failed", error);
      return [] as IntegrationStatusRow[];
    }

    return data ?? [];
  } catch (error) {
    console.warn("Integration status persistence unavailable", error);
    return [] as IntegrationStatusRow[];
  }
}

async function readRecentIntegrationRows() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("integration_status")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(20)
      .returns<IntegrationStatusRow[]>();

    if (error) {
      console.warn("Integration status read failed", error);
      return [] as IntegrationStatusRow[];
    }

    return data ?? [];
  } catch (error) {
    console.warn("Integration status history unavailable", error);
    return [] as IntegrationStatusRow[];
  }
}

async function readRecentHopaeVerifications() {
  if (process.env.HOPAE_ENABLED?.trim().toLowerCase() !== "true") {
    return [] as HopaeVerificationRow[];
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("hopae_verifications")
      .select("verification_id, status, provider_id, verification_model, hopae_loa, provenance, provenance_confidence, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<HopaeVerificationRow[]>();
    if (error) {
      console.warn("Hopae verification status unavailable", error);
      return [] as HopaeVerificationRow[];
    }
    return data ?? [];
  } catch (error) {
    console.warn("Hopae verification status unavailable", error);
    return [] as HopaeVerificationRow[];
  }
}

function provenanceSummary(provenance: Record<string, unknown> | null) {
  if (!provenance || Object.keys(provenance).length === 0) return "Missing";
  const credentials = provenance.credentials ?? provenance.credential ?? provenance.verifiableCredentials;
  if (Array.isArray(credentials)) return `${credentials.length} credential${credentials.length === 1 ? "" : "s"}`;
  return "Recorded";
}

export default async function AdminIntegrationsPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/integrations");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/integrations" });

  const registry = getIntegrationRegistry();
  const verificationProviders = getVerificationProviderRegistry();
  const insertedRows = await persistIntegrationSnapshot(registry);
  const recentRows = insertedRows.length ? insertedRows : await readRecentIntegrationRows();
  const hopaeVerifications = await readRecentHopaeVerifications();
  const configuredCount = registry.filter((item) => item.status === "configured").length;
  const disabledCount = registry.filter((item) => item.status === "disabled").length;
  const missingCount = registry.filter((item) => item.status === "missing").length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">API Integrity Registry</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                Internal provider configuration registry for Supabase, Stripe,
                OpenAI, World ID, Hopae Connect and email delivery. Secret values are never displayed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/integrations/ats"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
              >
                ATS Integrations
              </Link>
              <Link
                href="/admin/api-tests"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
              >
                API Tests
              </Link>
              <Link
                href="/status"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
              >
                Public Status
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Providers", registry.length],
            ["Configured", configuredCount],
            ["Disabled", disabledCount],
            ["Missing Core", missingCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {registry.map((item) => (
            <article key={item.provider} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{item.provider}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{item.purpose}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(item.status)}`}>
                  {item.status === "disabled" ? "Not configured yet" : item.status}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Required env present</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {item.present_env.length ? item.present_env.join(", ") : "None"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Missing env</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {item.missing_env.length ? item.missing_env.join(", ") : "None"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Risk level</p>
                  <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs ${riskClass(item.risk_level)}`}>
                    {item.risk_level}
                  </span>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Last checked</p>
                  <p className="mt-2 text-sm text-zinc-300">{formatDate(item.checked_at)}</p>
                </div>
              </div>
              <p className="mt-4 rounded-lg border border-zinc-800 bg-black p-3 text-sm leading-6 text-zinc-400">
                {item.notes}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
            Verification Provider Status
          </p>
          <h2 className="mt-2 text-xl font-semibold">Runtime state and credential readiness</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            “Live” means a supported code path is enabled and configured. It is
            not a provider health, identity-certainty or accuracy claim. Secret
            values are never displayed.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
            {[
              ["Live", "enabled supported path"],
              ["Simulated", "controlled test data only"],
              ["Awaiting Credentials", "required environment names are absent"],
              ["Disabled", "fails safely without provider evidence"],
            ].map(([state, meaning]) => (
              <span key={state} className="rounded-full border border-zinc-700 px-3 py-1.5">
                <span className="font-semibold text-zinc-200">{state}:</span> {meaning}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {verificationProviders.map((provider) => {
              const runtimeState = providerRuntimeState(provider);
              return (
                <article key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-100">{provider.name}</h3>
                      <p className="mt-1 text-xs capitalize text-zinc-600">
                        {provider.category.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(runtimeState)}`}>
                        {runtimeState}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${provider.missingEnv.length ? "border-amber-800 text-amber-200" : "border-emerald-800 text-emerald-200"}`}>
                        {provider.missingEnv.length ? "Missing credentials" : "Credentials present"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{provider.notes}</p>
                  <div className="mt-3 grid gap-1 text-xs text-zinc-600">
                    <p>Missing environment names: {provider.missingEnv.join(", ") || "None"}</p>
                    <p>Replay: {provider.replayIntegration.replaceAll("_", " ")}</p>
                    <p>Receipts: {provider.receiptIntegration.replaceAll("_", " ")}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-400">Upstream Identity Proof</p>
          <h2 className="mt-2 text-xl font-semibold">Hopae Connect verifications</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            Verified identity is not the same as trusted behaviour. Cyber Sentinels combines upstream eID verification with provenance, behaviour, audit trails, AI-agent governance and enterprise escalation.
          </p>
          <p className="mt-2 text-sm text-amber-200">
            A completed Hopae proof can strengthen identity assurance. It is not a final Cyber Sentinels Trust Score or an automatic approval.
          </p>
          <div className="mt-5 grid gap-3">
            {hopaeVerifications.length ? hopaeVerifications.map((row) => (
              <article key={row.verification_id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-100">{row.provider_id}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-600">{row.verification_id}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(row.status === "completed" ? "configured" : "disabled")}`}>
                    {row.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <div><p className="text-xs uppercase text-zinc-600">LoA</p><p className="mt-1 text-zinc-300">{row.hopae_loa ?? "Not reported"}</p></div>
                  <div><p className="text-xs uppercase text-zinc-600">Model</p><p className="mt-1 text-zinc-300">{row.verification_model ?? "Not reported"}</p></div>
                  <div><p className="text-xs uppercase text-zinc-600">Provenance</p><p className="mt-1 text-zinc-300">{provenanceSummary(row.provenance)}{row.provenance_confidence ? " · confidence flag" : ""}</p></div>
                  <div><p className="text-xs uppercase text-zinc-600">Created</p><p className="mt-1 text-zinc-300">{formatDate(row.created_at)}</p></div>
                  <div><p className="text-xs uppercase text-zinc-600">Completed</p><p className="mt-1 text-zinc-300">{formatDate(row.completed_at)}</p></div>
                </div>
              </article>
            )) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No Hopae upstream identity proofs recorded. The provider can remain safely disabled.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Recent Registry Checks</h2>
          <div className="mt-5 grid gap-3">
            {recentRows.length ? (
              recentRows.map((row) => (
                <article key={row.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{row.provider ?? "Provider"}</p>
                      <p className="mt-1 text-sm text-zinc-500">{row.purpose ?? "No purpose recorded."}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(row.status ?? "missing")}`}>
                      {row.status === "disabled" ? "Not configured yet" : row.status ?? "missing"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">{row.notes ?? "No notes recorded."}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    Required env names: {(row.required_env ?? []).join(", ") || "None"} / checked {formatDate(row.checked_at)}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No persisted integration checks yet. Live registry status is shown above.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
