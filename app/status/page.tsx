import { createClient } from "@supabase/supabase-js";
import { summarizeIntegrationStatus } from "@/lib/integrations/registry";
import {
  getPublicEnvDiagnostics,
  getPublicSupabaseEnv,
  getServiceRoleEnv,
  logPublicEnvDiagnostics,
} from "@/lib/env";

export const dynamic = "force-dynamic";

type HealthCheck = {
  label: string;
  ok: boolean;
  value: string;
  detail: string;
};

const statusTimeoutMs = 8000;
const connectionFailureMessage =
  "Cyber Sentinels could not connect. Check Vercel Production environment variables.";

function stateLabel(ok: boolean) {
  return ok ? "OK" : "Check";
}

function stateClass(ok: boolean) {
  return ok
    ? "border-emerald-800 bg-emerald-950/20 text-emerald-200"
    : "border-amber-800 bg-amber-950/20 text-amber-200";
}

function operationalFailure(
  label: string,
  detail = connectionFailureMessage
): HealthCheck {
  return {
    label,
    ok: false,
    value: "Unavailable",
    detail,
  };
}

async function withStatusTimeout(
  label: string,
  task: () => Promise<HealthCheck>
): Promise<HealthCheck> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<HealthCheck>((resolve) => {
        timeout = setTimeout(
          () =>
            resolve(
              operationalFailure(
                label,
                `Timed out after ${statusTimeoutMs / 1000} seconds.`
              )
            ),
          statusTimeoutMs
        );
      }),
    ]);
  } catch (error) {
    console.error("Deployment health check failed.", { label, error });

    return operationalFailure(
      label,
      error instanceof Error ? error.message : "Health check failed."
    );
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function checkAppOnline(): Promise<HealthCheck> {
  logPublicEnvDiagnostics("deployment status page");

  return {
    label: "App online",
    ok: true,
    value: "Online",
    detail: "The status page rendered successfully from the current deployment.",
  };
}

async function checkSupabaseConnected(): Promise<HealthCheck> {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv(
    "deployment status Supabase REST check"
  );

  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    cache: "no-store",
    headers: {
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    console.error("Supabase REST health check failed.", {
      status: response.status,
    });
  }

  return {
    label: "Supabase connected",
    ok: response.ok,
    value: response.ok ? "Connected" : `HTTP ${response.status}`,
    detail: response.ok
      ? "Supabase REST endpoint responded to a public anon-key probe."
      : "Supabase REST endpoint did not return a healthy response.",
  };
}

async function checkAuthAvailable(): Promise<HealthCheck> {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv(
    "deployment status auth check"
  );

  const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    cache: "no-store",
    headers: {
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    console.error("Supabase auth health check failed.", {
      status: response.status,
    });
  }

  return {
    label: "Auth available",
    ok: response.ok,
    value: response.ok ? "Available" : `HTTP ${response.status}`,
    detail: response.ok
      ? "Supabase auth endpoint responded to the configured anon key."
      : "Supabase auth endpoint did not return a healthy response.",
  };
}

async function checkStorageAvailable(): Promise<HealthCheck> {
  const { supabaseUrl, serviceRoleKey } = getServiceRoleEnv(
    "deployment status storage check"
  );
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { error } = await supabase.storage.listBuckets();

  if (error) {
    console.error("Supabase storage health check failed.", error);
  }

  return {
    label: "Storage available",
    ok: !error,
    value: error ? "Unavailable" : "Available",
    detail: error
      ? "Storage bucket listing failed with current service credentials."
      : "Storage service responded to a server-side bucket probe.",
  };
}

async function runChecks() {
  return Promise.all([
    withStatusTimeout("App online", checkAppOnline),
    withStatusTimeout("Supabase connected", checkSupabaseConnected),
    withStatusTimeout("Auth available", checkAuthAvailable),
    withStatusTimeout("Storage available", checkStorageAvailable),
  ]);
}

export default async function StatusPage() {
  const checks = await runChecks();
  const healthy = checks.filter((check) => check.ok).length;
  const diagnostics = getPublicEnvDiagnostics();
  const hasConnectionFailure = checks.some((check) => !check.ok);
  const integrationSummary = summarizeIntegrationStatus();
  const supabaseConnected = checks.find((check) => check.label === "Supabase connected")?.ok;
  const apiSummary = [
    [
      "Supabase connected",
      supabaseConnected ? "connected" : integrationSummary.supabase,
    ],
    ["Stripe", integrationSummary.stripe],
    ["OpenAI", integrationSummary.openai],
    ["World ID", integrationSummary.worldId],
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
            Deployment Health
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">System Status</h1>
              <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
                Public-safe deployment checks for runtime availability,
                Supabase connectivity, authentication and storage.
              </p>
            </div>
            <span className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
              {healthy}/{checks.length} checks OK
            </span>
          </div>
          {hasConnectionFailure ? (
            <div className="mt-6 rounded-lg border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-100">
              {connectionFailureMessage}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 text-xs text-zinc-500 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-black p-3">
              Supabase URL configured: {diagnostics.hasSupabaseUrl ? "true" : "false"}
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-3">
              Supabase anon key configured: {diagnostics.hasSupabaseAnonKey ? "true" : "false"}
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-3">
              App URL configured: {diagnostics.hasAppUrl ? "true" : "false"}
            </div>
          </div>
          <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
            {apiSummary.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">
                  {label}
                </p>
                <p className="mt-2 font-medium text-zinc-200">
                  {value === "disabled" ? "Not configured yet" : value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <article
              key={check.label}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-zinc-100">
                    {check.label}
                  </h2>
                  <p className="mt-2 text-2xl font-semibold">{check.value}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${stateClass(
                    check.ok
                  )}`}
                >
                  {stateLabel(check.ok)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {check.detail}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
