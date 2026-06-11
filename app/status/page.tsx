import { summarizeIntegrationStatus } from "@/lib/integrations/registry";
import {
  getPublicEnvDiagnostics,
  getPublicSupabaseEnv,
  logPublicEnvDiagnostics,
} from "@/lib/env";

export const dynamic = "force-dynamic";

type HealthCheck = {
  label: string;
  ok: boolean;
  requiredForOverall: boolean;
  value: string;
  detail: string;
};

type StatusSeverity = "OK" | "WARNING" | "FAILURE";

const statusTimeoutMs = 8000;
const connectionFailureMessage =
  "Cyber Sentinels could not connect. Check Vercel Production environment variables.";
const reachableStatuses = new Set([200, 401, 403]);

function checkSeverity(check: HealthCheck): StatusSeverity {
  if (check.ok) return "OK";
  return check.requiredForOverall ? "FAILURE" : "WARNING";
}

function stateClass(severity: StatusSeverity) {
  if (severity === "OK") {
    return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  }

  if (severity === "FAILURE") {
    return "border-red-800 bg-red-950/20 text-red-200";
  }

  return "border-amber-800 bg-amber-950/20 text-amber-200";
}

function operationalFailure(
  label: string,
  detail = connectionFailureMessage,
  requiredForOverall = false
): HealthCheck {
  return {
    label,
    ok: false,
    requiredForOverall,
    value: "Unavailable",
    detail,
  };
}

async function withStatusTimeout(
  label: string,
  requiredForOverall: boolean,
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
                `Timed out after ${statusTimeoutMs / 1000} seconds.`,
                requiredForOverall
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
      error instanceof Error ? error.message : "Health check failed.",
      requiredForOverall
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
    requiredForOverall: true,
    value: "Online",
    detail: "The status page rendered successfully from the current deployment.",
  };
}

function hasReachableSupabaseStatus(status: number) {
  return reachableStatuses.has(status);
}

function protectedEndpointDetail(status: number) {
  if (status === 401) {
    return "Supabase reachable — protected endpoint requires authentication.";
  }

  if (status === 403) {
    return "Supabase reachable — protected endpoint denied this anon-key probe.";
  }

  return "";
}

async function checkSupabaseEndpointReachable(): Promise<HealthCheck> {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv(
    "deployment status Supabase endpoint check"
  );

  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    cache: "no-store",
    headers: {
      apikey: supabaseAnonKey,
    },
  });

  const reachable = hasReachableSupabaseStatus(response.status);

  if (!reachable) {
    console.error("Supabase REST health check failed.", {
      status: response.status,
    });
  }

  return {
    label: "Supabase endpoint reachable",
    ok: reachable,
    requiredForOverall: true,
    value: reachable ? "Reachable" : `HTTP ${response.status}`,
    detail: response.ok
      ? "Supabase REST endpoint responded to a public-safe anon-key probe."
      : protectedEndpointDetail(response.status) ||
        "Supabase REST endpoint did not return a reachable response.",
  };
}

async function checkSupabaseAuthConfigured(): Promise<HealthCheck> {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv(
    "deployment status auth check"
  );

  const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    cache: "no-store",
    headers: {
      apikey: supabaseAnonKey,
    },
  });

  const reachable = hasReachableSupabaseStatus(response.status);

  if (!reachable) {
    console.error("Supabase auth health check failed.", {
      status: response.status,
    });
  }

  return {
    label: "Supabase auth configured",
    ok: reachable,
    requiredForOverall: false,
    value: response.ok ? "Configured" : `HTTP ${response.status}`,
    detail: response.ok
      ? "Supabase auth endpoint responded to the configured anon key."
      : protectedEndpointDetail(response.status) ||
        "Supabase auth endpoint did not return a reachable response.",
  };
}

async function checkDatabaseTableAccess(): Promise<HealthCheck> {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv(
    "deployment status database table access check"
  );

  const response = await fetch(
    `${supabaseUrl}/rest/v1/integration_status?select=id&limit=1`,
    {
      cache: "no-store",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    }
  );

  const reachable = hasReachableSupabaseStatus(response.status);

  if (!reachable) {
    console.error("Supabase database table access check failed.", {
      status: response.status,
    });
  }

  return {
    label: "Database table access check",
    ok: reachable,
    requiredForOverall: false,
    value: response.ok ? "Accessible" : `HTTP ${response.status}`,
    detail: response.ok
      ? "A limited anon-key table probe completed successfully."
      : protectedEndpointDetail(response.status) ||
        "The table probe returned an unexpected database response.",
  };
}

async function checkStorageAvailable(): Promise<HealthCheck> {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv(
    "deployment status storage check"
  );

  const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    cache: "no-store",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  const reachable = hasReachableSupabaseStatus(response.status);

  if (!reachable) {
    console.error("Supabase storage health check failed.", {
      status: response.status,
    });
  }

  return {
    label: "Storage check",
    ok: reachable,
    requiredForOverall: false,
    value: response.ok ? "Accessible" : `HTTP ${response.status}`,
    detail: response.ok
      ? "Supabase storage responded to an anon-key bucket probe."
      : protectedEndpointDetail(response.status) ||
        "Supabase storage did not return a reachable response.",
  };
}

async function runChecks() {
  return Promise.all([
    withStatusTimeout("App online", true, checkAppOnline),
    withStatusTimeout("Supabase endpoint reachable", true, checkSupabaseEndpointReachable),
    withStatusTimeout("Supabase auth configured", false, checkSupabaseAuthConfigured),
    withStatusTimeout("Database table access check", false, checkDatabaseTableAccess),
    withStatusTimeout("Storage check", false, checkStorageAvailable),
  ]);
}

export default async function StatusPage() {
  const checks = await runChecks();
  const diagnostics = getPublicEnvDiagnostics();
  const requiredChecks = checks.filter((check) => check.requiredForOverall);
  const hasConnectionFailure = requiredChecks.some((check) => !check.ok);
  const integrationSummary = summarizeIntegrationStatus();
  const supabaseReachable = checks.find((check) => check.label === "Supabase endpoint reachable")?.ok;
  const apiSummary = [
    [
      "Supabase endpoint",
      supabaseReachable ? "reachable" : integrationSummary.supabase,
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
                Supabase connectivity, authentication, table access and storage.
              </p>
            </div>
            <span className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
              {requiredChecks.every((check) => check.ok) ? "Deployment OK" : "Deployment check"}
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
                  {value === "disabled" ? "WARNING: not configured yet" : value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {checks.map((check) => {
            const severity = checkSeverity(check);

            return (
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
                      severity
                    )}`}
                  >
                    {severity}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-500">
                  {check.detail}
                </p>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
