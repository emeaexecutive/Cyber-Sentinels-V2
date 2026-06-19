export type AnyOperationalRow = Record<string, any>;

export function intelligenceSeverityClass(severity?: string | null) {
  const normalized = String(severity ?? "info").toLowerCase();

  if (["critical", "high", "blocked"].includes(normalized)) {
    return "border-red-800 text-red-200";
  }

  if (["review", "warning", "medium", "caution"].includes(normalized)) {
    return "border-amber-800 text-amber-200";
  }

  if (["resolved", "low", "ready"].includes(normalized)) {
    return "border-emerald-800 text-emerald-200";
  }

  return "border-cyan-800 text-cyan-200";
}

export function formatIntelligenceDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function intelligenceLabel(value: unknown, fallback = "Operational event") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function ageDays(row: AnyOperationalRow) {
  const created = row.created_at ? new Date(String(row.created_at)).getTime() : Date.now();
  if (Number.isNaN(created)) return 0;
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
}

export function buildOperationalHealth(input: {
  cases?: AnyOperationalRow[] | null;
  governanceActions?: AnyOperationalRow[] | null;
  evidence?: AnyOperationalRow[] | null;
  signals?: AnyOperationalRow[] | null;
  intelligenceEvents?: AnyOperationalRow[] | null;
}) {
  const cases = input.cases ?? [];
  const governanceActions = input.governanceActions ?? [];
  const evidence = input.evidence ?? [];
  const signals = input.signals ?? [];
  const intelligenceEvents = input.intelligenceEvents ?? [];

  const activeCases = cases.filter((item) =>
    ["open", "in_review", "escalated"].includes(String(item.status ?? "open").toLowerCase())
  );
  const pendingGovernance = governanceActions.filter((item) =>
    ["pending", "in_review", "escalated"].includes(String(item.action_status ?? "pending").toLowerCase())
  );
  const escalations = [
    ...activeCases.filter((item) => String(item.status ?? "").toLowerCase() === "escalated"),
    ...pendingGovernance.filter((item) => String(item.action_status ?? "").toLowerCase() === "escalated"),
  ];
  const missingEvidence = evidence.filter((item) =>
    /missing|pending|review|required/i.test(String(item.status ?? item.scan_status ?? item.event ?? ""))
  );
  const unresolvedSignals = signals.filter((item) =>
    /risk|review|escalat|anomaly|suspicious/i.test(String(item.event ?? item.event_type ?? ""))
  );
  const stalledWorkflows = activeCases.filter((item) => ageDays(item) >= 7);
  const reviewEvents = intelligenceEvents.filter((item) => item.requires_review);

  const blocked =
    escalations.length > 0 ||
    pendingGovernance.some((item) => ageDays(item) >= 5) ||
    reviewEvents.some((item) => ["critical", "high"].includes(String(item.severity ?? "").toLowerCase()));

  const status = blocked
    ? "Needs Review"
    : pendingGovernance.length || missingEvidence.length || stalledWorkflows.length
      ? "Caution"
      : "Stable";

  return {
    status,
    unresolvedRisks: unresolvedSignals.length + reviewEvents.length,
    activeEscalations: escalations.length,
    pendingGovernance: pendingGovernance.length,
    missingEvidence: missingEvidence.length,
    stalledWorkflows: stalledWorkflows.length,
    workflowHealth:
      status === "Stable"
        ? "No major operational blockers are visible."
        : "Some workflows need human review, evidence follow-up or governance resolution.",
  };
}

export function buildTrustTrendSummaries(input: {
  cases?: AnyOperationalRow[] | null;
  governanceActions?: AnyOperationalRow[] | null;
  timeline?: AnyOperationalRow[] | null;
  intelligenceEvents?: AnyOperationalRow[] | null;
}) {
  const cases = input.cases ?? [];
  const governanceActions = input.governanceActions ?? [];
  const timeline = input.timeline ?? [];
  const intelligenceEvents = input.intelligenceEvents ?? [];

  return [
    {
      title: "Review Status",
      summary:
        cases.length > 0
          ? `${cases.length} verification case${cases.length === 1 ? "" : "s"} are visible across operational workspaces.`
          : "No verification cases are visible yet.",
    },
    {
      title: "Governance Load",
      summary:
        governanceActions.length > 0
          ? `${governanceActions.length} governance action${governanceActions.length === 1 ? "" : "s"} are available for review history and queue health.`
          : "No governance action history is visible yet.",
    },
    {
      title: "Audit Trail Activity",
      summary:
        timeline.length > 0
          ? `${timeline.length} recent timeline event${timeline.length === 1 ? "" : "s"} preserve the audit trail.`
          : "Timeline activity will appear as workflows record evidence, decisions and intelligence events.",
    },
    {
      title: "Intelligence Context",
      summary:
        intelligenceEvents.length > 0
          ? `${intelligenceEvents.length} intelligence event${intelligenceEvents.length === 1 ? "" : "s"} explain unresolved risks, bottlenecks or review needs.`
          : "No operational intelligence events have been recorded yet.",
    },
  ];
}

export function workspaceBottlenecks(input: {
  cases?: AnyOperationalRow[] | null;
  governanceActions?: AnyOperationalRow[] | null;
  intelligenceEvents?: AnyOperationalRow[] | null;
}) {
  const cases = input.cases ?? [];
  const governanceActions = input.governanceActions ?? [];
  const intelligenceEvents = input.intelligenceEvents ?? [];

  return [
    {
      label: "Overdue reviews",
      value: governanceActions.filter((item) => ageDays(item) >= 3).length,
      detail: "Governance actions open for three or more days.",
    },
    {
      label: "Escalation clusters",
      value:
        cases.filter((item) => String(item.status ?? "").toLowerCase() === "escalated").length +
        intelligenceEvents.filter((item) => String(item.event_type ?? "").includes("escalation")).length,
      detail: "Escalated cases and intelligence events requiring human review.",
    },
    {
      label: "Stalled workflows",
      value: cases.filter((item) => ageDays(item) >= 7).length,
      detail: "Open or in-review cases older than seven days.",
    },
  ];
}
