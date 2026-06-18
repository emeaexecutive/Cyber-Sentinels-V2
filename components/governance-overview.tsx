import {
  mockAiAgents,
  mockProvenanceEvents,
  mockTrustAlerts,
  mockTrustCertifications,
  type EnterpriseTrustRow,
} from "@/lib/enterprise-governance/mock-data";

type GovernanceOverviewProps = {
  certifications: EnterpriseTrustRow[];
  alerts: EnterpriseTrustRow[];
  agents: EnterpriseTrustRow[];
  provenanceEvents: EnterpriseTrustRow[];
  auditEvents: EnterpriseTrustRow[];
};

function rowsOrMock(rows: EnterpriseTrustRow[], mockRows: EnterpriseTrustRow[]) {
  return rows.length || process.env.NODE_ENV === "production" ? rows : mockRows;
}

function label(value: unknown, fallback = "unknown") {
  return String(value ?? fallback).replace(/_/g, " ");
}

function asArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" && value.trim()) return value.split(",").map((item) => item.trim());
  return [];
}

function statusClass(value: unknown) {
  const normalized = String(value ?? "").toLowerCase();
  if (["verified", "resolved", "low"].includes(normalized)) return "border-emerald-800 text-emerald-200";
  if (["failed", "revoked", "critical", "high", "active"].includes(normalized)) return "border-red-900 text-red-200";
  if (["pending", "in_review", "medium"].includes(normalized)) return "border-amber-800 text-amber-200";
  return "border-zinc-700 text-zinc-300";
}

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function certificationCount(rows: EnterpriseTrustRow[], type: string, status?: string) {
  return rows.filter((row) => {
    const typeMatches = row.certification_type === type;
    const statusMatches = status ? row.status === status : true;
    return typeMatches && statusMatches;
  }).length;
}

function activeAlert(row: EnterpriseTrustRow) {
  return ["active", "in_review"].includes(String(row.status ?? "active").toLowerCase());
}

function TrendBars({ alerts }: { alerts: EnterpriseTrustRow[] }) {
  const items = [
    ["Drift", alerts.filter((row) => row.alert_type === "behavioural_drift").length],
    ["Failures", alerts.filter((row) => row.alert_type === "verification_failure").length],
    ["Access", alerts.filter((row) => row.alert_type === "ai_agent_permission_escalation").length],
    ["Workflow", alerts.filter((row) => row.alert_type === "workflow_anomaly").length],
    ["Identity", alerts.filter((row) => row.alert_type === "synthetic_identity_flag").length],
  ];
  const max = Math.max(1, ...items.map(([, value]) => Number(value)));

  return (
    <div className="mt-4 grid gap-3">
      {items.map(([name, value]) => (
        <div key={String(name)}>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{name}</span>
            <span>{value}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-zinc-900">
            <div
              className="h-2 rounded-full bg-cyan-300"
              style={{ width: `${Math.max(8, (Number(value) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GovernanceOverview({
  certifications,
  alerts,
  agents,
  provenanceEvents,
  auditEvents,
}: GovernanceOverviewProps) {
  const certificationRows = rowsOrMock(certifications, mockTrustCertifications);
  const alertRows = rowsOrMock(alerts, mockTrustAlerts);
  const agentRows = rowsOrMock(agents, mockAiAgents);
  const provenanceRows = rowsOrMock(provenanceEvents, mockProvenanceEvents);
  const activeAlerts = alertRows.filter(activeAlert);
  const failedCertifications = certificationRows.filter((row) => row.status === "failed");
  const verifiedAgents = agentRows.filter((row) =>
    ["verified", "approved"].includes(String(row.status ?? row.verification_status ?? "").toLowerCase())
  );
  const pendingReviews =
    certificationRows.filter((row) => row.status === "pending").length +
    alertRows.filter((row) => row.status === "in_review").length +
    agentRows.filter((row) => row.status === "pending").length;

  const summaryCards = [
    ["Verified Humans", certificationCount(certificationRows, "verified_human", "verified")],
    ["Verified AI Agents", verifiedAgents.length],
    ["Pending Reviews", pendingReviews],
    ["Active Alerts", activeAlerts.length],
    ["Failed Verifications", failedCertifications.length],
    ["Recent Audit Events", auditEvents.length],
  ];

  return (
    <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">
            Governance Overview
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-100">
            Enterprise AI Trust & Governance
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Certification, alerting, AI agent registry and provenance activity
            in one operational review surface. Development mock data appears
            when the new governance tables are empty.
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
          Human review remains authoritative
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map(([title, value]) => (
          <div key={String(title)} className="rounded-lg border border-zinc-800 bg-black p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.2fr_1fr]">
        <article className="rounded-lg border border-zinc-800 bg-black p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-zinc-100">Trust Alerts</h3>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass("active")}`}>
              {activeAlerts.length} active
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {alertRows.slice(0, 4).map((alert) => (
              <div key={String(alert.id)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-100">
                    {alert.alert_title ?? label(alert.alert_type, "Trust alert")}
                  </p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(alert.risk_level)}`}>
                    {label(alert.risk_level, "medium")}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {alert.alert_description ?? "Review the alert context before changing workflow state."}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-zinc-800 bg-black p-4">
          <h3 className="font-semibold text-zinc-100">AI Agent Registry</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                <tr>
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium">Owner</th>
                  <th className="pb-3 font-medium">Permissions</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {agentRows.slice(0, 5).map((agent) => (
                  <tr key={String(agent.id)}>
                    <td className="py-3">
                      <p className="font-medium text-zinc-100">{agent.agent_name ?? "Unnamed agent"}</p>
                      <p className="mt-1 text-xs text-zinc-500">{label(agent.agent_type, "agent")}</p>
                    </td>
                    <td className="py-3">
                      <p>{agent.owner_name ?? "Unassigned"}</p>
                      <p className="mt-1 text-xs text-zinc-500">{agent.owner_email ?? "No email"}</p>
                    </td>
                    <td className="py-3 text-xs text-zinc-400">
                      {asArray(agent.permissions).slice(0, 2).join(", ") || "review_only"}
                    </td>
                    <td className="py-3 font-medium text-cyan-100">{agent.trust_score ?? 50}</td>
                    <td className="py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(agent.status)}`}>
                        {label(agent.status, "pending")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-lg border border-zinc-800 bg-black p-4">
          <h3 className="font-semibold text-zinc-100">Threat / Risk Trend</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Alert counts grouped by operational risk category.
          </p>
          <TrendBars alerts={alertRows} />
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-lg border border-zinc-800 bg-black p-4">
          <h3 className="font-semibold text-zinc-100">Certification Summary</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Human", "verified_human"],
              ["Executive", "verified_executive"],
              ["Recruiter", "verified_recruiter"],
              ["Workflow", "verified_workflow"],
              ["AI Agent", "verified_ai_agent"],
              ["Enterprise", "verified_enterprise"],
            ].map(([title, type]) => (
              <div key={type} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-sm font-medium text-zinc-100">{title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {certificationCount(certificationRows, String(type), "verified")} verified /{" "}
                  {certificationCount(certificationRows, String(type), "pending")} pending
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-zinc-800 bg-black p-4">
          <h3 className="font-semibold text-zinc-100">Recent Provenance Events</h3>
          <div className="mt-4 grid gap-3">
            {provenanceRows.slice(0, 5).map((event) => (
              <div key={String(event.id)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {event.event_title ?? label(event.event_type, "Timeline event")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {label(event.subject_type, "workflow")} / {formatDate(event.created_at)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(event.risk_level)}`}>
                    {label(event.risk_level, "low")}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {event.event_description ?? "Timeline activity recorded for governance review."}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
