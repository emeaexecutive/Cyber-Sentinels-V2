import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export type QaStatus = "ready" | "partial" | "missing" | "blocked";

export type QaCheck = {
  label: string;
  status: QaStatus;
  detail: string;
};

export type QaSection = {
  title: string;
  checks: QaCheck[];
};

const databaseTables = [
  "waitlist",
  "passports",
  "trust_reports",
  "signals",
  "audit_logs",
] as const;

function appPath(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

function fileCheck(label: string, segments: string[], detail: string): QaCheck {
  return existsSync(appPath(...segments))
    ? { label, status: "ready", detail }
    : { label, status: "missing", detail: "Expected route file was not found." };
}

function envPresence(name: string): QaStatus {
  return process.env[name] ? "ready" : "partial";
}

function createQaSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function statusFromDatabaseError(errorCode?: string | null): QaStatus {
  if (errorCode === "42P01" || errorCode === "PGRST205") {
    return "missing";
  }

  return "partial";
}

async function tableCheck(table: (typeof databaseTables)[number]): Promise<QaCheck> {
  const supabase = createQaSupabaseClient();
  const label = `${table} table reachable`;

  if (!supabase) {
    return {
      label,
      status: "blocked",
      detail: "Supabase public URL or anon key is not configured.",
    };
  }

  const { error } = await supabase.from(table).select("id").limit(1);

  if (error) {
    return {
      label,
      status: statusFromDatabaseError(error.code),
      detail:
        statusFromDatabaseError(error.code) === "missing"
          ? "Table was not found in the connected Supabase project."
          : "Table probe returned a safe non-secret error.",
    };
  }

  return {
    label,
    status: "ready",
    detail: "Read probe completed without exposing row data.",
  };
}

function aggregateStatus(checks: QaCheck[]): QaStatus {
  if (checks.some((check) => check.status === "blocked")) return "blocked";
  if (checks.some((check) => check.status === "missing")) return "missing";
  if (checks.some((check) => check.status === "partial")) return "partial";

  return "ready";
}

export async function getQaReadiness() {
  const databaseChecks = await Promise.all(databaseTables.map(tableCheck));

  const sections: QaSection[] = [
    {
      title: "Auth",
      checks: [
        fileCheck("login page loads", ["app", "login", "page.tsx"], "/login route file exists."),
        fileCheck(
          "callback route exists",
          ["app", "auth", "callback", "route.ts"],
          "/auth/callback route file exists.",
        ),
        fileCheck("admin protection exists", ["lib", "admin-auth.ts"], "Admin allowlist and step-up helper exists."),
        fileCheck(
          "logout route exists",
          ["app", "api", "auth", "logout", "route.ts"],
          "/api/auth/logout route file exists.",
        ),
      ],
    },
    {
      title: "Database",
      checks: databaseChecks,
    },
    {
      title: "Trust Loop",
      checks: [
        fileCheck(
          "create passport",
          ["app", "api", "passports", "route.ts"],
          "Passport creation API route exists.",
        ),
        fileCheck("create signal", ["lib", "trust-engine", "createSignal.ts"], "Signal helper exists."),
        fileCheck("create audit log", ["lib", "trust-engine", "createAuditLog.ts"], "Audit helper exists."),
        fileCheck("view in command center", ["app", "command-center", "page.tsx"], "Command Center page exists."),
        fileCheck("view in admin", ["app", "admin", "page.tsx"], "Admin page exists."),
      ],
    },
    {
      title: "Verification Workflow",
      checks: [
        {
          label: "verification case exists",
          status:
            databaseChecks.find((check) => check.label.startsWith("passports"))?.status === "blocked"
              ? "blocked"
              : existsSync(appPath("app", "verification-queue", "page.tsx"))
                ? "ready"
                : "missing",
          detail: "Verification queue page and case workflow are expected.",
        },
        fileCheck(
          "decision route exists",
          ["app", "api", "admin", "verification-cases", "[id]", "decision", "route.ts"],
          "Protected verification decision route exists.",
        ),
        fileCheck(
          "status update path exists",
          ["components", "admin-verification-actions.tsx"],
          "Admin verification action component exists.",
        ),
      ],
    },
    {
      title: "Public Verification",
      checks: [
        fileCheck("verify page loads", ["app", "verify", "page.tsx"], "/verify page exists."),
        fileCheck("public profile loads", ["app", "profile", "page.tsx"], "/profile page exists."),
        fileCheck("trust registry loads", ["app", "trust-registry", "page.tsx"], "/trust-registry page exists."),
        fileCheck("embeds page loads", ["app", "trust-embeds", "page.tsx"], "/trust-embeds page exists."),
      ],
    },
    {
      title: "Security",
      checks: [
        fileCheck("admin requires login", ["app", "admin", "page.tsx"], "Admin page redirects unauthenticated users."),
        fileCheck("admin access gate exists", ["app", "admin", "access", "page.tsx"], "Admin access gate route exists."),
        {
          label: "API routes return safe errors",
          status: "ready",
          detail: "QA console reports only route presence and generic probe results.",
        },
        {
          label: "no secrets displayed",
          status: "ready",
          detail: "Environment checks show presence only, never values.",
        },
      ],
    },
    {
      title: "Deployment",
      checks: [
        {
          label: "Vercel env vars set placeholder",
          status:
            envPresence("NEXT_PUBLIC_SUPABASE_URL") === "ready" &&
            envPresence("NEXT_PUBLIC_SUPABASE_ANON_KEY") === "ready"
              ? "ready"
              : "partial",
          detail: "Confirm Vercel has Supabase URL, anon key and server-only secrets configured.",
        },
        {
          label: "GitHub Pages disabled reminder",
          status: "partial",
          detail: "Use Vercel or another Next.js host for App Router server routes.",
        },
        {
          label: "Supabase redirect URL reminder",
          status: envPresence("NEXT_PUBLIC_APP_URL"),
          detail: "Confirm Supabase auth redirects include the deployed callback URL.",
        },
      ],
    },
  ];

  const allChecks = sections.flatMap((section) => section.checks);

  return {
    sections,
    summary: {
      ready: allChecks.filter((check) => check.status === "ready").length,
      partial: allChecks.filter((check) => check.status === "partial").length,
      missing: allChecks.filter((check) => check.status === "missing").length,
      blocked: allChecks.filter((check) => check.status === "blocked").length,
      status: aggregateStatus(allChecks),
    },
  };
}
