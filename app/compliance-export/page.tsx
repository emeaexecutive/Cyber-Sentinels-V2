import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  complianceAuditEvents,
  complianceReportTypes,
  complianceSignals,
  demoComplianceReports,
  exportStatuses,
} from "@/lib/trust-engine/complianceExport";

export const dynamic = "force-dynamic";

type AuditLog = {
  id: string;
  event_type: string;
  actor: string | null;
  created_at: string | null;
};

type ReportBucket = {
  title: string;
  reports: typeof demoComplianceReports;
};

function statusClass(status: string) {
  if (["ready", "exported"].includes(status)) {
    return "border-emerald-700 text-emerald-200";
  }

  if (["expired", "restricted"].includes(status)) {
    return "border-red-700 text-red-200";
  }

  return "border-amber-700 text-amber-200";
}

function formatTime(value: string | null) {
  if (!value) return "demo";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ComplianceExportPage() {
  const supabase = await createClient();
  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("id,event_type,actor,created_at")
    .in("event_type", [
      "compliance_export_created",
      "trust_report_generated",
      "audit_pack_exported",
    ])
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<AuditLog[]>();
  const trustPassportReports = demoComplianceReports.filter((report) =>
    [
      "Trust Passport Report",
      "Human Presence Report",
      "Origin Trace Report",
      "Reality Passport Report",
    ].includes(report.report_type)
  );
  const candidateReports = demoComplianceReports.filter(
    (report) => report.report_type === "Candidate Trust Report"
  );
  const agentReports = demoComplianceReports.filter(
    (report) => report.report_type === "Agent Passport Report"
  );
  const evidenceReports = demoComplianceReports.filter(
    (report) => report.report_type === "Evidence Chain Report"
  );
  const decisionReports = demoComplianceReports.filter(
    (report) => report.report_type === "Decision Audit Report"
  );
  const reportBuckets: ReportBucket[] = [
    { title: "Trust Passport Reports", reports: trustPassportReports },
    { title: "Candidate Reports", reports: candidateReports },
    { title: "Agent Reports", reports: agentReports },
    { title: "Evidence Chain Reports", reports: evidenceReports },
    { title: "Decision Audit Reports", reports: decisionReports },
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/mission-control", "Mission Control"],
            ["/back-office", "Back Office"],
            ["/billing", "Billing"],
            ["/developer-console", "Developer Console"],
            ["/evidence-vault", "Evidence Vault"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Report pack
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Compliance Export&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Trust decisions must be explainable, portable and audit-ready.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoComplianceReports.map((report) => (
            <div
              key={report.report_id}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">{report.report_type}</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {report.subject_name}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    report.export_status
                  )}`}
                >
                  {report.export_status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {report.evidence_summary}
              </p>
              <div className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-3">
                <p>Trust {report.trust_score ?? "n/a"}</p>
                <p>HPI {report.human_presence_index ?? "n/a"}</p>
                <p>Origin {report.origin_trace_score ?? "n/a"}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Export Center</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {complianceReportTypes.map((type) => (
                <code
                  key={type}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {type}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Compliance Notes</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-400">
              <p>PDF generation is not enabled yet.</p>
              <p>Reports are structured for future signed exports.</p>
              <p>Production exports should include immutable audit references.</p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Export Statuses</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {exportStatuses.map((status) => (
                <span
                  key={status}
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    status
                  )}`}
                >
                  {status}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-5">
          {reportBuckets.map(({ title, reports }) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <div className="mt-5 space-y-3">
                {reports.length ? (
                  reports.map((report) => (
                    <div
                      key={`${title}-${report.report_id}`}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="font-medium text-zinc-100">
                        {report.subject_name}
                      </p>
                      <p className="mt-2 text-sm text-zinc-500">
                        {report.decision} / {report.policy_result}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">
                    No demo reports in this lane.
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Export History</h2>
            <div className="mt-5 space-y-3">
              {auditLogs?.length ? (
                auditLogs.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-300">{event.event_type}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {event.actor ?? "system"} / {formatTime(event.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                complianceSignals.map((signal) => (
                  <div
                    key={signal}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-300">{signal}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Audit Logs</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {complianceAuditEvents.map((event) => (
                <code
                  key={event}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {event}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
