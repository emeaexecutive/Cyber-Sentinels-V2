import "server-only";

import type { RuntimeValidationSummary } from "@/lib/runtime-validation/runner";
import type { TrustIntegritySummary } from "@/lib/trust-integrity/repair";
import {
  isPilotWorkspace,
  pilotOrganizationStates,
  pilotStateFromWorkspace,
  type PilotOrganizationState,
} from "@/lib/pilot-mode";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DeploymentReadinessState = "READY" | "CAUTION" | "BLOCKED";

export type DeploymentReadinessSection = {
  category: string;
  state: DeploymentReadinessState;
  message: string;
  checks: Array<{
    label: string;
    state: DeploymentReadinessState;
    message: string;
  }>;
};

export type PilotOperationalMetrics = {
  casesCreated: number;
  governanceReviewsCompleted: number;
  trustReceiptsGenerated: number;
  replaySessionsViewed: number;
  unresolvedEscalations: number;
  onboardingCompletion: number;
  pilotWorkspaces: number;
  pilotStateCounts: Record<PilotOrganizationState, number>;
};

export type DeploymentReadinessReport = {
  generatedAt: string;
  state: DeploymentReadinessState;
  readinessPercent: number;
  blockers: string[];
  warnings: string[];
  metrics: PilotOperationalMetrics;
  sections: DeploymentReadinessSection[];
};

type AnyRow = Record<string, unknown>;

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const optionalEnv = [
  "STRIPE_SECRET_KEY",
  "OPENAI_API_KEY",
  "WORLD_ID_APP_ID",
] as const;

function hasEnv(name: string) {
  return Boolean(String(process.env[name] ?? "").trim());
}

function stateWeight(state: DeploymentReadinessState) {
  if (state === "READY") return 1;
  if (state === "CAUTION") return 0.5;
  return 0;
}

function sectionState(checks: DeploymentReadinessSection["checks"]) {
  if (checks.some((check) => check.state === "BLOCKED")) return "BLOCKED";
  if (checks.some((check) => check.state === "CAUTION")) return "CAUTION";
  return "READY";
}

function section(
  category: string,
  message: string,
  checks: DeploymentReadinessSection["checks"]
): DeploymentReadinessSection {
  return {
    category,
    message,
    checks,
    state: sectionState(checks),
  };
}

function rowId(row: AnyRow) {
  return typeof row.id === "string" ? row.id : "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readRows(table: string, orderColumn = "created_at", limit = 500) {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderColumn, { ascending: false })
      .limit(limit);

    if (error) {
      return [] as AnyRow[];
    }

    return (data ?? []) as AnyRow[];
  } catch {
    return [] as AnyRow[];
  }
}

export async function readPilotOperationalMetrics(): Promise<PilotOperationalMetrics> {
  const [
    workspaces,
    cases,
    governanceActions,
    receipts,
    replaySessions,
    auditLogs,
  ] = await Promise.all([
    readRows("trust_workspaces"),
    readRows("trust_cases"),
    readRows("governance_actions"),
    readRows("verification_receipts", "issued_at"),
    readRows("trust_replay_sessions"),
    readRows("audit_logs"),
  ]);
  const pilotWorkspaceIds = new Set(workspaces.filter(isPilotWorkspace).map(rowId).filter(Boolean));
  const pilotStateCounts = pilotOrganizationStates.reduce(
    (counts, state) => ({ ...counts, [state]: 0 }),
    {} as Record<PilotOrganizationState, number>
  );
  workspaces.filter(isPilotWorkspace).forEach((workspace) => {
    const state = pilotStateFromWorkspace(workspace);
    pilotStateCounts[state] += 1;
  });
  const pilotCases = cases.filter((item) => pilotWorkspaceIds.has(stringValue(item.workspace_id)));
  const pilotCaseIds = new Set(pilotCases.map(rowId).filter(Boolean));
  const completedGovernance = governanceActions.filter((item) =>
    ["approved", "rejected", "resolved"].includes(stringValue(item.action_status).toLowerCase())
  );
  const unresolvedEscalations = [
    ...pilotCases.filter((item) => stringValue(item.status) === "escalated"),
    ...governanceActions.filter((item) => stringValue(item.action_status) === "escalated"),
  ].length;
  const replayViews = auditLogs.filter((item) =>
    /replay.*view|trust_replay/i.test(stringValue(item.event_type))
  ).length;
  const onboardingSteps = [
    workspaces.length > 0,
    workspaces.some(isPilotWorkspace),
    pilotCases.length > 0 || cases.length > 0,
    receipts.length > 0,
    replaySessions.length > 0,
    governanceActions.length > 0,
  ];

  return {
    casesCreated: pilotCases.length || cases.length,
    governanceReviewsCompleted: completedGovernance.length,
    trustReceiptsGenerated: receipts.filter((receipt) => {
      const subjectId = stringValue(receipt.subject_id);
      return !pilotCaseIds.size || pilotCaseIds.has(subjectId) || stringValue(receipt.subject_type) !== "trust_case";
    }).length,
    replaySessionsViewed: replayViews,
    unresolvedEscalations,
    onboardingCompletion: Math.round(
      (onboardingSteps.filter(Boolean).length / onboardingSteps.length) * 100
    ),
    pilotWorkspaces: pilotWorkspaceIds.size,
    pilotStateCounts,
  };
}

export function buildDeploymentReadinessReport(input: {
  runtime: RuntimeValidationSummary;
  integrity: TrustIntegritySummary | null;
  metrics: PilotOperationalMetrics;
}): DeploymentReadinessReport {
  const runtimeBlocked = input.runtime.deploymentState === "BLOCKED";
  const integrityIssues = input.integrity
    ? Object.values(input.integrity.issues).reduce((sum, value) => sum + value, 0)
    : 0;
  const envChecks = [
    ...requiredEnv.map((name) => ({
      label: name,
      state: hasEnv(name) ? "READY" as const : "BLOCKED" as const,
      message: hasEnv(name) ? "Configured." : `${name} is required for pilot execution.`,
    })),
    ...optionalEnv.map((name) => ({
      label: name,
      state: hasEnv(name) ? "READY" as const : "CAUTION" as const,
      message: hasEnv(name) ? "Configured." : `${name} not configured yet; dependent workflows should stay safely disabled.`,
    })),
  ];
  const accountSecurityChecks = input.runtime.checks
    .filter((check) => ["Account Security", "Bot Protection"].includes(check.category))
    .map((check) => ({
      label: check.label,
      state: check.state === "PASS" ? "READY" as const : check.state === "WARNING" ? "CAUTION" as const : "BLOCKED" as const,
      message: check.message,
    }));

  const sections = [
    section("Runtime Validation", "Deployment health, routes and provider checks.", [
      {
        label: "Runtime validation",
        state: runtimeBlocked ? "BLOCKED" : input.runtime.deploymentState === "READY" ? "READY" : "CAUTION",
        message: `${input.runtime.healthPercent}% health with ${input.runtime.criticalBlockers.length} critical blockers.`,
      },
    ]),
    section("Environment Readiness", "Required and optional environment configuration.", envChecks),
    section("Account And Form Security", "Email verification, Turnstile and public form protection before pilot rollout.", accountSecurityChecks),
    section("Workflow Readiness", "Trust cases, governance, receipts, replay and timeline continuity.", [
      {
        label: "Trust integrity",
        state: !input.integrity ? "CAUTION" : integrityIssues > 0 ? "CAUTION" : "READY",
        message: input.integrity
          ? `${integrityIssues} integrity issues currently reported.`
          : "Trust integrity audit unavailable; service-role access may be missing.",
      },
      {
        label: "Receipts and replay",
        state: input.metrics.trustReceiptsGenerated > 0 && input.metrics.pilotWorkspaces > 0 ? "READY" : "CAUTION",
        message: `${input.metrics.trustReceiptsGenerated} receipts and ${input.metrics.pilotWorkspaces} pilot workspaces observed.`,
      },
    ]),
    section("API Readiness", "Core API and provider readiness without overclaiming optional integrations.", [
      {
        label: "API checks",
        state: input.runtime.checks.some((check) => check.category.includes("Enterprise") && check.state === "FAIL")
          ? "BLOCKED"
          : "READY",
        message: "Enterprise access, protected routes and workflow APIs are included in runtime validation.",
      },
    ]),
    section("Auth Readiness", "Supabase auth and session route readiness.", [
      {
        label: "Auth checks",
        state: input.runtime.checks.some((check) => check.category === "Auth System" && check.state === "FAIL")
          ? "BLOCKED"
          : "READY",
        message: "Auth callback, Supabase auth settings and stale-session route are validated.",
      },
    ]),
    section("Pilot Readiness", "Design-partner onboarding and operational pilot signals.", [
      {
        label: "Onboarding completion",
        state: input.metrics.onboardingCompletion >= 80 ? "READY" : "CAUTION",
        message: `${input.metrics.onboardingCompletion}% pilot workflow completion from observed operational records.`,
      },
      {
        label: "Pilot access control",
        state: input.metrics.pilotStateCounts.suspended > 0 ? "CAUTION" : "READY",
        message: `${input.metrics.pilotStateCounts.active} active, ${input.metrics.pilotStateCounts.invited} invited, ${input.metrics.pilotStateCounts.internal} internal and ${input.metrics.pilotStateCounts.suspended} suspended pilot workspaces observed.`,
      },
      {
        label: "Unresolved escalations",
        state: input.metrics.unresolvedEscalations > 0 ? "CAUTION" : "READY",
        message: `${input.metrics.unresolvedEscalations} unresolved escalations currently visible.`,
      },
    ]),
  ];
  const readinessPercent = Math.round(
    (sections.reduce((sum, item) => sum + stateWeight(item.state), 0) / sections.length) * 100
  );
  const blockers = sections
    .flatMap((item) => item.checks.map((check) => ({ ...check, category: item.category })))
    .filter((check) => check.state === "BLOCKED")
    .map((check) => `${check.category}: ${check.label}`);
  const warnings = sections
    .flatMap((item) => item.checks.map((check) => ({ ...check, category: item.category })))
    .filter((check) => check.state === "CAUTION")
    .map((check) => `${check.category}: ${check.label}`);

  return {
    generatedAt: new Date().toISOString(),
    state: blockers.length ? "BLOCKED" : warnings.length ? "CAUTION" : "READY",
    readinessPercent,
    blockers,
    warnings,
    metrics: input.metrics,
    sections,
  };
}
