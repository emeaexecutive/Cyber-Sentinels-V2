import "server-only";

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationRegistry } from "@/lib/integrations/registry";

export type LaunchCheckState = "ready" | "needs_attention" | "blocked";

export type LaunchCheck = {
  label: string;
  state: LaunchCheckState;
  message: string;
  blocker?: boolean;
};

export type LaunchSection = {
  title: string;
  checks: LaunchCheck[];
};

export type LaunchControlSnapshot = {
  status: "Ready" | "Caution" | "Blocked";
  summary: string;
  sections: LaunchSection[];
  blockers: LaunchCheck[];
  attention: LaunchCheck[];
};

const root = process.cwd();

function routeExists(path: string) {
  return existsSync(join(root, path));
}

function fileContains(path: string, pattern: RegExp) {
  try {
    return pattern.test(readFileSync(join(root, path), "utf8"));
  } catch {
    return false;
  }
}

function check(label: string, ok: boolean, message: string, blocker = false): LaunchCheck {
  return {
    label,
    state: ok ? "ready" : blocker ? "blocked" : "needs_attention",
    message,
    blocker: !ok && blocker,
  };
}

function warning(label: string, ok: boolean, message: string): LaunchCheck {
  return {
    label,
    state: ok ? "ready" : "needs_attention",
    message,
  };
}

async function tableCheck(
  supabase: SupabaseClient,
  table: string,
  label: string
): Promise<LaunchCheck> {
  const { error } = await supabase.from(table).select("id", { head: true, count: "exact" });

  return check(
    label,
    !error,
    error ? `${table} table was not available.` : `${table} table responded.`,
    true
  );
}

function statusFromSections(sections: LaunchSection[]) {
  const allChecks = sections.flatMap((section) => section.checks);
  const blockers = allChecks.filter((item) => item.state === "blocked" || item.blocker);
  const attention = allChecks.filter((item) => item.state === "needs_attention");

  if (blockers.length) {
    return {
      status: "Blocked" as const,
      summary: `${blockers.length} launch blocker${blockers.length === 1 ? "" : "s"} require attention before public testing.`,
      blockers,
      attention,
    };
  }

  if (attention.length) {
    return {
      status: "Caution" as const,
      summary: "Core launch paths are present, with optional integrations or improvements still pending.",
      blockers,
      attention,
    };
  }

  return {
    status: "Ready" as const,
    summary: "Core public, auth, trust workflow, operational and admin controls are ready for public testing.",
    blockers,
    attention,
  };
}

export async function createLaunchControlSnapshot(
  supabase: SupabaseClient
): Promise<LaunchControlSnapshot> {
  const integrationRegistry = getIntegrationRegistry();
  const integration = (provider: string) =>
    integrationRegistry.find((item) => item.provider === provider);
  const supabaseIntegration = integration("Supabase");
  const stripeIntegration = integration("Stripe");
  const openAiIntegration = integration("OpenAI");
  const worldIdIntegration = integration("World ID");

  const passportTable = await tableCheck(supabase, "passports", "Passport table exists");
  const verificationCasesTable = await tableCheck(
    supabase,
    "verification_cases",
    "Verification cases table exists"
  );
  const evidenceFilesTable = await tableCheck(
    supabase,
    "evidence_files",
    "Evidence files table exists"
  );
  const decisionsTable = await tableCheck(supabase, "decisions", "Decisions table exists");
  const auditLogsTable = await tableCheck(supabase, "audit_logs", "Audit logs table exists");
  const signalsTable = await tableCheck(supabase, "signals", "Signals table exists");
  const enterpriseAccessTable = await tableCheck(
    supabase,
    "enterprise_access_requests",
    "Enterprise Access table exists"
  );

  const enterpriseRouteOk =
    routeExists("app/enterprise-access/page.tsx") &&
    routeExists("app/api/enterprise-access/route.ts") &&
    enterpriseAccessTable.state === "ready";
  const signupFlowExists =
    routeExists("app/login/page.tsx") &&
    fileContains("app/login/page.tsx", /sign\s*up|signup|create account|mode.*signup/i);
  const authCallbackExists = routeExists("app/auth/callback/route.ts");
  const adminProtectionExists =
    fileContains("middleware.ts", /\/back-office/) &&
    fileContains("middleware.ts", /\/api\/admin/) &&
    fileContains("middleware.ts", /adminPagePrefixes/);
  const reviewerProtectionExists =
    fileContains("middleware.ts", /\/governance/) &&
    routeExists("app/governance/page.tsx");
  const workspaceProtectionExists =
    fileContains("middleware.ts", /\/workspace/) &&
    routeExists("app/workspace/page.tsx") &&
    routeExists("app/workspace/[id]/page.tsx");
  const timelineProtectionExists =
    fileContains("middleware.ts", /\/timeline/) &&
    routeExists("app/timeline/page.tsx");
  const replayProtectionExists =
    fileContains("middleware.ts", /\/trust-replay/) &&
    routeExists("app/trust-replay/page.tsx");
  const governanceTables = await Promise.all([
    tableCheck(supabase, "governance_policies", "Governance policies table exists"),
    tableCheck(supabase, "governance_actions", "Governance actions table exists"),
    tableCheck(supabase, "trust_workspaces", "Trust workspaces table exists"),
    tableCheck(supabase, "trust_cases", "Trust cases table exists"),
  ]);

  const sections: LaunchSection[] = [
    {
      title: "Public Experience",
      checks: [
        check("Home loads", routeExists("app/page.tsx"), "Home route file exists.", true),
        check("Demo is public", routeExists("app/demo/page.tsx"), "Demo route file exists."),
        check(
          "Enterprise Access is public",
          enterpriseRouteOk,
          enterpriseRouteOk
            ? "Enterprise Access page, API and table are available."
            : "Enterprise Access route, API or table is missing.",
          true
        ),
        check("Pricing loads", routeExists("app/pricing/page.tsx"), "Pricing route file exists."),
        check("Help loads", routeExists("app/help/page.tsx"), "Help route file exists."),
        check(
          "Legal pages load",
          routeExists("app/legal/page.tsx") &&
            routeExists("app/terms/page.tsx") &&
            routeExists("app/privacy/page.tsx"),
          "Legal, Terms and Privacy route files are expected."
        ),
      ],
    },
    {
      title: "Auth Experience",
      checks: [
        check("Login page loads", routeExists("app/login/page.tsx"), "Login route file exists.", true),
        check("Signup flow exists", signupFlowExists, "Login page includes signup/create-account flow.", true),
        check("Auth callback exists", authCallbackExists, "Supabase auth callback route exists.", true),
        check("Logout works", routeExists("app/api/auth/logout/route.ts"), "Logout route exists."),
        check("Password reset route exists", routeExists("app/reset-password/page.tsx"), "Password reset route exists."),
      ],
    },
    {
      title: "Core Trust Workflow",
      checks: [
        passportTable,
        verificationCasesTable,
        evidenceFilesTable,
        decisionsTable,
        auditLogsTable,
        signalsTable,
      ],
    },
    {
      title: "Operational Workflow",
      checks: [
        check("Evidence upload route exists", routeExists("app/evidence-upload/page.tsx"), "Evidence upload page exists."),
        check("Back Office route protected", adminProtectionExists, "Middleware protects Back Office.", true),
        check(
          "Admin decision route protected",
          routeExists("app/api/admin/verification-cases/[id]/decision/route.ts") &&
            fileContains("middleware.ts", /\/api\/admin/),
          "Admin decision route exists under protected /api/admin.",
          true
        ),
        check(
          "Trust Graph route protected",
          routeExists("app/trust-graph-engine/page.tsx") &&
            fileContains("middleware.ts", /\/trust-graph-engine/),
          "Trust Graph Engine route exists and is in admin middleware.",
          true
        ),
        check("Notifications route exists", routeExists("app/notifications/page.tsx"), "Notifications page exists."),
        check("Appeals route exists", routeExists("app/appeals/page.tsx"), "Appeals page exists."),
      ],
    },
    {
      title: "Trust Readiness",
      checks: [
        check(
          "Auth boundary ready",
          adminProtectionExists && reviewerProtectionExists && workspaceProtectionExists,
          "Admin, reviewer and workspace routes are protected.",
          true
        ),
        warning(
          "Billing readiness",
          stripeIntegration?.status === "configured",
          stripeIntegration?.status === "disabled"
            ? "Billing is safely disabled until Stripe is configured."
            : stripeIntegration?.notes ?? "Stripe status unknown."
        ),
        check(
          "Governance readiness",
          governanceTables.every((item) => item.state === "ready") &&
            routeExists("app/governance/page.tsx"),
          "Governance policies, actions and route are expected.",
          true
        ),
        check(
          "Trust workflow readiness",
          passportTable.state === "ready" &&
            evidenceFilesTable.state === "ready" &&
            decisionsTable.state === "ready" &&
            auditLogsTable.state === "ready" &&
            signalsTable.state === "ready",
          "Core trust workflow tables responded.",
          true
        ),
        warning(
          "Integration readiness",
          supabaseIntegration?.status === "configured" &&
            (!stripeIntegration || ["configured", "disabled"].includes(stripeIntegration.status)) &&
            (!openAiIntegration || ["configured", "disabled"].includes(openAiIntegration.status)) &&
            (!worldIdIntegration || ["configured", "disabled"].includes(worldIdIntegration.status)),
          "Optional integrations must be configured or safely disabled."
        ),
        check(
          "Uploads readiness",
          routeExists("app/evidence-upload/page.tsx") &&
            routeExists("app/api/evidence/upload/route.ts") &&
            evidenceFilesTable.state === "ready",
          "Evidence upload page, API and table are available.",
          true
        ),
        warning(
          "AI assistance readiness",
          openAiIntegration?.status === "configured",
          openAiIntegration?.status === "disabled"
            ? "AI assistance is safely disabled until OPENAI_API_KEY is configured."
            : openAiIntegration?.notes ?? "OpenAI status unknown."
        ),
        check(
          "History routes protected",
          timelineProtectionExists && replayProtectionExists,
          "Timeline and replay routes are authenticated operational history routes.",
          true
        ),
      ],
    },
    {
      title: "Integrations",
      checks: [
        check(
          "Supabase configured",
          supabaseIntegration?.status === "configured",
          supabaseIntegration?.notes ?? "Supabase configuration missing.",
          true
        ),
        check(
          "Service role configured",
          Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          "SUPABASE_SERVICE_ROLE_KEY is required for admin diagnostics.",
          true
        ),
        warning(
          "Stripe configured or safely disabled",
          stripeIntegration?.status === "configured",
          stripeIntegration?.status === "disabled"
            ? "Stripe is safely disabled until configured."
            : stripeIntegration?.notes ?? "Stripe status unknown."
        ),
        warning(
          "OpenAI configured or safely disabled",
          openAiIntegration?.status === "configured",
          openAiIntegration?.status === "disabled"
            ? "OpenAI is safely disabled until configured."
            : openAiIntegration?.notes ?? "OpenAI status unknown."
        ),
        warning(
          "World ID configured or safely disabled",
          worldIdIntegration?.status === "configured",
          worldIdIntegration?.status === "disabled"
            ? "World ID is safely disabled until configured."
            : worldIdIntegration?.notes ?? "World ID status unknown."
        ),
      ],
    },
  ];

  const status = statusFromSections(sections);

  return {
    ...status,
    sections,
  };
}
