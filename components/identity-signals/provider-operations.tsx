"use client";

import { useEffect, useState } from "react";

type Capability = {
  provider_id: string;
  provider_name: string;
  signal_type: string;
  implementation_status: string;
  runtime_status: string;
  configurationPresent: boolean;
  capabilityTruth: {
    states: string[];
    reasonCodes: string[];
    blockers: string[];
    evidence: { transactionReference: string | null; signatureVerified: boolean; idempotencyVerified: boolean; normalizedEvidencePersisted: boolean; serverVerifiedEvidence: boolean };
  };
  lastRuntimeEvidenceAt: string | null;
};

type Health = {
  providerId: string;
  registered: boolean;
  configured: boolean;
  enabled: boolean;
  state: string;
  lastCheck: string;
  responseTimeMs: number | null;
  transactionalReadiness: boolean;
  signatureCapability: boolean;
  serverVerificationCapability: boolean;
  reasonCodes: string[];
  blockers: string[];
};

function formatDate(value: string | null) {
  if (!value) return "No runtime evidence";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unknown" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function booleanTruth(value: boolean, positive: string, negative: string) {
  return value ? positive : negative;
}

export function ProviderOperations({ enterpriseId }: { enterpriseId: string }) {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const headers = { "X-Enterprise-Id": enterpriseId };
    Promise.all([
      fetch("/api/identity/providers", { headers, credentials: "same-origin", signal: controller.signal }),
      fetch("/api/identity/providers/health", { headers, credentials: "same-origin", signal: controller.signal }),
    ]).then(async ([capabilityResponse, healthResponse]) => {
      const capabilityBody = await capabilityResponse.json() as { capabilities?: Capability[]; error?: string };
      const healthBody = await healthResponse.json() as { providers?: Health[]; error?: string };
      if ([capabilityResponse.status, healthResponse.status].some((status) => status === 401 || status === 403)) {
        setMessage(capabilityBody.error ?? healthBody.error ?? "Enterprise access denied.");
        setState("unauthorized");
        return;
      }
      if (!capabilityResponse.ok || !healthResponse.ok) throw new Error(capabilityBody.error ?? healthBody.error ?? "Provider operations data could not be loaded.");
      setCapabilities(capabilityBody.capabilities ?? []);
      setHealth(healthBody.providers ?? []);
      setState("ready");
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setMessage(error instanceof Error ? error.message : "Provider operations data could not be loaded.");
      setState("failed");
    });
    return () => controller.abort();
  }, [enterpriseId]);

  if (state === "loading") return <section data-state="loading" aria-busy="true" aria-label="Loading provider operations" className="mt-8 grid animate-pulse gap-6"><div className="h-72 rounded-xl border border-zinc-800 bg-zinc-950" /><div className="h-72 rounded-xl border border-zinc-800 bg-zinc-950" /><span className="sr-only">Loading provider operations</span></section>;
  if (state === "unauthorized") return <section data-state="unauthorized" role="alert" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/20 p-6"><h2 className="text-xl font-semibold">Unauthorized</h2><p className="mt-2">{message}</p></section>;
  if (state === "failed") return <section data-state="failed" role="alert" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/20 p-6"><h2 className="text-xl font-semibold">Provider operations unavailable</h2><p className="mt-2">{message}</p></section>;

  return <div className="mt-8 space-y-8">
    <section aria-labelledby="capability-heading" className="operational-panel overflow-hidden"><div className="border-b border-zinc-800 p-5"><h2 id="capability-heading" className="text-2xl font-semibold">Provider capability truth</h2><p className="mt-2 max-w-4xl text-zinc-400">Registered, configured, available, transactional, signed and server-verified are separate evidence states. Registry presence alone never implies execution.</p></div>
      {capabilities.length ? <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable provider capability table"><table className="min-w-[1120px] w-full text-left text-sm"><caption className="sr-only">Provider capabilities derived from registry, configuration and persisted runtime evidence</caption><thead className="bg-zinc-950 text-zinc-300"><tr><th scope="col" className="p-4">Provider and signal</th><th scope="col" className="p-4">Capability states</th><th scope="col" className="p-4">Runtime</th><th scope="col" className="p-4">Signed evidence prerequisites</th><th scope="col" className="p-4">Blockers</th><th scope="col" className="p-4">Last runtime evidence</th></tr></thead><tbody>{capabilities.map((row) => {
        const truth = row.capabilityTruth;
        const worldPending = row.provider_id === "world_id";
        return <tr key={`${row.provider_id}:${row.signal_type}`} className="border-t border-zinc-800 align-top"><td className="p-4"><p className="font-semibold">{row.provider_name}</p><p className="text-xs text-zinc-400">{row.signal_type}</p><p className="mt-1 text-xs text-zinc-500">{row.implementation_status}</p></td><td className="p-4"><ul className="flex max-w-sm flex-wrap gap-2" aria-label={`Capability states for ${row.provider_name}`}>{truth.states.map((item) => <li key={item} className="enterprise-status-badge border-zinc-600 text-zinc-200">{item}</li>)}</ul>{worldPending ? <p className="mt-3 text-sm text-amber-200">Server verification not implemented</p> : null}</td><td className="p-4"><p>{row.runtime_status}</p><p className="mt-1 text-xs text-zinc-400">{booleanTruth(row.configurationPresent, "Configuration present", "Not configured")}</p></td><td className="p-4"><ul className="space-y-1 text-xs text-zinc-300"><li>{booleanTruth(truth.evidence.signatureVerified, "Signature verified", "Signature not proven")}</li><li>{booleanTruth(truth.evidence.idempotencyVerified, "Idempotency proven", "Idempotency not proven")}</li><li>{booleanTruth(truth.evidence.normalizedEvidencePersisted, "Normalized evidence persisted", "Persistence not proven")}</li><li>{booleanTruth(truth.evidence.serverVerifiedEvidence, "Server verification proven", "Server verification not proven")}</li><li>{truth.evidence.transactionReference ? "Transaction reference retained" : "Transaction reference absent"}</li></ul></td><td className="p-4"><ul className="max-w-sm space-y-1 text-xs text-zinc-400">{truth.blockers.length ? truth.blockers.map((blocker) => <li key={blocker}>{blocker}</li>) : <li>No current blockers</li>}</ul></td><td className="p-4 whitespace-nowrap">{formatDate(row.lastRuntimeEvidenceAt)}</td></tr>;
      })}</tbody></table></div> : <div data-state="empty" className="enterprise-empty-state m-5">No provider capabilities are registered in this environment.</div>}
    </section>
    <section aria-labelledby="health-heading" className="operational-panel overflow-hidden"><div className="border-b border-zinc-800 p-5"><h2 id="health-heading" className="text-2xl font-semibold">Provider health</h2><p className="mt-2 text-zinc-400">Safe operational summaries only. Secrets, raw provider responses and raw error bodies are not returned.</p></div>
      <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable provider health table"><table className="min-w-[1060px] w-full text-left text-sm"><caption className="sr-only">Provider health, readiness and blockers</caption><thead className="bg-zinc-950 text-zinc-300"><tr><th scope="col" className="p-4">Provider</th><th scope="col" className="p-4">Health state</th><th scope="col" className="p-4">Last check</th><th scope="col" className="p-4">Response time</th><th scope="col" className="p-4">Transactional readiness</th><th scope="col" className="p-4">Signed / server verified</th><th scope="col" className="p-4">Reason codes and blockers</th></tr></thead><tbody>{health.map((row) => <tr key={row.providerId} className="border-t border-zinc-800 align-top"><td className="p-4 font-semibold">{row.providerId}</td><td className="p-4"><span className="enterprise-status-badge border-zinc-600 text-zinc-200">{row.state}</span></td><td className="p-4 whitespace-nowrap">{formatDate(row.lastCheck)}</td><td className="p-4">{row.responseTimeMs === null ? "Not available" : `${row.responseTimeMs} ms`}</td><td className="p-4">{booleanTruth(row.transactionalReadiness, "Ready from live health", "Not ready")}</td><td className="p-4"><p>{booleanTruth(row.signatureCapability, "Signed evidence proven", "Signature not proven")}</p><p className="mt-1 text-xs text-zinc-400">{booleanTruth(row.serverVerificationCapability, "Server verification proven", "Server verification not proven")}</p></td><td className="p-4"><ul className="max-w-sm space-y-1 text-xs text-zinc-400">{[...new Set([...row.reasonCodes, ...row.blockers])].map((item) => <li key={item}>{item}</li>)}</ul></td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
