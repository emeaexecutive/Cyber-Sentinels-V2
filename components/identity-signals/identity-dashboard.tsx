"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardRequest = {
  id: string;
  subjectId: string;
  subject: { display_label: string | null; subject_type: string } | null;
  status: string;
  uiState: "partial" | "completed" | "failed" | "blocked";
  purpose: string;
  requestedSignals: string[];
  confidence: { score: number; status: string } | null;
  evidenceCount: number;
  verifiedEvidenceCount: number;
  warningCount: number;
  providerErrors: string[];
  reasonCodes: string[];
  updatedAt: string;
};

type DashboardPayload = {
  dashboard: {
    requests: DashboardRequest[];
    total: number;
    subjectCount: number;
    page: number;
    pageSize: number;
  };
  correlationId: string;
};

const stateStyles: Record<DashboardRequest["uiState"], string> = {
  completed: "border-emerald-700 bg-emerald-950/30 text-emerald-200",
  partial: "border-amber-700 bg-amber-950/30 text-amber-200",
  failed: "border-rose-700 bg-rose-950/30 text-rose-200",
  blocked: "border-orange-700 bg-orange-950/30 text-orange-200",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unknown" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function IdentityDashboard({ enterpriseId }: { enterpriseId: string }) {
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    fetch(`/api/identity/verifications?page=${page}&pageSize=20`, {
      headers: { "X-Enterprise-Id": enterpriseId },
      credentials: "same-origin",
      signal: controller.signal,
    }).then(async (response) => {
      const body = await response.json() as DashboardPayload & { error?: string };
      if (response.status === 401 || response.status === 403) {
        setMessage(body.error ?? "You are not authorized to view this enterprise.");
        setState("unauthorized");
        return;
      }
      if (!response.ok) throw new Error(body.error ?? "Identity data could not be loaded.");
      setPayload(body);
      setState("ready");
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setMessage(error instanceof Error ? error.message : "Identity data could not be loaded.");
      setState("failed");
    });
    return () => controller.abort();
  }, [enterpriseId, page]);

  if (state === "loading") return <section aria-busy="true" aria-label="Loading identity signals" data-state="loading" className="mt-8 space-y-4">
    <span className="sr-only">Loading identity signals</span>
    <div className="grid animate-pulse gap-4 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-28 rounded-xl border border-zinc-800 bg-zinc-950" />)}</div>
    <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-950" />
  </section>;

  if (state === "unauthorized") return <section role="alert" data-state="unauthorized" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/20 p-6"><h2 className="text-xl font-semibold text-rose-200">Unauthorized</h2><p className="mt-2 text-rose-100/80">{message}</p></section>;
  if (state === "failed" || !payload) return <section role="alert" data-state="failed" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/20 p-6"><h2 className="text-xl font-semibold text-rose-200">Identity data unavailable</h2><p className="mt-2 text-rose-100/80">{message}</p></section>;

  const { requests, total, subjectCount, pageSize } = payload.dashboard;
  const verifiedEvidence = requests.reduce((sum, item) => sum + item.verifiedEvidenceCount, 0);
  if (!requests.length && page === 1) return <section data-state="empty" className="enterprise-empty-state mt-8"><h2 className="text-xl font-semibold text-zinc-100">No identity verification activity</h2><p className="mt-2">Create a subject and verification through the authenticated enterprise API. No sample records or estimated metrics are shown.</p></section>;

  return <div className="mt-8" data-state="ready">
    <section aria-labelledby="identity-summary-heading">
      <h2 id="identity-summary-heading" className="sr-only">Identity runtime summary</h2>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="operational-card p-5"><dt className="text-sm text-zinc-400">Persisted subjects</dt><dd className="mt-2 text-3xl font-semibold">{subjectCount}</dd></div>
        <div className="operational-card p-5"><dt className="text-sm text-zinc-400">Verification requests</dt><dd className="mt-2 text-3xl font-semibold">{total}</dd></div>
        <div className="operational-card p-5"><dt className="text-sm text-zinc-400">Strictly verified evidence on this page</dt><dd className="mt-2 text-3xl font-semibold">{verifiedEvidence}</dd></div>
      </dl>
    </section>
    <section aria-labelledby="verification-activity-heading" className="operational-panel mt-6 overflow-hidden">
      <div className="border-b border-zinc-800 p-5"><h2 id="verification-activity-heading" className="text-xl font-semibold">Verification activity</h2><p className="mt-1 text-sm text-zinc-400">Confidence remains provisional. A pass is not presented as verification unless every evidence prerequisite is persisted.</p></div>
      <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable verification activity table">
        <table className="min-w-[1120px] w-full text-left text-sm">
          <caption className="sr-only">Tenant-scoped identity verification requests and evidence status</caption>
          <thead className="bg-zinc-950 text-zinc-300"><tr><th scope="col" className="p-4">Subject and purpose</th><th scope="col" className="p-4">State</th><th scope="col" className="p-4">Provisional confidence</th><th scope="col" className="p-4">Evidence</th><th scope="col" className="p-4">Warnings and errors</th><th scope="col" className="p-4">Reason codes</th><th scope="col" className="p-4">Last update</th></tr></thead>
          <tbody>{requests.map((row) => <tr key={row.id} data-state={row.uiState} className="border-t border-zinc-800 align-top">
            <td className="p-4"><Link href={`/dashboard/identity/verifications/${row.id}`} className="font-semibold text-cyan-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{row.subject?.display_label ?? row.subject?.subject_type ?? "Unlabelled subject"}</Link><p className="mt-1 max-w-xs text-zinc-400">{row.purpose}</p><p className="mt-1 text-xs text-zinc-500">{row.requestedSignals.join(", ")}</p></td>
            <td className="p-4"><span className={`enterprise-status-badge ${stateStyles[row.uiState]}`}>{row.uiState}</span><p className="mt-2 text-xs text-zinc-500">Runtime: {row.status}</p></td>
            <td className="p-4"><p className="font-semibold">{row.confidence?.score ?? 0}</p><p className="text-xs text-zinc-400">{row.confidence?.status ?? "INSUFFICIENT_EVIDENCE"}</p></td>
            <td className="p-4"><p>{row.evidenceCount} persisted</p><p className="text-xs text-zinc-400">{row.verifiedEvidenceCount} strictly verified</p></td>
            <td className="p-4"><p>{row.warningCount} warnings</p><p className="text-xs text-zinc-400">{row.providerErrors.length} provider errors</p></td>
            <td className="p-4"><ul aria-label={`Reason codes for ${row.id}`} className="max-w-xs space-y-1 text-xs text-zinc-400">{row.reasonCodes.length ? row.reasonCodes.map((code) => <li key={code}>{code}</li>) : <li>None persisted</li>}</ul></td>
            <td className="p-4 whitespace-nowrap"><time dateTime={row.updatedAt}>{formatDate(row.updatedAt)}</time></td>
          </tr>)}</tbody>
        </table>
      </div>
      <nav aria-label="Identity verification pagination" className="flex items-center justify-between gap-4 border-t border-zinc-800 p-4"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="min-h-11 rounded-lg border border-zinc-700 px-4 disabled:cursor-not-allowed disabled:opacity-50">Previous</button><p className="text-sm text-zinc-400">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</p><button type="button" onClick={() => setPage((value) => value + 1)} disabled={page * pageSize >= total} className="min-h-11 rounded-lg border border-zinc-700 px-4 disabled:cursor-not-allowed disabled:opacity-50">Next</button></nav>
    </section>
  </div>;
}
