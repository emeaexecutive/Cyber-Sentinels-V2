export type GovernancePolicyRow = {
  id: string;
  workspace_id: string | null;
  name: string | null;
  description: string | null;
  trigger_type: string | null;
  severity: string | null;
  action_type: string | null;
  requires_human_review: boolean | null;
  created_at: string | null;
};

export type GovernanceActionRow = {
  id: string;
  policy_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  action_status: string | null;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string | null;
};

export type GovernanceQueueItem = GovernanceActionRow & {
  policy?: GovernancePolicyRow | null;
  explanation: string;
};

export const governanceStatuses = [
  "pending",
  "in_review",
  "escalated",
  "approved",
  "rejected",
  "resolved",
];

export function governanceStatusClass(status: string | null | undefined) {
  const normalized = String(status ?? "pending");
  if (["approved", "resolved"].includes(normalized)) return "border-emerald-800 text-emerald-200";
  if (["rejected", "escalated"].includes(normalized)) return "border-red-800 text-red-200";
  if (normalized === "in_review") return "border-amber-800 text-amber-200";
  return "border-cyan-800 text-cyan-200";
}

export function governanceSeverityClass(severity: string | null | undefined) {
  const normalized = String(severity ?? "medium");
  if (["high", "critical"].includes(normalized)) return "border-red-800 text-red-200";
  if (normalized === "medium") return "border-amber-800 text-amber-200";
  return "border-cyan-800 text-cyan-200";
}

export function formatGovernanceDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function buildGovernanceQueue(
  actions: GovernanceActionRow[],
  policies: GovernancePolicyRow[]
) {
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));

  return actions.map((action) => {
    const policy = action.policy_id ? policyById.get(action.policy_id) ?? null : null;
    return {
      ...action,
      policy,
      explanation:
        action.resolution_notes ||
        policy?.description ||
        "Governance action requires human review before operational decisioning.",
    };
  });
}

export function governanceMetrics(actions: GovernanceActionRow[]) {
  const terminal = actions.filter((action) =>
    ["approved", "rejected", "resolved"].includes(String(action.action_status))
  ).length;

  return {
    pending: actions.filter((action) => action.action_status === "pending").length,
    escalated: actions.filter((action) => action.action_status === "escalated").length,
    unresolvedRisks: actions.filter((action) =>
      ["pending", "in_review", "escalated"].includes(String(action.action_status ?? "pending"))
    ).length,
    completionRate: actions.length ? Math.round((terminal / actions.length) * 100) : 0,
  };
}

export function subjectHref(action: GovernanceActionRow) {
  if (action.subject_type === "interview_session" && action.subject_id) {
    return `/trust/session/${encodeURIComponent(action.subject_id)}`;
  }

  if (action.subject_type === "candidate") {
    return "/verify/candidate";
  }

  if (action.subject_type === "recruiter") {
    return "/verify/recruiter";
  }

  if (action.subject_type === "passport" && action.subject_id) {
    return `/passports/${encodeURIComponent(action.subject_id)}`;
  }

  if (action.subject_type === "agent" && action.subject_id) {
    return `/agents/${encodeURIComponent(action.subject_id)}`;
  }

  if (action.subject_type === "trust_case" && action.subject_id) {
    return `/workspace`;
  }

  return "/timeline";
}
