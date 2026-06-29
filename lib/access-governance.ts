import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { buildWorkflowProviderSignals } from "@/lib/providers";
import { loadTrustPostureDashboard } from "@/lib/trust-posture/dashboard";
import { buildTrustTransparencyReport } from "@/lib/trust-transparency";

type Row = Record<string, any>;
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type WorkflowAccessState =
  | "authorized_with_oversight"
  | "governance_review_required"
  | "elevated_verification_required"
  | "authorization_not_recorded";

export const ACCESS_GOVERNANCE_BOUNDARY = {
  method: "rules_provider_and_governance_evidence",
  humanReviewRemainsAuthoritative: true,
  autonomousPunitiveDecision: false,
  biometricCertainty: false,
  surveillance: false,
} as const;

async function rows(supabase: SupabaseClient, table: string, limit = 100) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  return error ? [] : data ?? [];
}

function accessState(badge: string, hasApproval: boolean): WorkflowAccessState {
  if (badge === "governance_review" || badge === "elevated_risk") {
    return "governance_review_required";
  }
  if (badge === "reverification_due" || badge === "context_shift") {
    return "elevated_verification_required";
  }
  return hasApproval ? "authorized_with_oversight" : "authorization_not_recorded";
}

export async function loadAccessGovernanceOverview(supabase: SupabaseClient) {
  const [snapshot, governance, replay, receipts, timeline, sessions] =
    await Promise.all([
      loadTrustPostureDashboard(supabase),
      rows(supabase, "governance_actions", 160),
      rows(supabase, "trust_replay_sessions", 120),
      rows(supabase, "verification_receipts", 120),
      rows(supabase, "trust_timeline_events", 200),
      rows(supabase, "session_integrity_checks", 120),
    ]);

  const providerSignals = receipts.flatMap((receipt) =>
    buildWorkflowProviderSignals({
      evidenceSnapshot: receipt.evidence_snapshot ?? {},
      providerVerificationState: receipt.verification_status,
    }).filter((signal) => signal.providerVerificationState !== "none")
  );
  const authorizationEvents = timeline.filter((event) =>
    /authoriz|access|approval|delegat/.test(
      `${event.event_type ?? ""} ${event.event_title ?? ""}`.toLowerCase()
    )
  );
  const approvalsBySubject = new Map<string, Row[]>();
  governance.forEach((action) => {
    const key = String(action.subject_id ?? "");
    approvalsBySubject.set(key, [...(approvalsBySubject.get(key) ?? []), action]);
  });
  const replaySubjects = new Set(replay.map((item) => String(item.subject_id)));

  const workflows = snapshot.summaries.map((workflow) => {
    const approvals = approvalsBySubject.get(workflow.id) ?? [];
    const approved = approvals.some((action) =>
      ["approved", "resolved"].includes(String(action.action_status))
    );
    return {
      ...workflow,
      accessState: accessState(workflow.badge, approved),
      latestApproval: approvals[0] ?? null,
      replayLinked: replaySubjects.has(workflow.id),
      explanation:
        workflow.badge === "governance_review"
          ? "Open governance review prevents an unqualified authorization decision."
          : workflow.badge === "elevated_risk"
            ? "Elevated workflow evidence requires named human review."
            : workflow.badge === "reverification_due"
              ? "Trust evidence is stale; elevated verification is required before reliance."
              : approved
                ? "Recorded governance approval supports conditional access with ongoing oversight."
                : "No explicit approval record is visible; authorization should not be inferred.",
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    posture: snapshot.posture,
    badge: snapshot.badge,
    metrics: {
      workflows: workflows.length,
      governanceEscalations: snapshot.metrics.governanceReviews,
      sessionIntegrityEvents: sessions.length,
      replayLinked: workflows.filter((item) => item.replayLinked).length,
      providerSignals: providerSignals.length,
      authorizationEvents: authorizationEvents.length,
    },
    workflows,
    authorizationEvents,
    governance,
    replay,
    providerSignals,
    boundary: ACCESS_GOVERNANCE_BOUNDARY,
  };
}

export type AccessGovernanceOverview = Awaited<
  ReturnType<typeof loadAccessGovernanceOverview>
>;

export function buildWorkflowAccessDecision(trust: Awaited<ReturnType<
  typeof import("@/lib/operational-trust/api").loadWorkflowTrust
>>) {
  const report = buildTrustTransparencyReport(trust);
  const openGovernance = trust.governanceLineage.filter((action: Row) =>
    ["pending", "in_review", "escalated"].includes(String(action.action_status))
  );
  const approved = trust.governanceLineage.some((action: Row) =>
    ["approved", "resolved"].includes(String(action.action_status))
  );
  const postureState = String(trust.posture.state ?? "");
  const state: WorkflowAccessState = openGovernance.length
    ? "governance_review_required"
    : /stale|reverification|degrad/.test(postureState)
      ? "elevated_verification_required"
      : approved
        ? "authorized_with_oversight"
        : "authorization_not_recorded";

  return {
    workflow: trust.workflow,
    accessState: state,
    trustPosture: trust.posture,
    explanation: {
      whatChanged: report.decisionExplanation.whatChanged,
      whyAccessChanged:
        openGovernance.length
          ? `${openGovernance.length} governance action(s) remain open. Human approval is required before access reliance.`
          : approved
            ? "A recorded governance resolution supports conditional access with continuing oversight."
            : "No explicit governance approval is recorded, so access is not inferred.",
      evidenceContributed: report.decisionExplanation.evidenceContributed,
      providerSignals: report.decisionExplanation.providerSignals,
      policyOrEscalation: report.auditability.escalationPath,
    },
    authorizationLineage: report.auditability.authorizationLineage,
    governanceHistory: report.decisionExplanation.governanceActions,
    replayReference: report.auditability.replayReference,
    replayLinked: Boolean(report.auditability.replayReference),
    boundary: ACCESS_GOVERNANCE_BOUNDARY,
  };
}
