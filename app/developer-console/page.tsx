import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getApiKeySummaries,
  recordApiKeyAudit,
  recordApiKeySignal,
} from "@/lib/api/apiKeys";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  event: string;
  created_at: string | null;
};

const endpoints = [
  ["POST", "/api/trust/check", "Compute trust score and recommended action."],
  ["GET", "/api/trust/passport", "Read a safe Trust Passport summary."],
  ["POST", "/api/trust/decision", "Run Decision Engine and Policy Engine."],
  ["GET", "/api/trust/evidence", "Read evidence summary and upload status."],
  ["POST", "/api/step-up", "Request stronger proof for high-risk actions."],
  ["POST", "/api/compliance/export", "Create report export placeholders."],
];

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadgeClass(status: string) {
  if (status === "revoked") return "border-red-700 text-red-200";
  if (status === "paused") return "border-amber-700 text-amber-200";

  return "border-emerald-700 text-emerald-200";
}

export default async function DeveloperConsolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [apiKeys, signalsResult] = await Promise.all([
    getApiKeySummaries(supabase, user),
    supabase
      .from("signals")
      .select("id,event,created_at")
      .or(
        "event.ilike.%trust_api%,event.ilike.%api_key%,event.ilike.%developer_console%"
      )
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<Signal[]>(),
  ]);
  const actor = user.email ?? user.id;

  await recordApiKeySignal(supabase, "developer_console_opened");
  await recordApiKeyAudit(supabase, "api_key_viewed", actor, {
    source: "developer_console",
    key_count: apiKeys.keys.length,
    table_available: apiKeys.tableAvailable,
  });

  const activeKeys = apiKeys.keys.filter((key) => key.status === "active");
  const usageCount = apiKeys.keys.reduce(
    (sum, key) => sum + key.usage_count,
    0
  );
  const thresholdWarnings = apiKeys.keys.filter(
    (key) => key.rate_limit_status !== "normal"
  ).length;
  const recentSignals = signalsResult.data ?? [];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/api-docs", "API Docs"],
            ["/billing", "Billing"],
            ["/permissions-firewall", "Permissions Firewall"],
            ["/step-up-verification", "Step-Up Verification"],
            ["/revocation-engine", "Revocation Engine"],
            ["/compliance-export", "Compliance Export"],
            ["/global-trust", "Global Trust"],
            ["/admin", "Admin"],
            ["/command-center", "Command Center"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust API access
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Developer Console
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Manage API access, review usage, and connect trusted apps to Cyber
            Sentinels trust checks.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            ["API Keys", apiKeys.keys.length],
            ["Active Keys", activeKeys.length],
            ["Usage Count", usageCount],
            ["Rate Warnings", thresholdWarnings],
            ["API Limit", "0 / 250 / 5000"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">API Keys</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Full secret keys are never displayed. V1 shows prefixes only.
              </p>
            </div>
            <form action="/api/developer/api-keys" method="POST">
              <button className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                Create placeholder key
              </button>
            </form>
          </div>
          {!apiKeys.tableAvailable ? (
            <p className="mt-4 rounded-lg border border-amber-800 bg-black p-3 text-sm text-amber-200">
              api_keys table is not available yet. Showing safe placeholder
              key data.
            </p>
          ) : null}
          <div className="mt-5 space-y-3">
            {apiKeys.keys.length ? (
              apiKeys.keys.map((key) => (
                <div
                  key={key.id}
                  className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-4 lg:grid-cols-[1fr_0.8fr_0.7fr_0.8fr_0.8fr_0.8fr]"
                >
                  <div>
                    <p className="text-sm text-zinc-500">Label</p>
                    <p className="mt-1 font-medium text-zinc-100">
                      {key.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Prefix</p>
                    <p className="mt-1 font-mono text-zinc-300">
                      {key.key_prefix}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Status</p>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs ${statusBadgeClass(
                        key.status
                      )}`}
                    >
                      {key.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Created</p>
                    <p className="mt-1 text-zinc-300">
                      {formatDate(key.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Last used</p>
                    <p className="mt-1 text-zinc-300">
                      {formatDate(key.last_used_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Usage</p>
                    <p className="mt-1 text-zinc-300">
                      {key.usage_count} / {key.rate_limit_status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No API keys created yet.</p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Usage Overview</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Total calls", usageCount],
                ["Active keys", activeKeys.length],
                ["Warnings", thresholdWarnings],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Security Rules</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-400">
              <p>Never expose full API keys after creation.</p>
              <p>Use server-side requests and keep keys out of browsers.</p>
              <p>Production keys should be hashed, scoped and rate limited.</p>
              <p>
                API permissions should be scoped through the Permissions
                Firewall and revoked keys must be denied at the gateway.
              </p>
              <p>
                High-risk API actions should trigger Step-Up Verification before
                permission is granted.
              </p>
              <p>
                API key abuse should pause or revoke access through the
                Revocation Engine placeholder.
              </p>
              <p>
                Report summaries and compliance exports should be exposed only
                through scoped API access.
              </p>
              <p>Every production trust decision should emit audit and signal events.</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust API Endpoints</h2>
            <div className="mt-5 space-y-3">
              {endpoints.map(([method, path, copy]) => (
                <div
                  key={path}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-emerald-700 px-2.5 py-1 text-xs text-emerald-200">
                      {method}
                    </span>
                    <code className="text-sm text-zinc-300">{path}</code>
                  </div>
                  <p className="mt-3 text-sm text-zinc-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Global API Readiness</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "api_gateway",
                "regional_data_controls",
                "rate_limit_enforcement",
                "compliance_exports",
              ].map((item) => (
                <code
                  key={item}
                  className="rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
                >
                  {item}
                </code>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Trust API V1 is ready for scoped keys and audit events. Future
              production hardening should add gateway enforcement, regional
              routing, signed requests and durable rate limits.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent API Signals</h2>
            <div className="mt-5 space-y-3">
              {recentSignals.length ? (
                recentSignals.map((signal) => (
                  <div
                    key={signal.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-300">{signal.event}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatDate(signal.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No API signals yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
