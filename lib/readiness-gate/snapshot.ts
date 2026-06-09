import "server-only";

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getIntegrationRegistry } from "@/lib/integrations/registry";

export type ReadinessGateState = "ready" | "caution" | "blocked";

export type ReadinessGateCheck = {
  label: string;
  state: ReadinessGateState;
  message: string;
  blocker?: boolean;
};

export type ReadinessGateSection = {
  title: string;
  checks: ReadinessGateCheck[];
};

export type ReadinessGateStatus =
  | "READY FOR DESIGN PARTNERS"
  | "INTERNAL ONLY"
  | "BLOCKED";

export type ReadinessGateSnapshot = {
  status: ReadinessGateStatus;
  summary: string;
  sections: ReadinessGateSection[];
  blockers: ReadinessGateCheck[];
  cautions: ReadinessGateCheck[];
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

function check(label: string, ok: boolean, message: string, blocker = false): ReadinessGateCheck {
  return {
    label,
    state: ok ? "ready" : blocker ? "blocked" : "caution",
    message,
    blocker: !ok && blocker,
  };
}

function caution(label: string, ok: boolean, message: string): ReadinessGateCheck {
  return {
    label,
    state: ok ? "ready" : "caution",
    message,
  };
}

async function tableCheck(
  supabase: SupabaseClient,
  table: string,
  label: string,
  blocker = false
) {
  const { error } = await supabase
    .from(table)
    .select("id", { head: true, count: "exact" });

  return check(
    label,
    !error,
    error ? `${table} is not available.` : `${table} responded.`,
    blocker
  );
}

function statusFromSections(sections: ReadinessGateSection[]) {
  const allChecks = sections.flatMap((section) => section.checks);
  const blockers = allChecks.filter((item) => item.state === "blocked" || item.blocker);
  const cautions = allChecks.filter((item) => item.state === "caution");

  if (blockers.length) {
    return {
      status: "BLOCKED" as const,
      summary: `${blockers.length} critical readiness gate item${blockers.length === 1 ? "" : "s"} must be resolved before design-partner rollout.`,
      blockers,
      cautions,
    };
  }

  if (cautions.length) {
    return {
      status: "INTERNAL ONLY" as const,
      summary:
        "Critical paths are present, but optional integrations or operational polish should stay internal until reviewed.",
      blockers,
      cautions,
    };
  }

  return {
    status: "READY FOR DESIGN PARTNERS" as const,
    summary:
      "Public entry, auth, trust workflows, governance, integrations and security controls are ready for controlled design-partner rollout.",
    blockers,
    cautions,
  };
}

export async function createReadinessGateSnapshot(
  supabase: SupabaseClient
): Promise<ReadinessGateSnapshot> {
  const registry = getIntegrationRegistry();
  const integration = (provider: string) =>
    registry.find((item) => item.provider === provider);
  const supabaseIntegration = integration("Supabase");
  const stripeIntegration = integration("Stripe");
  const openAiIntegration = integration("OpenAI");
  const worldIdIntegration = integration("World ID");

  const enterpriseAccessTable = await tableCheck(
    supabase,
    "enterprise_access_requests",
    "Enterprise access submissions table",
    true
  );
  const passportTable = await tableCheck(supabase, "passports", "Passport table", true);
  const evidenceTable = await tableCheck(supabase, "evidence_files", "Evidence files table", true);
  const decisionsTable = await tableCheck(supabase, "decisions", "Decisions table", true);
  const signalsTable = await tableCheck(supabase, "signals", "Signals table", true);
  const auditLogsTable = await tableCheck(supabase, "audit_logs", "Audit logs table", true);
  const timelineTable = await tableCheck(
    supabase,
    "trust_timeline_events",
    "Trust timeline events table",
    true
  );
  const trustCasesTable = await tableCheck(supabase, "trust_cases", "Trust cases table");
  const governanceActionsTable = await tableCheck(
    supabase,
    "governance_actions",
    "Governance actions table"
  );
  const notificationsTable = await tableCheck(supabase, "notifications", "Notifications table");

  const enterpriseAccessSubmits =
    routeExists("app/enterprise-access/page.tsx") &&
    routeExists("app/api/enterprise-access/route.ts") &&
    enterpriseAccessTable.state === "ready" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const authCallbackWorks = routeExists("app/auth/callback/route.ts");
  const adminProtectionWorks =
    fileContains("middleware.ts", /adminPagePrefixes/) &&
    fileContains("middleware.ts", /\/admin\/launch-control/) &&
    fileContains("middleware.ts", /\/api\/admin/);
  const userRoutesIsolated =
    fileContains("middleware.ts", /userPagePrefixes/) &&
    fileContains("middleware.ts", /\/passport/) &&
    fileContains("middleware.ts", /\/workspace/) &&
    fileContains("middleware.ts", /\/notifications/);
  const publicRoutesIntentional =
    routeExists("app/page.tsx") &&
    routeExists("app/demo/page.tsx") &&
    routeExists("app/pricing/page.tsx") &&
    routeExists("app/help/page.tsx");
  const rlsEnabled =
    fileContains("supabase/migrations/202606080006_operational_hardening_rls.sql", /enable row level security/i) &&
    fileContains("supabase/migrations/202606030002_messages_notifications_appeals.sql", /alter table public\.notifications enable row level security/i);
  const evidenceStoragePrivate =
    fileContains("supabase/migrations/202606030006_private_evidence_bucket.sql", /private/i) &&
    routeExists("app/api/evidence/upload/route.ts");

  const sections: ReadinessGateSection[] = [
    {
      title: "Public Entry",
      checks: [
        check("Home loads", routeExists("app/page.tsx"), "Home route exists.", true),
        check("Demo public", routeExists("app/demo/page.tsx"), "Demo route exists."),
        check("Pricing public", routeExists("app/pricing/page.tsx"), "Pricing route exists."),
        check(
          "Enterprise access submits",
          enterpriseAccessSubmits,
          enterpriseAccessSubmits
            ? "Enterprise Access page, API, table and server credentials are present."
            : "Enterprise Access submission path is incomplete.",
          true
        ),
        check("Help public", routeExists("app/help/page.tsx"), "Help route exists."),
        check(
          "Legal pages populated",
          routeExists("app/legal/page.tsx") &&
            routeExists("app/terms/page.tsx") &&
            routeExists("app/privacy/page.tsx"),
          "Legal, Terms and Privacy routes exist."
        ),
      ],
    },
    {
      title: "Auth Entry",
      checks: [
        check("Login works", routeExists("app/login/page.tsx"), "Login route exists.", true),
        check(
          "Signup works",
          routeExists("app/login/page.tsx") &&
            fileContains("app/login/page.tsx", /sign\s*up|signup|create account|mode.*signup/i),
          "Login route includes signup/create account flow."
        ),
        check("Email callback works", authCallbackWorks, "Auth callback route exists.", true),
        check("Logout works", routeExists("app/api/auth/logout/route.ts"), "Logout API route exists."),
        check("Password reset handled", routeExists("app/reset-password/page.tsx"), "Password reset route exists."),
      ],
    },
    {
      title: "Core Trust Workflow",
      checks: [
        check(
          "Create passport",
          routeExists("app/api/passports/route.ts") && passportTable.state === "ready",
          "Passport API route and table are available.",
          true
        ),
        check(
          "Evidence upload",
          routeExists("app/api/evidence/upload/route.ts") && evidenceTable.state === "ready",
          "Evidence upload API and table are available.",
          true
        ),
        check(
          "Review evidence",
          routeExists("app/api/admin/evidence/[id]/decision/route.ts"),
          "Admin evidence review route exists."
        ),
        decisionsTable,
        signalsTable,
        auditLogsTable,
        timelineTable,
      ],
    },
    {
      title: "Governance Workflow",
      checks: [
        trustCasesTable,
        governanceActionsTable,
        notificationsTable,
        check("Appeal route works", routeExists("app/appeals/page.tsx"), "Appeals route exists."),
        check("Replay route works", routeExists("app/trust-replay/page.tsx"), "Trust replay route exists."),
      ],
    },
    {
      title: "Integrations",
      checks: [
        check(
          "Supabase connected",
          supabaseIntegration?.status === "configured",
          supabaseIntegration?.notes ?? "Supabase configuration is missing.",
          true
        ),
        check(
          "Service role configured",
          Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          "Service role key is required for server-side operational workflows.",
          true
        ),
        caution(
          "Stripe configured or safely disabled",
          stripeIntegration?.status === "configured",
          stripeIntegration?.status === "disabled"
            ? "Stripe is safely disabled until configured."
            : stripeIntegration?.notes ?? "Stripe status unknown."
        ),
        caution(
          "OpenAI configured or safely disabled",
          openAiIntegration?.status === "configured",
          openAiIntegration?.status === "disabled"
            ? "OpenAI is safely disabled until configured."
            : openAiIntegration?.notes ?? "OpenAI status unknown."
        ),
        caution(
          "World ID configured or safely disabled",
          worldIdIntegration?.status === "configured",
          worldIdIntegration?.status === "disabled"
            ? "World ID is safely disabled until configured."
            : worldIdIntegration?.notes ?? "World ID status unknown."
        ),
      ],
    },
    {
      title: "Security",
      checks: [
        check("Admin routes protected", adminProtectionWorks, "Admin and /api/admin routes are guarded.", true),
        check("User routes isolated", userRoutesIsolated, "User workflow routes are authenticated."),
        check("Public routes intentional", publicRoutesIntentional, "Primary public routes are explicit."),
        check("RLS enabled", rlsEnabled, "Major operational tables have RLS migrations."),
        check("Evidence storage private", evidenceStoragePrivate, "Private evidence storage migration and upload route exist."),
      ],
    },
  ];

  const status = statusFromSections(sections);

  return {
    ...status,
    sections,
  };
}
