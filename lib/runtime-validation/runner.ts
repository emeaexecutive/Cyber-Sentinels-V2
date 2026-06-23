import "server-only";

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getIntegrationRegistry } from "@/lib/integrations/registry";
import { captureOperationalIssue } from "@/lib/operational-monitoring";
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

const publicPages = [
  "/",
  "/platform",
  "/pricing",
  "/enterprise",
  "/enterprise-access",
  "/enterprise/hiring-security",
  "/enterprise/pilot",
  "/design-partner",
  "/why-now",
  "/help",
  "/demo",
  "/demo/hiring-attack",
  "/demo/session-integrity",
  "/verify/session",
  "/security",
  "/privacy",
  "/terms",
];
const protectedRoutes = [
  "/back-office",
  "/admin/founder-control",
  "/admin/deployment-readiness",
  "/admin/runtime-validation",
  "/admin/trust-integrity",
  "/dashboard",
  "/dashboard/session-integrity",
  "/dashboard/trust-posture",
  "/passport",
  "/workspace",
  "/verify/candidate",
  "/verify/recruiter",
  "/verify/provenance",
  "/trust/receipt/demo",
  "/replay/demo",
  "/trust-replay",
  "/trustops",
  "/launch-control",
];
const requiredEnterpriseFields = ["name", "work_email", "company"];
const workflowTables = [
  ["Enterprise access", "enterprise_access_requests"],
  ["Trust cases", "trust_cases"],
  ["Workspaces", "trust_workspaces"],
  ["Evidence files", "evidence_files"],
  ["Audit logs", "audit_logs"],
  ["Verification flags", "signals"],
  ["Governance tables", "governance_actions"],
  ["Timeline tables", "trust_timeline_events"],
  ["Trust replay sessions", "trust_replay_sessions"],
  ["Notifications", "notifications"],
  ["Verification receipts", "verification_receipts"],
  ["Evidence chains", "evidence_chains"],
  ["AI agents", "ai_agents"],
  ["Agent activity", "agent_activity"],
  ["Candidate profiles", "candidate_profiles"],
  ["Recruiter profiles", "recruiter_profiles"],
  ["Interview sessions", "interview_sessions"],
  ["Interview risk events", "interview_risk_events"],
  ["Session integrity checks", "session_integrity_checks"],
  ["Injection risk events", "injection_risk_events"],
  ["Verification signals", "verification_signals"],
  ["Device channel evidence", "device_channel_evidence"],
  ["Usage limits", "usage_limits"],
  ["Billing customers", "billing_customers"],
  ["Subscriptions", "subscriptions"],
  ["Integration status", "integration_status"],
  ["Runtime validation logs", "runtime_validation_logs"],
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

function fileContains(...args: [...string[], RegExp]) {
  const pattern = args[args.length - 1] as RegExp;
  const segments = args.slice(0, -1) as string[];

  try {
    const content = readFileSync(join(process.cwd(), ...segments), "utf8");
    return pattern.test(content);
  } catch {
    return false;
  }
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

async function securityHeaderChecks(baseUrl: string) {
  const { response, error } = await fetchWithTimeout(`${getBaseUrl(baseUrl)}/`);

  if (error || !response) {
    return [
      check(
        "Security Headers",
        "Header probe reachable",
        "WARNING",
        error ?? "No response returned."
      ),
    ];
  }

  const requiredHeaders = [
    ["Content-Security-Policy", "content-security-policy"],
    ["X-Frame-Options", "x-frame-options"],
    ["Referrer-Policy", "referrer-policy"],
    ["X-Content-Type-Options", "x-content-type-options"],
    ["Permissions-Policy", "permissions-policy"],
  ] as const;

  return requiredHeaders.map(([label, header]) =>
    check(
      "Security Headers",
      label,
      response.headers.get(header) ? "PASS" : "WARNING",
      response.headers.get(header)
        ? `${label} is configured.`
        : `${label} is missing from the deployment response.`
    )
  );
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


function emailAndBotProtectionChecks() {
  const turnstileSecret = hasEnv("TURNSTILE_SECRET_KEY");
  const turnstileSiteKey = hasEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY") || hasEnv("TURNSTILE_SITE_KEY");
  const emailGateConfigured =
    routeFileExists("verify-email", "page.tsx") &&
    fileContains("middleware.ts", /email_confirmed_at|confirmed_at/) &&
    fileContains("middleware.ts", /\/verify-email/);
  const enterpriseProtected = fileContains("app", "api", "enterprise-access", "route.ts", /verifyTurnstileToken/) &&
    fileContains("app", "api", "enterprise-access", "route.ts", /checkRequestRateLimit/);
  const waitlistProtected = fileContains("app", "api", "waitlist", "route.ts", /verifyTurnstileToken/) &&
    fileContains("app", "api", "waitlist", "route.ts", /checkRequestRateLimit/);
  const proWaitlistProtected = fileContains("app", "pro-waitlist", "page.tsx", /TurnstileField/);
  const authPracticalGuard = fileContains("app", "login", "page.tsx", /allowAuthAttempt/) &&
    fileContains("app", "login", "page.tsx", /cf-turnstile/);
  const publicFormsProtected = enterpriseProtected && waitlistProtected && proWaitlistProtected;

  return [
    check(
      "Account Security",
      "Email verification",
      emailGateConfigured ? "PASS" : "WARNING",
      emailGateConfigured
        ? "Verified email is required before protected dashboard, passport, workspace, admin and verification workflows."
        : "Email verification gate or /verify-email page is missing."
    ),
    check(
      "Bot Protection",
      "Bot protection",
      turnstileSecret && turnstileSiteKey ? "PASS" : "WARNING",
      turnstileSecret && turnstileSiteKey
        ? "Turnstile site and secret keys are configured."
        : "Turnstile is not configured. Development may bypass checks, but production requests fail safely until TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY are set."
    ),
    check(
      "Bot Protection",
      "Rate limiting",
      enterpriseProtected && waitlistProtected && authPracticalGuard ? "PASS" : "WARNING",
      enterpriseProtected && waitlistProtected && authPracticalGuard
        ? "Enterprise access, waitlist, login, signup and password-reset flows have lightweight abuse controls."
        : "One or more public or account flows are missing visible rate limiting."
    ),
    check(
      "Bot Protection",
      "Public forms protected",
      publicFormsProtected ? "PASS" : "WARNING",
      publicFormsProtected
        ? "Enterprise access, Pro waitlist and waitlist forms send Turnstile tokens to protected API routes."
        : "One or more public request forms are missing Turnstile coverage."
    ),
  ];
}
function routeInventoryChecks() {
  return [
    check(
      "Demo And Proof Routes",
      "Demo overview route",
      routeFileExists("demo", "page.tsx") ? "PASS" : "FAIL",
      routeFileExists("demo", "page.tsx") ? "/demo route file is present." : "/demo route file is missing.",
      true
    ),
    check(
      "Demo And Proof Routes",
      "Hiring attack demo route",
      routeFileExists("demo", "hiring-attack", "page.tsx") ? "PASS" : "FAIL",
      routeFileExists("demo", "hiring-attack", "page.tsx") ? "/demo/hiring-attack route file is present." : "/demo/hiring-attack route file is missing.",
      true
    ),
    check(
      "Demo And Proof Routes",
      "Session integrity demo route",
      routeFileExists("demo", "session-integrity", "page.tsx") ? "PASS" : "FAIL",
      routeFileExists("demo", "session-integrity", "page.tsx") ? "/demo/session-integrity route file is present." : "/demo/session-integrity route file is missing.",
      true
    ),
    check(
      "Demo And Proof Routes",
      "Replay route",
      routeFileExists("replay", "[id]", "page.tsx") && routeFileExists("trust-replay", "page.tsx") ? "PASS" : "FAIL",
      routeFileExists("replay", "[id]", "page.tsx") && routeFileExists("trust-replay", "page.tsx")
        ? "Replay detail and replay overview routes are present."
        : "Replay route files are missing.",
      true
    ),
    check(
      "Demo And Proof Routes",
      "Verification receipt route",
      routeFileExists("trust", "receipt", "[id]", "page.tsx") && routeFileExists("verification", "receipt", "[id]", "page.tsx") ? "PASS" : "FAIL",
      routeFileExists("trust", "receipt", "[id]", "page.tsx") && routeFileExists("verification", "receipt", "[id]", "page.tsx")
        ? "Trust receipt and verification receipt routes are present."
        : "Verification receipt route files are missing.",
      true
    ),
  ];
}
function providerChecks() {
  const registry = getIntegrationRegistry();
  const provider = (name: string) => registry.find((item) => item.provider === name);
  const stripe = provider("Stripe");
  const openai = provider("OpenAI");
  const worldId = provider("World ID");
  const hopae = provider("Hopae Connect");
  const email = provider("Email");

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
    check(
      "Identity Providers",
      "Hopae Connect configured or safely disabled",
      hopae?.status === "configured" ? "PASS" : "WARNING",
      hopae?.status === "configured" ? "Hopae Connect is configured." : "Hopae Connect is optional and safely disabled."
    ),
    check(
      "Communications",
      "Email configured or safely disabled",
      email?.status === "configured" ? "PASS" : "WARNING",
      email?.status === "configured"
        ? "Email provider is configured."
        : "Email provider not configured yet; in-app notifications remain operational."
    ),
  ];
}

async function telemetryChecks() {
  if (!hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return [
      check(
        "Operational Telemetry",
        "Telemetry records readable",
        "WARNING",
        "Cannot verify telemetry records; SUPABASE_SERVICE_ROLE_KEY is not configured."
      ),
    ];
  }

  try {
    const supabase = createServiceRoleClient();
    const [{ data: apiRuns, error: apiError }, { data: runtimeLogs, error: runtimeError }] = await Promise.all([
      supabase
        .from("api_test_runs")
        .select("id,test_name,status,created_at")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("runtime_validation_logs")
        .select("id,deployment_state,health_percent,warnings,critical_blockers,created_at")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    if (apiError || runtimeError) {
      return [
        check(
          "Operational Telemetry",
          "Telemetry records readable",
          "WARNING",
          "Operational telemetry records are temporarily unavailable."
        ),
      ];
    }

    const failedApiRuns = (apiRuns ?? []).filter((row) =>
      ["failed", "error"].includes(String(row.status ?? "").toLowerCase())
    );
    const blockedRuntimeLogs = (runtimeLogs ?? []).filter((row) =>
      ["BLOCKED", "FAILURE"].includes(String(row.deployment_state ?? "").toUpperCase())
    );
    const warningRuntimeLogs = (runtimeLogs ?? []).filter((row) => {
      const warnings = Array.isArray(row.warnings) ? row.warnings.length : 0;
      return warnings > 0 || String(row.deployment_state ?? "").toUpperCase() === "CAUTION";
    });

    return [
      check(
        "Operational Telemetry",
        "Recent API test failures",
        failedApiRuns.length ? "WARNING" : "PASS",
        failedApiRuns.length
          ? `${failedApiRuns.length} recent API test failure${failedApiRuns.length === 1 ? "" : "s"} need review.`
          : "No recent API test failures are visible."
      ),
      check(
        "Operational Telemetry",
        "Runtime incident history",
        blockedRuntimeLogs.length ? "WARNING" : "PASS",
        blockedRuntimeLogs.length
          ? `${blockedRuntimeLogs.length} recent runtime validation log${blockedRuntimeLogs.length === 1 ? "" : "s"} recorded blocked state.`
          : "No recent blocked runtime validation logs are visible."
      ),
      check(
        "Operational Telemetry",
        "Runtime warning trend",
        warningRuntimeLogs.length ? "WARNING" : "PASS",
        warningRuntimeLogs.length
          ? `${warningRuntimeLogs.length} recent runtime validation log${warningRuntimeLogs.length === 1 ? "" : "s"} include warnings or caution state.`
          : "No recent runtime warning trend is visible."
      ),
    ];
  } catch {
    return [
      check(
        "Operational Telemetry",
        "Telemetry records readable",
        "WARNING",
        "Operational telemetry checks are temporarily unavailable."
      ),
    ];
  }
}

export async function runRuntimeValidation(baseUrl: string): Promise<RuntimeValidationSummary> {
  const [
    publicPageChecks,
    authSystemChecks,
    enterpriseChecks,
    supabaseChecks,
    securityChecks,
    adminProtectionChecks,
    workflowChecks,
    telemetryStatusChecks,
    accountSecurityChecks,
  ] = await Promise.all([
    Promise.all(publicPages.map((path) => checkAppRoute(baseUrl, path))),
    authChecks(baseUrl),
    enterpriseAccessChecks(baseUrl),
    supabaseRuntimeChecks(),
    securityHeaderChecks(baseUrl),
    Promise.all(protectedRoutes.map((path) => checkProtectedRoute(baseUrl, path))),
    workflowHealthChecks(),
    telemetryChecks(),
    Promise.resolve(emailAndBotProtectionChecks()),
  ]);

  const checks = [
    ...publicPageChecks,
    ...authSystemChecks,
    ...enterpriseChecks,
    ...supabaseChecks,
    ...securityChecks,
    ...adminProtectionChecks,
    ...providerChecks(),
    ...routeInventoryChecks(),
    ...workflowChecks,
    ...telemetryStatusChecks,
    ...accountSecurityChecks,
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
    captureOperationalIssue("runtime_validation", "warning", "Runtime validation log insert failed.", {
      error_name: error instanceof Error ? error.name : "unknown",
    });
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
      captureOperationalIssue("runtime_validation", "warning", "Runtime validation logs unavailable.", {
        error_name: error.name,
      });
      return [];
    }

    return data ?? [];
  } catch (error) {
    captureOperationalIssue("runtime_validation", "warning", "Runtime validation log read failed.", {
      error_name: error instanceof Error ? error.name : "unknown",
    });
    return [];
  }
}
