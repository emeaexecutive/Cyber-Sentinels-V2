import Link from "next/link";
import { PrintReceiptButton } from "@/components/print-receipt-button";
import type { TrustTransparencyReport } from "@/lib/trust-transparency";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TrustTransparencyReportView({
  report,
  showExport = true,
}: {
  report: TrustTransparencyReport;
  showExport?: boolean;
}) {
  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Explainable trust decision
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {report.workflow.subjectType} / {report.workflow.subjectId}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              {report.posture.explanation ?? "No posture explanation is recorded."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {showExport ? (
              <>
                <Link
                  href={`/api/audit/export?workflow_id=${encodeURIComponent(report.workflow.subjectId)}&subject_type=${encodeURIComponent(report.workflow.subjectType)}&format=pack`}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
                >
                  Download Trust Evidence Pack
                </Link>
                <Link
                  href={`/api/audit/export?workflow_id=${encodeURIComponent(report.workflow.subjectId)}&subject_type=${encodeURIComponent(report.workflow.subjectType)}&format=json`}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white"
                >
                  Export JSON
                </Link>
                <Link
                  href={`/api/audit/export?workflow_id=${encodeURIComponent(report.workflow.subjectId)}&subject_type=${encodeURIComponent(report.workflow.subjectType)}&format=text`}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white"
                >
                  Export Text
                </Link>
              </>
            ) : null}
            <PrintReceiptButton />
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["What changed", report.decisionExplanation.whatChanged],
            ["Why trust shifted", report.decisionExplanation.whyTrustShifted],
            [
              "Evidence continuity",
              `${report.auditability.evidenceContinuityCount} evidence record(s), ${report.auditability.chronologyCount} chronology event(s)`,
            ],
            [
              "Replay reference",
              report.auditability.replayReference ?? "No replay session recorded",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Provider Evidence Summary</h2>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
              {report.decisionExplanation.providerSignals.length}
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {report.decisionExplanation.providerSignals.length ? (
              report.decisionExplanation.providerSignals.map((provider, index) => (
                <article key={`${provider.provider}-${index}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-semibold text-zinc-100">{provider.provider}</h3>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-300">
                      {provider.state.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{provider.summary}</p>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    Evidence: {provider.evidenceReferences.join(", ") || "No provider evidence reference recorded"}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No provider signal is linked to this workflow.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Governance Intervention History</h2>
            <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
              {report.decisionExplanation.governanceActions.length}
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {report.decisionExplanation.governanceActions.length ? (
              report.decisionExplanation.governanceActions.map((action, index) => (
                <article key={`${action.occurredAt}-${index}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-semibold capitalize text-zinc-100">
                      {action.action.replaceAll("_", " ")}
                    </h3>
                    <span className="text-xs text-zinc-500">{formatDate(action.occurredAt)}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
                    <div>Reviewer: {action.reviewer}</div>
                    <div>Escalation owner: {action.owner}</div>
                    <div>Resolution: {action.resolution}</div>
                  </dl>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No governance intervention is recorded for this workflow.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Evidence References</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {report.decisionExplanation.evidenceContributed.length ? (
              report.decisionExplanation.evidenceContributed.map((reference) => (
                <span key={reference} className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                  {reference}
                </span>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No evidence references recorded.</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Authorization Lineage</h2>
          <div className="mt-4 grid gap-2 text-sm text-zinc-400">
            {report.auditability.authorizationLineage.length ? (
              report.auditability.authorizationLineage.map((item) => (
                <p key={item} className="rounded-lg border border-zinc-800 bg-black p-3">{item}</p>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-3 text-zinc-500">
                No explicit authorization lineage is recorded.
              </p>
            )}
          </div>
        </div>
      </section>

      <p className="rounded-lg border border-cyan-950 bg-black p-4 text-sm leading-6 text-zinc-400">
        {report.boundary}
      </p>
    </div>
  );
}
