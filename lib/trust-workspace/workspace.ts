export type WorkspaceRow = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string | null;
};

export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  role: string | null;
  created_at: string | null;
};

export type TrustCaseRow = {
  id: string;
  workspace_id: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string | null;
};

export type CaseRelationshipRow = {
  id: string;
  case_id: string | null;
  target_type: string | null;
  target_id: string | null;
  relationship_type: string | null;
  explanation: string | null;
  created_by: string | null;
  created_at: string | null;
};

export type ReviewQueueItem = {
  id: string;
  title: string;
  reason: string;
  severity: "info" | "review" | "escalated";
  href: string;
};

export const caseStatuses = ["open", "in_review", "escalated", "approved", "rejected", "closed"];
export const casePriorities = ["low", "medium", "high", "urgent"];
export const workspaceRoles = ["admin", "reviewer", "observer"];

export function slugifyWorkspaceName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || `workspace-${Date.now()}`;
}

export function statusClass(status: string | null | undefined) {
  const normalized = String(status ?? "open");
  if (["approved", "closed"].includes(normalized)) return "border-emerald-800 text-emerald-200";
  if (["rejected", "escalated", "urgent"].includes(normalized)) return "border-red-800 text-red-200";
  if (["in_review", "high"].includes(normalized)) return "border-amber-800 text-amber-200";
  return "border-cyan-800 text-cyan-200";
}

export function formatWorkspaceDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function workspaceMetrics(cases: TrustCaseRow[], members: WorkspaceMemberRow[]) {
  return {
    activeCases: cases.filter((item) => !["approved", "rejected", "closed"].includes(String(item.status))).length,
    escalations: cases.filter((item) => item.status === "escalated" || item.priority === "urgent").length,
    inReview: cases.filter((item) => item.status === "in_review").length,
    members: members.length,
  };
}

export function buildReviewQueue(input: {
  cases: TrustCaseRow[];
  signals?: Array<Record<string, any>> | null;
  evidence?: Array<Record<string, any>> | null;
}) {
  const items: ReviewQueueItem[] = [];

  for (const item of input.cases) {
    if (["open", "in_review", "escalated"].includes(String(item.status ?? "open"))) {
      items.push({
        id: `case-${item.id}`,
        title: item.title ?? "Trust case",
        reason: `Case is ${item.status ?? "open"} with ${item.priority ?? "medium"} priority.`,
        severity: item.status === "escalated" || item.priority === "urgent" ? "escalated" : "review",
        href: `/workspace/${item.workspace_id}`,
      });
    }
  }

  for (const evidence of input.evidence ?? []) {
    const status = String(evidence.status ?? evidence.scan_status ?? "").toLowerCase();
    if (status.includes("pending") || status.includes("review")) {
      items.push({
        id: `evidence-${evidence.id}`,
        title: String(evidence.file_name ?? "Evidence pending review"),
        reason: "Evidence is pending review or has incomplete review state.",
        severity: "review",
        href: "/evidence-vault",
      });
    }
  }

  for (const signal of input.signals ?? []) {
    const label = String(signal.event ?? "").toLowerCase();
    if (label.includes("risk") || label.includes("review") || label.includes("escalat")) {
      items.push({
        id: `signal-${signal.id}`,
        title: String(signal.event ?? "Signal requires review"),
        reason: "Signal may require governance review.",
        severity: label.includes("escalat") || label.includes("high") ? "escalated" : "review",
        href: "/signals",
      });
    }
  }

  return items.slice(0, 12);
}
