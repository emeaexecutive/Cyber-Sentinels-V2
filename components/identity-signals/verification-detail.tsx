"use client";

import { useEffect, useState } from "react";

type Evidence = {
  id: string;
  provider_id: string;
  signal_type: string;
  signal_status: string;
  outcome: string;
  server_verified: boolean;
  signature_verified: boolean;
  provider_reference: string | null;
  provider_event_id: string | null;
  provider_transaction_id: string | null;
  source_digest: string | null;
  reason_codes: string[];
  provenance: { source?: string; mappingVersion?: string; mapping_version?: string; collectedAt?: string; collected_at?: string } | null;
  observed_at: string;
  created_at: string;
  expires_at: string | null;
};

type VerificationPayload = {
  verification: {
    request: { id: string; status: string; purpose: string; created_at: string; updated_at: string };
    evidence: Evidence[];
    transactions: Array<{ id: string; provider_id: string; signal_type: string; status: string; error_code: string | null; completed_at: string | null }>;
    confidence: { score: number; status: string; reason_codes: string[]; methodology_version: string } | null;
  };
  correlationId: string;
};

function displayLabel(evidence: Evidence) {
  const strictHopae = evidence.provider_id === "hopae_connect"
    && evidence.signal_status === "PASS"
    && evidence.outcome === "VERIFIED"
    && evidence.server_verified
    && evidence.signature_verified
    && Boolean(evidence.provider_reference)
    && Boolean(evidence.provider_transaction_id)
    && Boolean(evidence.source_digest);
  if (evidence.provider_id === "world_id") return "Proof received — server verification pending";
  if (strictHopae) return "Signed and server verified";
  if (evidence.signal_status === "PASS") return "Pass — verification prerequisites incomplete";
  return evidence.signal_status;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unknown" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function VerificationDetail({ enterpriseId, verificationId }: { enterpriseId: string; verificationId: string }) {
  const [payload, setPayload] = useState<VerificationPayload | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/identity/verifications/${verificationId}`, { headers: { "X-Enterprise-Id": enterpriseId }, credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as VerificationPayload & { error?: string };
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          setMessage(body.error ?? "This verification is unavailable in the selected enterprise.");
          setState("unauthorized");
          return;
        }
        if (!response.ok) throw new Error(body.error ?? "Verification details could not be loaded.");
        setPayload(body);
        setState("ready");
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMessage(error instanceof Error ? error.message : "Verification details could not be loaded.");
        setState("failed");
      });
    return () => controller.abort();
  }, [enterpriseId, verificationId]);

  if (state === "loading") return <section data-state="loading" aria-busy="true" aria-label="Loading verification detail" className="mt-8 grid animate-pulse gap-4"><div className="h-28 rounded-xl border border-zinc-800 bg-zinc-950" /><div className="h-64 rounded-xl border border-zinc-800 bg-zinc-950" /><span className="sr-only">Loading verification detail</span></section>;
  if (state === "unauthorized") return <section data-state="unauthorized" role="alert" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/20 p-6"><h2 className="text-xl font-semibold">Verification unavailable</h2><p className="mt-2">{message}</p></section>;
  if (state === "failed" || !payload) return <section data-state="failed" role="alert" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/20 p-6"><h2 className="text-xl font-semibold">Unable to load verification</h2><p className="mt-2">{message}</p></section>;

  const { request, evidence, confidence, transactions } = payload.verification;
  return <div className="mt-8">
    <section aria-labelledby="verification-summary-heading"><h2 id="verification-summary-heading" className="sr-only">Verification summary</h2><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="operational-card p-5"><dt className="text-sm text-zinc-400">Request state</dt><dd className="mt-2 font-semibold">{request.status}</dd></div><div className="operational-card p-5"><dt className="text-sm text-zinc-400">Provisional confidence</dt><dd className="mt-2 text-2xl font-semibold">{confidence?.score ?? 0}</dd><dd className="text-xs text-zinc-400">{confidence?.status ?? "INSUFFICIENT_EVIDENCE"}</dd></div><div className="operational-card p-5"><dt className="text-sm text-zinc-400">Evidence records</dt><dd className="mt-2 text-2xl font-semibold">{evidence.length}</dd></div><div className="operational-card p-5"><dt className="text-sm text-zinc-400">Provider transactions</dt><dd className="mt-2 text-2xl font-semibold">{transactions.length}</dd></div></dl></section>
    <section aria-labelledby="evidence-heading" className="mt-6"><div><h2 id="evidence-heading" className="text-2xl font-semibold">Persisted evidence</h2><p className="mt-2 text-zinc-400">Each signal retains its own truth state. Mixed evidence is never collapsed into a single verification badge.</p></div>
      {evidence.length ? <div className="mt-4 grid gap-4">{evidence.map((item) => {
        const provenance = item.provenance;
        return <article key={item.id} className="operational-panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{item.signal_type}</h3><p className="mt-1 text-sm text-zinc-400">Provider: {item.provider_id}</p></div><span className="enterprise-status-badge border-zinc-600 text-zinc-200">{displayLabel(item)}</span></div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-zinc-500">Signal status</dt><dd className="mt-1 font-medium">{item.signal_status}</dd></div><div><dt className="text-zinc-500">Server verification</dt><dd className="mt-1">{item.server_verified ? "Present" : "Not present"}</dd></div><div><dt className="text-zinc-500">Signature verification</dt><dd className="mt-1">{item.signature_verified ? "Present" : "Not present"}</dd></div><div><dt className="text-zinc-500">Provider reference</dt><dd className="mt-1 break-all font-mono text-xs">{item.provider_reference ?? "Not retained"}</dd></div><div><dt className="text-zinc-500">Observed</dt><dd className="mt-1"><time dateTime={item.observed_at}>{formatDate(item.observed_at)}</time></dd></div><div><dt className="text-zinc-500">Persisted</dt><dd className="mt-1"><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></dd></div><div><dt className="text-zinc-500">Expiry</dt><dd className="mt-1">{formatDate(item.expires_at)}</dd></div><div><dt className="text-zinc-500">Provider event</dt><dd className="mt-1 break-all font-mono text-xs">{item.provider_event_id ?? "Not retained"}</dd></div></dl>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><div><h4 className="text-sm font-semibold">Reason codes</h4><ul className="mt-2 space-y-1 text-sm text-zinc-400">{item.reason_codes.length ? item.reason_codes.map((code) => <li key={code}>{code}</li>) : <li>None persisted</li>}</ul></div><div><h4 className="text-sm font-semibold">Provenance summary</h4><p className="mt-2 text-sm text-zinc-400">Source: {provenance?.source ?? "none"}</p><p className="text-sm text-zinc-400">Mapping: {provenance?.mappingVersion ?? provenance?.mapping_version ?? "not recorded"}</p><p className="text-sm text-zinc-400">Collected: {formatDate(provenance?.collectedAt ?? provenance?.collected_at ?? null)}</p></div></div>
        </article>;
      })}</div> : <div data-state="empty" className="enterprise-empty-state mt-4">No evidence has been persisted for this request.</div>}
    </section>
  </div>;
}
