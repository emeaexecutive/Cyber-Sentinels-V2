import "server-only";

import { existsSync } from "fs";
import { join } from "path";
import { getIntegrationRegistry } from "@/lib/integrations/registry";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ValidationState = "PASS" | "WARNING" | "FAIL";
export type DeploymentReadiness = "READY" | "CAUTION" | "BLOCKED";

export type RuntimeValidationCheck = {
  category: string;
  label: string;
  state: ValidationState;
  critical: boolean;
  message: string;
};

export type RuntimeValidationSummary = {
  generatedAt: string;
  deploymentState: DeploymentReadiness;
  healthPercent: number;
  criticalBlockers: string[];
  warnings: string[];
  checks: RuntimeValidationCheck[];
};

export type RuntimeValidationLog = {
  id: string;
  deployment_state: string | null;
  health_percent: number | null;
  critical_blockers: string[] | null;
  warnings: string[] | null;
  summary: Record<string, unknown> | null;
  created_at: string | null;
};

const publicPages = ["/", "/platform", "/pricing", "/enterprise", "/why-now", "/help", "/demo"];
const protectedRoutes = [
  "/back-office",
  "/admin/founder-control",
  "/admin/runtime-validation",
  "/trustops",
  "/launch-control",
];
const requiredEnterpriseFields = ["name", "work_email", "company"];
const workflowTables = [
  ["Trust cases", "trust_cases"],
  ["Workspaces", "trust_workspaces"],
  ["Governance tables", "governance_actions"],
  ["Timeline tables", "trust_timeline_events"],
  ["Notifications", "notifications"],
  ["Verification receipts", "verification_receipts"],
] as const;
const requestTimeoutMs = 8000;

function check(
  category: string,
  label: string,
  state: ValidationState,
  message: string,
  critical = false
): RuntimeValidationCheck {
  return { category, label, state, critical, message };
}

function routeFileExists(...segments: string[]) {
  return existsSync(join(process.cwd(), "app", ...segments));
}

function hasEnv(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

function getBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

function isReachableSupabaseStatus(status: number) {
  return status === 200 || status === 401 || status === 403;
}

function statusMessage(status: number) {
  if (status === 401) {
    return "Reachable. Protected endpoint requires authentication.";
  }

  if (status === 403) {
    return "Reachable. Protected endpoint denied this probe.";
  }

  return `HTTP ${status}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {}
): Promise<{ response?: Response; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: init.redirect ?? "manual",
      signal: controller.signal,
    });

    return { response };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Network request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkAppRoute(
  baseUrl: string,
  path: string
): Promise<RuntimeValidationCheck> {
  const { response, error } = await fetchWithTimeout(`${getBaseUrl(baseUrl)}${path}`);

  if (error) {
    return check("Public Pages", path, "FAIL", error, true);
  }

  if (!response) {
    return check("Public Pages", path, "FAIL", "No response returned.", true);
  }

  if (response.status >= 200 && response.status < 300) {
    return check("Public Pages", path, "PASS", "Page rendered successfully.", true);
  }

  if (response.status >= 300 && response.status < 400) {
    return check("Public Pages", path, "WARNING", `Redirected with HTTP ${response.status}.`);
  }

  return check("Public Pages", path, response.status >= 500 ? "FAIL" : "FAIL", `HTTP ${response.status}`, true);
}

async function checkProtectedRoute(
  baseUrl: string,
  path: string
): Promise<RuntimeValidationCheck> {
  const { response, error } = await fetchWithTimeout(`${getBaseUrl(baseUrl)}${path}`);

  if (error) {
    return check("Admin Protection", path, "FAIL", error, true);
  }

  if (!response) {
    return check("Admin Protection", path, "FAIL", "No response returned.", true);
  }

  if ([301, 302, 303, 307, 308, 401, 403].includes(response.status)) {
    return check("Admin Protection", path, "PASS", `Protected response returned HTTP ${response.status}.`, true);
  }

  if (response.status === 404) {
    return check("Admin Protection", path, "FAIL", "Route was not found.", true);
  }

  if (response.status >= 500) {
    return check("Admin Protection", path, "FAIL", `HTTP ${response.status}`, true);
  }

  return check("Admin Protection", path, "FAIL", `Route returned HTTP ${response.status}; expected redirect, 401 or 403.`, true);
}

async function checkSupabaseEndpoint(
  category: string,
  label: string,
  url: string,
  headers: HeadersInit,
  critical: boolean
): Promise<RuntimeValidationCheck> {
  const { response, error } = await fetchWithTimeout(url, { headers });

  if (error) {
    return check(category, label, "FAIL", error, critical);
  }

  if (!response) {
    return check(category, label, "FAIL", "No response returned.", critical);
  }

  if (isReachableSupabaseStatus(response.status)) {
    return check(category, label, "PASS", statusMessage(response.status), critical);
  }

  if (response.status >= 500) {
    return check(category, label, "FAIL", `HTTP ${response.status}`, critical);
  }

  return check(category, label, "WARNING", `Unexpected reachable HTTP ${response.status}.`);
}

function supabaseEnvChecks() {
  return [
    check(
      "Supabase",
      "NEXT_PUBLIC_SUPABASE_URL",
      hasEnv("NEXT_PUBLIC_SUPABASE_URL") ? "PASS" : "FAIL",
      hasEnv("NEXT_PUBLIC_SUPABASE_URL") ? "Configured." : "Missing NEXT_PUBLIC_SUPABASE_URL.",
      true
    ),
    check(
      "Supabase",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "PASS" : "FAIL",
      hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "Configured." : "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      true
    ),
  ];
}

async function supabaseRuntimeChecks() {
  const envChecks = supabaseEnvChecks();
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");

  if (!supabaseUrl || !anonKey) {
    return envChecks;
  }

  const anonHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };

  return [
    ...envChecks,
    await checkSupabaseEndpoint(
      "Supabase",
      "REST endpoint reachable",
      `${supabaseUrl}/rest/v1/`,
      { apikey: anonKey },
      true
    ),
    await checkSupabaseEndpoint(
      "Supabase",
      "Storage configured",
      `${supabaseUrl}/storage/v1/bucket`,
      anonHeaders,
      false
    ),
  ];
}

async function authChecks(baseUrl: string) {
  const checks: RuntimeValidationCheck[] = [
    check(
      "Auth System",
      "Callback route exists",
      routeFileExists("auth", "callback", "route.ts") ? "PASS" : "FAIL",
      routeFileExists("auth", "callback", "route.ts")
        ? "Callback route file is present."
        : "Callback route file is missing.",
      true
    ),
  ];

  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");

  if (!supabaseUrl || !anonKey) {
    checks.push(check("Auth System", "Supabase auth initialized", "FAIL", "Supabase public env vars are missing.", true));
  } else {
    checks.push(
      await checkSupabaseEndpoint(
        "Auth System",
        "Supabase auth initialized",
        `${supabaseUrl}/auth/v1/settings`,
        { apikey: anonKey },
        true
      )
    );
  }

  const session = await fetchWithTimeout(`${getBaseUrl(baseUrl)}/api/auth/session-expired`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "inactivity" }),
  });

  if (session.error) {
    checks.push(check("Auth System", "Session route healthy", "FAIL", session.error, true));
  } else if (session.response && session.response.status < 500) {
    checks.push(check("Auth System", "Session route healthy", "PASS", `HTTP ${session.response.status}`, true));
  } else {
    checks.push(check("Auth System", "Session route healthy", "FAIL", `HTTP ${session.response?.status ?? "unknown"}`, true));
  }

  return checks;
}

async function enterpriseAccessChecks(baseUrl: string) {
  const routeExists = routeFileExists("api", "enterprise-access", "route.ts");
  const apiProbe: { response?: Response; error?: string } = routeExists
    ? await fetchWithTimeout(`${getBaseUrl(baseUrl)}/api/enterprise-access`)
    : { error: "Route file is missing." };

  const reachable =
    apiProbe.response && apiProbe.response.status < 500 && apiProbe.response.status !== 404;

  return [
    check(
      "Enterprise Access",
      "API route reachable",
      reachable ? "PASS" : "FAIL",
      reachable ? `Route responded with HTTP ${apiProbe.response?.status}.` : apiProbe.error ?? `HTTP ${apiProbe.response?.status ?? "unknown"}`,
      true
    ),
    check(
      "Enterprise Access",
      "Insert validation configured",
      routeExists ? "PASS" : "FAIL",
      routeExists
        ? "Route enforces required name, work email and company fields before insert."
        : "Enterprise access route file is missing.",
      true
    ),
    check(
      "Enterprise Access",
      "Required fields present",
      "PASS",
      `Required fields: ${requiredEnterpriseFields.join(", ")}.`,
      true
    ),
  ];
}

async function workflowHealthChecks() {
  if (!hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return workflowTables.map(([label, table]) =>
      check(
        "Workflow Health",
        label,
        "WARNING",
        `Cannot verify ${table}; SUPABASE_SERVICE_ROLE_KEY is not configured.`
      )
    );
  }

  try {
    const supabase = createServiceRoleClient();

    return Promise.all(
      workflowTables.map(async ([label, table]) => {
        const { error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true });

        if (error) {
          return check("Workflow Health", label, "FAIL", `${table} is unavailable.`, true);
        }

        return check("Workflow Health", label, "PASS", `${table} exists and is queryable.`);
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow table validation failed.";

    return workflowTables.map(([label]) =>
      check("Workflow Health", label, "WARNING", message)
    );
  }
}

function providerChecks() {
  const registry = getIntegrationRegistry();
  const provider = (name: string) => registry.find((item) => item.provider === name);
  const stripe = provider("Stripe");
  const openai = provider("OpenAI");
  const worldId = provider("World ID");

  return [
    check(
      "Pricing/Billing",
      "Stripe configured or safely disabled",
      stripe?.status === "configured" ? "PASS" : "WARNING",
      stripe?.status === "configured" ? "Stripe is configured." : "Stripe not configured yet."
    ),
    check(
      "AI Providers",
      "OpenAI configured or safely disabled",
      openai?.status === "configured" ? "PASS" : "WARNING",
      openai?.status === "configured" ? "OpenAI is configured." : "OpenAI not configured yet."
    ),
    check(
      "AI Providers",
      "World ID configured or safely disabled",
      worldId?.status === "configured" ? "PASS" : "WARNING",
      worldId?.status === "configured" ? "World ID is configured." : "World ID not configured yet."
    ),
  ];
}

export async function runRuntimeValidation(baseUrl: string): Promise<RuntimeValidationSummary> {
  const [
    publicPageChecks,
    authSystemChecks,
    enterpriseChecks,
    supabaseChecks,
    adminProtectionChecks,
    workflowChecks,
  ] = await Promise.all([
    Promise.all(publicPages.map((path) => checkAppRoute(baseUrl, path))),
    authChecks(baseUrl),
    enterpriseAccessChecks(baseUrl),
    supabaseRuntimeChecks(),
    Promise.all(protectedRoutes.map((path) => checkProtectedRoute(baseUrl, path))),
    workflowHealthChecks(),
  ]);

  const checks = [
    ...publicPageChecks,
    ...authSystemChecks,
    ...enterpriseChecks,
    ...supabaseChecks,
    ...adminProtectionChecks,
    ...providerChecks(),
    ...workflowChecks,
  ];
  const score = checks.reduce((sum, item) => {
    if (item.state === "PASS") return sum + 1;
    if (item.state === "WARNING") return sum + 0.5;
    return sum;
  }, 0);
  const criticalBlockers = checks
    .filter((item) => item.critical && item.state === "FAIL")
    .map((item) => `${item.category}: ${item.label}`);
  const warnings = checks
    .filter((item) => item.state === "WARNING")
    .map((item) => `${item.category}: ${item.label}`);
  const deploymentState: DeploymentReadiness = criticalBlockers.length
    ? "BLOCKED"
    : warnings.length
      ? "CAUTION"
      : "READY";

  return {
    generatedAt: new Date().toISOString(),
    deploymentState,
    healthPercent: Math.round((score / checks.length) * 100),
    criticalBlockers,
    warnings,
    checks,
  };
}

export async function writeRuntimeValidationLog(summary: RuntimeValidationSummary) {
  if (!hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return;
  }

  try {
    const supabase = createServiceRoleClient();
    await supabase.from("runtime_validation_logs").insert({
      deployment_state: summary.deploymentState,
      health_percent: summary.healthPercent,
      critical_blockers: summary.criticalBlockers,
      warnings: summary.warnings,
      summary: {
        generated_at: summary.generatedAt,
        total_checks: summary.checks.length,
        pass: summary.checks.filter((item) => item.state === "PASS").length,
        warning: summary.checks.filter((item) => item.state === "WARNING").length,
        fail: summary.checks.filter((item) => item.state === "FAIL").length,
      },
    });
  } catch (error) {
    console.warn("Runtime validation log insert failed.", error);
  }
}

export async function readRuntimeValidationLogs(limit = 8) {
  if (!hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return [] as RuntimeValidationLog[];
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("runtime_validation_logs")
      .select("id,deployment_state,health_percent,critical_blockers,warnings,summary,created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<RuntimeValidationLog[]>();

    if (error) {
      console.warn("Runtime validation logs unavailable.", error);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.warn("Runtime validation log read failed.", error);
    return [];
  }
}
