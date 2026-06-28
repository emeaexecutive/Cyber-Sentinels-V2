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
  "/investor",
  "/design-partner",
  "/why-now",
  "/help",
  "/demo",
  "/demo/hiring-attack",
  "/demo/session-integrity",
  "/verify/session",
  "/security",
  "/trust-principles",
  "/privacy",
  "/terms",
];
const protectedRoutes = [
  "/back-office",
  "/admin/founder-control",
  "/admin/deployment-readiness",
  "/admin/runtime-validation",
  "/admin/support",
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
type WorkflowTableCheck = {
  label: string;
  table: string;
  demoData?: boolean;
};

const workflowTables: WorkflowTableCheck[] = [
  { label: "Enterprise access", table: "enterprise_access_requests", demoData: true },
  { label: "Verification cases", table: "verification_cases", demoData: true },
  { label: "Trust reports", table: "trust_reports", demoData: true },
  { label: "Trust events", table: "trust_events", demoData: true },
  { label: "Trust passports", table: "passports", demoData: true },
  { label: "Interview sessions", table: "interview_sessions", demoData: true },
  { label: "Session integrity checks", table: "session_integrity_checks", demoData: true },
  { label: "Verification signals", table: "verification_signals", demoData: true },
  { label: "Hopae verifications", table: "hopae_verifications" },
  { label: "Hopae webhook events", table: "hopae_webhook_events" },
  { label: "Trust cases", table: "trust_cases", demoData: true },
  { label: "Workspaces", table: "trust_workspaces", demoData: true },
  { label: "Evidence files", table: "evidence_files" },
  { label: "Audit logs", table: "audit_logs" },
  { label: "Verification flags", table: "signals" },
  { label: "Governance tables", table: "governance_actions" },
  { label: "Timeline tables", table: "trust_timeline_events", demoData: true },
  { label: "Trust replay sessions", table: "trust_replay_sessions", demoData: true },
  { label: "Notifications", table: "notifications" },
  { label: "Verification receipts", table: "verification_receipts", demoData: true },
  { label: "Evidence chains", table: "evidence_chains" },
  { label: "AI agents", table: "ai_agents" },
  { label: "Agent activity", table: "agent_activity" },
  { label: "Candidate profiles", table: "candidate_profiles", demoData: true },
  { label: "Recruiter profiles", table: "recruiter_profiles", demoData: true },
  { label: "Interview risk events", table: "interview_risk_events" },
  { label: "Injection risk events", table: "injection_risk_events" },
  { label: "Device channel evidence", table: "device_channel_evidence" },
  { label: "Usage limits", table: "usage_limits" },
  { label: "Billing customers", table: "billing_customers" },
  { label: "Subscriptions", table: "subscriptions" },
  { label: "Integration status", table: "integration_status" },
  { label: "Runtime validation logs", table: "runtime_validation_logs" },
  { label: "Support issues", table: "support_issues" },
];
const requestTimeoutMs = 8000;
const operationalTrustApiRoutes = [
  ["api", "trust", "posture", "route.ts"],
  ["api", "replay", "[id]", "route.ts"],
  ["api", "receipts", "[id]", "route.ts"],
  ["api", "workflows", "[id]", "trust", "route.ts"],
  ["api", "governance", "events", "route.ts"],
  ["api", "providers", "route.ts"],
];

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
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const base = getBaseUrl(baseUrl);
  const callbackRouteExists = routeFileExists("auth", "callback", "route.ts");
  const checks: RuntimeValidationCheck[] = [
    check(
      "Auth System",
      "Callback route exists",
      callbackRouteExists ? "PASS" : "FAIL",
      callbackRouteExists
        ? "Callback route file is present."
        : "Callback route file is missing.",
      true
    ),
    check(
      "Auth System",
      "Site URL / redirect URL warning",
      siteUrl ? (siteUrl === base ? "PASS" : "WARNING") : "WARNING",
      siteUrl
        ? siteUrl === base
          ? `NEXT_PUBLIC_SITE_URL matches this runtime origin and should allow ${siteUrl}/auth/callback.`
          : `NEXT_PUBLIC_SITE_URL is ${siteUrl}; verify Supabase Auth allows both ${siteUrl}/auth/callback and ${base}/auth/callback for this deployment.`
        : `NEXT_PUBLIC_SITE_URL is missing. Configure it and add ${base}/auth/callback to Supabase Auth redirect URLs.`
    ),
  ];

  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");

  if (!supabaseUrl || !anonKey) {
    checks.push(check("Auth System", "Supabase auth configured", "FAIL", "Supabase public env vars are missing.", true));
  } else {
    checks.push(
      await checkSupabaseEndpoint(
        "Auth System",
        "Supabase auth configured",
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
    return workflowTables.map(({ label, table }) =>
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

    const tableChecks = await Promise.all(
      workflowTables.map(async ({ label, table }) => {
        const { count, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true });

        if (error) {
          return {
            check: check(
              "Workflow Health",
              label,
              "WARNING",
              `${table} is unavailable or optional in this environment; dependent pages should render safe empty states.`
            ),
            count: null,
          };
        }

        return {
          check: check("Workflow Health", label, "PASS", `${table} exists and is queryable.`),
          count: count ?? 0,
        };
      })
    );

    const demoTables = workflowTables.filter((item) => item.demoData);
    const demoRowCount = tableChecks.reduce((sum, item, index) => {
      return demoTables.some((demoTable) => demoTable.table === workflowTables[index].table) &&
        typeof item.count === "number"
        ? sum + item.count
        : sum;
    }, 0);
    const demoUnavailable = tableChecks.some((item, index) =>
      demoTables.some((demoTable) => demoTable.table === workflowTables[index].table) &&
      item.count === null
    );
    const demoDataCheck = check(
      "Workflow Health",
      "Demo data",
      demoRowCount > 0 ? "PASS" : "WARNING",
      demoRowCount > 0
        ? `${demoRowCount} demo or workflow record${demoRowCount === 1 ? "" : "s"} available for validation.`
        : demoUnavailable
          ? "Demo data could not be fully verified because one or more optional workflow tables are unavailable."
          : "No demo data yet. Demo pages should continue to render mock-safe states."
    );

    return [...tableChecks.map((item) => item.check), demoDataCheck];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow table validation failed.";

    return workflowTables.map(({ label }) =>
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
  const emailProviderConfigured = hasEnv("RESEND_API_KEY");
  const authModesRender =
    fileContains("app", "login", "page.tsx", /type AuthMode = "sign-in" \| "create-account" \| "magic-link" \| "forgot-password"/) &&
    fileContains("app", "login", "page.tsx", /const \[authMode, setAuthMode\]/) &&
    fileContains("app", "login", "page.tsx", /primaryAuthModes\.map/) &&
    fileContains("app", "login", "page.tsx", /aria-pressed=\{selected\}/) &&
    fileContains("app", "login", "page.tsx", /switchAuthMode\("magic-link"\)/) &&
    fileContains("app", "login", "page.tsx", /switchAuthMode\("forgot-password"\)/);
  const signupConfirmationUx =
    fileContains("app", "login", "page.tsx", /authMode === "create-account"/) &&
    fileContains("app", "login", "page.tsx", /confirmPassword/) &&
    fileContains("app", "login", "page.tsx", /Passwords do not match\./) &&
    fileContains("app", "login", "page.tsx", /canCreateAccount/) &&
    fileContains("app", "login", "page.tsx", /disabled=\{actionDisabled \|\| !canCreateAccount\}/);
  const magicLinkModeConfigured =
    fileContains("app", "login", "page.tsx", /authMode === "magic-link"/) &&
    fileContains("app", "login", "page.tsx", /signInWithMagicLink/) &&
    fileContains("app", "login", "page.tsx", /Check your email for a secure sign-in link\./);
  const forgotPasswordModeConfigured =
    fileContains("app", "login", "page.tsx", /authMode === "forgot-password"/) &&
    fileContains("app", "login", "page.tsx", /sendPasswordResetEmail/) &&
    fileContains("app", "login", "page.tsx", /If the account exists, password reset instructions have been sent\./);
  const signupSuccessGuidance =
    fileContains("app", "login", "page.tsx", /Check your email to verify your account before continuing\./) &&
    fileContains("app", "login", "page.tsx", /supabase\.auth\.resend/) &&
    fileContains("app", "login", "page.tsx", /spam or junk/);
  const signupRedirectConfigured =
    fileContains("app", "login", "page.tsx", /emailRedirectTo:\s*`\$\{window\.location\.origin\}\/auth\/callback/) &&
    fileContains("app", "verify-email", "page.tsx", /supabase\.auth\.resend/) &&
    fileContains("app", "verify-email", "page.tsx", /\/auth\/callback/);
  const verificationRedirectConfigured =
    fileContains("app", "auth", "callback", "route.ts", /exchangeCodeForSession/) &&
    fileContains("app", "auth", "callback", "route.ts", /NextResponse\.redirect\(new URL\(next, url\.origin\)\)/);
  const adminAccessDiscoverableAndProtected =
    !fileContains("app", "login", "page.tsx", /Administrative access/) &&
    fileContains("app", "layout.tsx", /Administrative access/) &&
    fileContains("middleware.ts", /adminPagePrefixes/) &&
    fileContains("middleware.ts", /\/admin/) &&
    fileContains("lib", "admin-auth.ts", /requireAdminAccess|adminVerifiedCookieName/);

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
      "Account Security",
      "Email verification expected",
      emailGateConfigured && signupRedirectConfigured && verificationRedirectConfigured ? "PASS" : "WARNING",
      emailGateConfigured && signupRedirectConfigured && verificationRedirectConfigured
        ? "Signup and resend flows route through /auth/callback, verification exchanges restore the intended redirect, and middleware blocks unverified users from protected workflows."
        : "Signup redirect, resend verification, callback redirect, or middleware verification checks need review."
    ),
    check(
      "Account Security",
      "Auth modes render",
      authModesRender ? "PASS" : "WARNING",
      authModesRender
        ? "Login renders explicit sign-in, create-account, magic-link and forgot-password modes."
        : "Login is missing explicit auth mode controls."
    ),
    check(
      "Account Security",
      "Signup confirmation UX",
      signupConfirmationUx ? "PASS" : "WARNING",
      signupConfirmationUx
        ? "Signup requires password confirmation, blocks mismatches, and disables account creation until the form is valid."
        : "Signup password confirmation or mismatch blocking needs review."
    ),
    check(
      "Account Security",
      "Magic link mode",
      magicLinkModeConfigured ? "PASS" : "WARNING",
      magicLinkModeConfigured
        ? "Magic link mode shows an email-only flow and confirms secure link delivery."
        : "Magic link mode or success message needs review."
    ),
    check(
      "Account Security",
      "Forgot password mode",
      forgotPasswordModeConfigured ? "PASS" : "WARNING",
      forgotPasswordModeConfigured
        ? "Forgot password mode shows an email-only flow and avoids account enumeration in the success message."
        : "Forgot password mode or account-safe success message needs review."
    ),
    check(
      "Account Security",
      "Signup success guidance",
      signupSuccessGuidance ? "PASS" : "WARNING",
      signupSuccessGuidance
        ? "Signup success tells users to verify email, includes resend support, and reminds them to check spam or correct the email address."
        : "Signup success state is missing verification guidance, resend support, or spam/correct-email reminders."
    ),
    check(
      "Admin Protection",
      "Administrative access entry",
      adminAccessDiscoverableAndProtected ? "PASS" : "WARNING",
      adminAccessDiscoverableAndProtected
        ? "Administrative access is limited to the subtle footer link while protected admin routes still use middleware and admin verification helpers."
        : "Administrative access footer placement or admin protection wiring needs review."
    ),
    check(
      "Account Security",
      "Email provider status",
      emailProviderConfigured ? "PASS" : "WARNING",
      emailProviderConfigured
        ? "RESEND_API_KEY is configured for app-managed email delivery. Supabase Auth email settings still need dashboard confirmation."
        : "No app email provider env detected. Supabase Auth can still send verification emails if SMTP/Auth email is configured in the Supabase dashboard."
    ),
    check(
      "Bot Protection",
      "Turnstile not configured",
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
      "Operational Trust API",
      operationalTrustApiRoutes.every((segments) => routeFileExists(...segments)) &&
        existsSync(join(process.cwd(), "lib", "sdk", "trust-client.ts"))
        ? "PASS"
        : "FAIL",
      operationalTrustApiRoutes.every((segments) => routeFileExists(...segments))
        ? "Authenticated posture, workflow, replay, receipt, governance and provider-status APIs are present."
        : "One or more Operational Trust API route files are missing.",
      true
    ),
    check(
      "Demo And Proof Routes",
      "Demo overview route",
      routeFileExists("demo", "page.tsx") ? "PASS" : "FAIL",
      routeFileExists("demo", "page.tsx") ? "/demo route file is present." : "/demo route file is missing.",
      true
    ),
    check(
      "Demo And Proof Routes",
      "Investor overview route",
      routeFileExists("investor", "page.tsx") ? "PASS" : "FAIL",
      routeFileExists("investor", "page.tsx")
        ? "/investor route file is present."
        : "/investor route file is missing.",
      true
    ),
    check(
      "Demo And Proof Routes",
      "Operational trust principles route",
      routeFileExists("trust-principles", "page.tsx") &&
        fileContains("app", "trust-principles", "page.tsx", /Trust must be replayable/)
        ? "PASS"
        : "FAIL",
      routeFileExists("trust-principles", "page.tsx")
        ? "Operational trust principles and replay standard are present."
        : "/trust-principles route file is missing.",
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
      "Multi-signal workflow trust engine",
      routeFileExists("admin", "test-lab", "page.tsx") &&
        existsSync(join(process.cwd(), "lib", "trust-engine.ts")) &&
        fileContains("lib", "trust-engine.ts", /evolveWorkflowTrust/) ? "PASS" : "FAIL",
      routeFileExists("admin", "test-lab", "page.tsx") &&
        existsSync(join(process.cwd(), "lib", "trust-engine.ts"))
        ? "Trust engine and protected validation lab are present."
        : "Trust engine or protected validation lab is missing.",
      true
    ),
    check(
      "Demo And Proof Routes",
      "Operational trust memory",
      existsSync(join(process.cwd(), "lib", "trust-memory.ts")) &&
        fileContains("lib", "trust-memory.ts", /rememberTrustEvolution/) &&
        fileContains("lib", "trust-memory.ts", /recordGovernedExecution/) ? "PASS" : "FAIL",
      existsSync(join(process.cwd(), "lib", "trust-memory.ts"))
        ? "Trust memory, historical posture and governed execution foundations are present."
        : "Operational trust memory model is missing.",
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
    check(
      "Demo And Proof Routes",
      "Portable receipt verification",
      routeFileExists("verification-receipts", "page.tsx") &&
        existsSync(join(process.cwd(), "lib", "trust-receipts", "verification.ts")) &&
        fileContains("lib", "trust-receipts", "verification.ts", /verifyReceiptContinuity/) &&
        fileContains("lib", "trust-receipts", "verification.ts", /buildPortableTrustEvidence/)
        ? "PASS"
        : "FAIL",
      existsSync(join(process.cwd(), "lib", "trust-receipts", "verification.ts"))
        ? "Portable receipt summary and deterministic continuity verification are present."
        : "Portable receipt verification model is missing.",
      true
    ),
    check(
      "Operational Support",
      "Protected screenshot support workflow",
      routeFileExists("admin", "support", "page.tsx") &&
        routeFileExists("admin", "support", "[id]", "page.tsx") &&
        routeFileExists("api", "support", "issues", "route.ts") &&
        existsSync(join(process.cwd(), "components", "report-issue.tsx"))
        ? "PASS"
        : "FAIL",
      routeFileExists("admin", "support", "page.tsx")
        ? "Authenticated issue reporting and admin-only support review routes are present."
        : "Screenshot support workflow files are missing.",
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
      "Stripe not configured",
      stripe?.status === "configured" ? "PASS" : "WARNING",
      stripe?.status === "configured" ? "Stripe is configured." : "Stripe not configured yet."
    ),
    check(
      "AI Providers",
      "OpenAI not configured",
      openai?.status === "configured" ? "PASS" : "WARNING",
      openai?.status === "configured" ? "OpenAI is configured." : "OpenAI not configured yet."
    ),
    check(
      "AI Providers",
      "World ID not configured",
      worldId?.status === "configured" ? "PASS" : "WARNING",
      worldId?.status === "configured" ? "World ID is configured." : "World ID not configured yet."
    ),
    check(
      "Identity Providers",
      "Hopae not configured",
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
