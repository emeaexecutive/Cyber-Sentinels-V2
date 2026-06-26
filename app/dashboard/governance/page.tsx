import Link from "next/link";
import { redirect } from "next/navigation";
import { GovernanceOverview } from "@/components/governance-overview";
import { OnboardingHint } from "@/components/onboarding-walkthrough";
import { ProviderEvidencePanel } from "@/components/provider-evidence-panel";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { buildWorkflowProviderSignals, getVerificationProviderRegistry } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";
import {
  buildGovernanceQueue,
  formatGovernanceDate,
  governanceMetrics,
  governanceSeverityClass,
  governanceStatusClass,
  governanceStatuses,
  subjectHref,
  type GovernanceActionRow,
  type GovernancePolicyRow,
} from "@/lib/operational-governance/governance";
import { buildTrustPosture, trustPostureClass } from "@/lib/trust-posture/posture";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function createPolicy(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/governance");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const triggerType = String(formData.get("trigger_type") ?? "").trim();
  const severity = String(formData.get("severity") ?? "medium").trim();
  const actionType = String(formData.get("action_type") ?? "human_review_required").trim();
  const workspaceId = String(formData.get("workspace_id") ?? "").trim() || null;

  if (!name || !triggerType) redirect("/dashboard/governance?policy_error=missing_fields");

  await supabase.from("governance_policies").insert({
    workspace_id: workspaceId,
    name,
    description,
    trigger_type: triggerType,
    severity,
    action_type: actionType,
    requires_human_review: true,
  });

  redirect("/dashboard/governance");
}

async function updateAction(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/governance");

  const actionId = String(formData.get("action_id") ?? "").trim();
  const status = String(formData.get("action_status") ?? "in_review").trim();
  const note = String(formData.get("resolution_notes") ?? "").trim();
  const assignedTo = String(formData.get("assigned_to") ?? "").trim();

  if (!actionId || !governanceStatuses.includes(status)) {
    redirect("/dashboard/governance?action_error=invalid_status");
  }

  await supabase
    .from("governance_actions")
    .update({
      action_status: status,
      assigned_to: uuidPattern.test(assignedTo) ? assignedTo : user.id,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      escalation_chain:
        status === "escalated"
          ? [
              {
                actor_id: user.id,
                status,
                note: note || "Governance action escalated by human reviewer.",
                at: new Date().toISOString(),
              },
            ]
          : undefined,
      resolution_notes: note || `Human reviewer set status to ${status}.`,
      resolved_at: ["approved", "rejected", "resolved"].includes(status)
        ? new Date().toISOString()
        : null,
    })
    .eq("id", actionId);

  redirect("/dashboard/governance");
}

async function fetchRows<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 120
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  return error ? [] : data ?? [];
}

function objectMetadata(row: AnyRow) {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? (row.metadata as Record<string, any>)
    : {};
}

function reviewerLabel(value?: string | null) {
  return value ? `Reviewer ${value.slice(0, 8)}` : "Unassigned";
}

function escalationSummary(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "No escalation chain recorded.";
  return `${value.length} escalation step${value.length === 1 ? "" : "s"} recorded.`;
}

function ReviewSignal({ row }: { row: AnyRow }) {
  const metadata = objectMetadata(row);
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <p className="font-medium text-zinc-100">
        {String(row.event ?? row.event_type ?? "Review item")}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {String(metadata.explanation ?? metadata.reason ?? "Operational item may require governance review.")}
      </p>
      <p className="mt-3 text-xs text-zinc-600">{formatGovernanceDate(row.created_at)}</p>
    </div>
  );
}

export default async function GovernancePage({
  searchParams,
}: {
  searchParams?: Promise<{ policy_error?: string; action_error?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/governance");

  const [{ data: memberships }, { data: workspaces }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id,role")
      .eq("user_id", user.id)
      .in("role", ["admin", "reviewer"]),
    supabase
      .from("trust_workspaces")
      .select("id,name,created_by")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);
  const isAdmin = isAdminAllowlisted(user.email);
  const reviewerWorkspaceIds = new Set((memberships ?? []).map((item) => String(item.workspace_id)));
  const ownedWorkspaceIds = new Set(
    (workspaces ?? []).filter((item) => item.created_by === user.id).map((item) => String(item.id))
  );
  const canReview = isAdmin || reviewerWorkspaceIds.size > 0 || ownedWorkspaceIds.size > 0;

  if (!canReview) {
    return (
      <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Governance
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Reviewer access required</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Governance actions are available to workspace reviewers and admins.
            Human governance remains authoritative.
          </p>
          <Link href="/workspace" className="mt-5 inline-flex text-sm text-cyan-200">
            Open Workspace
          </Link>
        </div>
      </main>
    );
  }

  const [
    policies,
    actions,
    signals,
    evidence,
    auditLogs,
    workspaceMembers,
    trustCertifications,
    trustAlerts,
    aiAgents,
    provenanceEvents,
  ] = await Promise.all([
    fetchRows<GovernancePolicyRow>(supabase, "governance_policies", 160),
    fetchRows<GovernanceActionRow>(supabase, "governance_actions", 200),
    fetchRows<AnyRow>(supabase, "signals", 100),
    fetchRows<AnyRow>(supabase, "evidence_files", 100),
    fetchRows<AnyRow>(supabase, "audit_logs", 100),
    fetchRows<AnyRow>(supabase, "workspace_members", 200),
    fetchRows<AnyRow>(supabase, "trust_certifications", 200),
    fetchRows<AnyRow>(supabase, "trust_alerts", 200),
    fetchRows<AnyRow>(supabase, "ai_agents", 200),
    fetchRows<AnyRow>(supabase, "provenance_events", 200),
  ]);
  const queue = buildGovernanceQueue(actions, policies);
  const metrics = governanceMetrics(actions);
  const unresolvedSignals = signals
    .filter((row) => /risk|review|escalat|anomaly/i.test(String(row.event ?? "")))
    .slice(0, 6);
  const missingEvidence = evidence
    .filter((row) => /pending|missing|review/i.test(String(row.status ?? row.scan_status ?? "")))
    .slice(0, 6);
  const aiRecommendations = auditLogs
    .filter((row) =>
      ["governance_recommendation_created", "anomaly_review_recommended"].includes(
        String(row.event_type ?? "")
      )
    )
    .slice(0, 6);
  const postureItems = queue.map((action) => ({
    action,
    posture: buildTrustPosture({
      lastVerifiedAt: action.resolved_at,
      lastGovernanceAt: action.created_at,
      evidenceCount: evidence.filter((row) => String(row.id ?? "").includes(String(action.subject_id ?? ""))).length,
      signalCount: signals.filter((row) => String(row.subject_id ?? "") === String(action.subject_id ?? "")).length,
      unresolvedGovernanceCount: ["pending", "in_review", "escalated"].includes(String(action.action_status ?? "pending")) ? 1 : 0,
      confidenceLabel: action.action_status ?? "pending",
    }),
  }));
  const reverificationDueCount = postureItems.filter((item) => item.posture.reverificationRecommended).length;
  const providerRegistry = getVerificationProviderRegistry();
  const providerSignals = buildWorkflowProviderSignals({
    providerVerificationState: providerRegistry.some((provider) => provider.status === "configured")
      ? "pending"
      : "none",
    identityConfidence: providerRegistry.some((provider) => provider.status === "configured") ? 64 : 50,
    sessionIntegrity: unresolvedSignals.length ? 55 : 66,
    riskFlags: unresolvedSignals.length ? ["high_risk_context"] : [],
    evidenceReferences: [
      "Governance review",
      "Verification evidence",
      "Replay chronology",
      "Workflow outcome",
    ],
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          {[
            ["/workspace", "Workspace"],
            ["/verification-queue", "Verification Queue"],
            ["/timeline", "Timeline"],
            ["/trust-replay", "Replay"],
            ["/back-office", "Back Office"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Operational Trust Infrastructure
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Governance visibility for trust coordination.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Governance Review keeps trust state changes, Verification Evidence, reviewer actions and workflow status visible before operational decisions advance.
          </p>
          <div className="mt-5 max-w-3xl">
            <OnboardingHint area="governance" />
          </div>
        </section>

        {query.policy_error || query.action_error ? (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">
            Governance action could not be completed. Check required fields and status values.
          </div>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Traditional cybersecurity tools protect</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Networks, devices and communications.
            </p>
          </article>
          <article className="rounded-lg border border-cyan-900 bg-black p-5">
            <h2 className="text-xl font-semibold">Cyber Sentinels protects</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Operational trust, workflow integrity, session authenticity, identity accountability and verification evidence.
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            ["Pending Reviews", metrics.pending],
            ["Escalated", metrics.escalated],
            ["Unresolved Risks", metrics.unresolvedRisks],
            ["Completion Rate", `${metrics.completionRate}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <GovernanceOverview
          certifications={trustCertifications}
          alerts={trustAlerts}
          agents={aiAgents}
          provenanceEvents={provenanceEvents}
          auditEvents={auditLogs}
        />

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Reverification Posture</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Governance review can trigger revalidation when confidence is
                aging, verification evidence is incomplete, or an action remains
                unresolved. These checkpoints explain why review is recommended
                without adding background tracking.
              </p>
            </div>
            <span className="rounded-full border border-amber-800 px-3 py-1 text-xs text-amber-200">
              {reverificationDueCount} review prompt{reverificationDueCount === 1 ? "" : "s"}
            </span>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Workflow continuity map</p>
          <h2 className="mt-2 text-xl font-semibold">Governance actions change workflow trust state</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            A governance review is not an isolated task. Reviewer action updates workflow state,
            informs receipt outcome, and becomes part of replay chronology alongside session integrity and verification evidence.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ["Session integrity", `${signals.length} signal(s)`, "/dashboard/session-integrity"],
              ["Operational evidence", `${evidence.length} evidence record(s)`, "/evidence-vault"],
              ["Governance review", `${queue.length} queue item(s)`, "/dashboard/governance"],
              ["Replay chronology", "Open replay explorer", "/trust-replay"],
              ["Verification receipts", "Open receipt index", "/verification-receipts"],
            ].map(([title, value, href]) => (
              <Link key={title} href={href} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-700">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{title}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <ProviderEvidencePanel
            signals={providerSignals}
            title="Provider signals for governance review"
            description="Provider outputs are normalized into reviewable trust signals. They can influence trust scores and escalation recommendations, but human governance determines the workflow outcome."
          />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Governance Queue</h2>
            <div className="mt-5 grid gap-3">
              {queue.length ? (
                queue.map((action) => {
                  const posture = postureItems.find((item) => item.action.id === action.id)?.posture;
                  return (
                  <article key={action.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                          {action.policy?.trigger_type ?? "governance_trigger"}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-zinc-100">
                          {action.policy?.name ?? "Governance action"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${governanceStatusClass(action.action_status)}`}>
                          {action.action_status ?? "pending"}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${governanceSeverityClass(action.policy?.severity)}`}>
                          {action.policy?.severity ?? "medium"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{action.explanation}</p>
                    {posture ? (
                      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                            Trust freshness
                          </p>
                          <span className={`rounded-full border px-2.5 py-1 text-xs ${trustPostureClass(posture.state)}`}>
                            {posture.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          {posture.explanation}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {posture.nextReview}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Why triggered</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          {action.policy?.trigger_type ?? "Operational review threshold reached."}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Who reviewed</p>
                        <p className="mt-2 text-sm text-zinc-300">{reviewerLabel(action.assigned_to)}</p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Current state</p>
                        <p className="mt-2 text-sm text-zinc-300">{action.action_status ?? "pending"}</p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Supporting evidence</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          {String((action as AnyRow).evidence_summary ?? objectMetadata(action as AnyRow).evidence_summary ?? "Review linked record and evidence vault.")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Escalation chain</p>
                        <p className="mt-2 text-sm text-zinc-300">{escalationSummary((action as AnyRow).escalation_chain)}</p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Next step</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          {action.action_status === "escalated"
                            ? "Additional operational review required."
                            : "Approve, reject, defer or request evidence after human review."}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
                      <p>Subject: {action.subject_type ?? "workflow"}</p>
                      <p>Policy: {action.policy?.action_type ?? "human_review_required"}</p>
                      <p>Created: {formatGovernanceDate(action.created_at)}</p>
                    </div>
                    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Continuity effect</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        This governance action affects workflow trust state, appears in replay chronology,
                        and should be checked before issuing or sharing a verification receipt.
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={subjectHref(action)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white">
                        Related Record
                      </Link>
                      <Link href={`/replay/${action.subject_id}`} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white">
                        Replay Chronology
                      </Link>
                      {action.subject_type === "interview_session" ? (
                        <Link href={`/trust/session/${action.subject_id}`} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white">
                          Session Integrity
                        </Link>
                      ) : null}
                      <form action={updateAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="action_id" value={action.id} />
                        <input type="hidden" name="action_status" value={action.action_status ?? "pending"} />
                        <input
                          type="hidden"
                          name="resolution_notes"
                          value="Human reviewer assignment updated for operational coordination."
                        />
                        <select
                          name="assigned_to"
                          defaultValue={action.assigned_to ?? user.id}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                        >
                          <option value={user.id}>Assign to me</option>
                          {workspaceMembers
                            .filter((member) => ["admin", "reviewer"].includes(String(member.role ?? "")))
                            .map((member) => (
                              <option key={String(member.id)} value={String(member.user_id)}>
                                {String(member.role ?? "reviewer")} {String(member.user_id).slice(0, 8)}
                              </option>
                            ))}
                        </select>
                        <button className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white">
                          Assign Reviewer
                        </button>
                      </form>
                      {["approved", "rejected", "escalated", "in_review", "resolved"].map((status) => (
                        <form key={status} action={updateAction}>
                          <input type="hidden" name="action_id" value={action.id} />
                          <input type="hidden" name="action_status" value={status} />
                          <input type="hidden" name="assigned_to" value={action.assigned_to ?? user.id} />
                          <input
                            type="hidden"
                            name="resolution_notes"
                            value={
                              status === "in_review"
                                ? "More evidence requested or review deferred by human reviewer."
                                : `Human reviewer marked governance action ${status}.`
                            }
                          />
                          <button className={`rounded-lg border px-3 py-2 text-sm ${governanceStatusClass(status)}`}>
                            {status === "in_review" ? "Request More Evidence / Defer" : status}
                          </button>
                        </form>
                      ))}
                    </div>
                  </article>
                  );
                })
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No governance actions are waiting for review.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Create Policy</h2>
            <form action={createPolicy} className="mt-5 grid gap-4">
              <select name="workspace_id" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                <option value="">Global governance policy</option>
                {(workspaces ?? []).map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name ?? workspace.id}
                  </option>
                ))}
              </select>
              <input name="name" placeholder="Policy name" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
              <textarea name="description" placeholder="Why this policy exists" className="min-h-24 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
              <input name="trigger_type" placeholder="trigger_type, e.g. high_risk_signal_review" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
              <div className="grid gap-3 md:grid-cols-2">
                <select name="severity" defaultValue="medium" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                  {["low", "medium", "high", "critical"].map((severity) => (
                    <option key={severity} value={severity}>{severity}</option>
                  ))}
                </select>
                <input name="action_type" defaultValue="human_review_required" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
              </div>
              <button className="w-fit rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
                Create Policy
              </button>
            </form>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Unresolved Signals</h2>
            <div className="mt-5 grid gap-3">
              {unresolvedSignals.length ? unresolvedSignals.map((row) => <ReviewSignal key={String(row.id)} row={row} />) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No unresolved signal patterns are visible.</p>
              )}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Evidence Workflows</h2>
            <div className="mt-5 grid gap-3">
              {missingEvidence.length ? missingEvidence.map((row) => <ReviewSignal key={String(row.id)} row={row} />) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No verification evidence workflows are visible.</p>
              )}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Review Recommendations</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Summaries and escalation suggestions support governance review. Humans decide.
            </p>
            <div className="mt-5 grid gap-3">
              {aiRecommendations.length ? aiRecommendations.map((row) => <ReviewSignal key={String(row.id)} row={row} />) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No AI-assisted recommendations require review.</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
