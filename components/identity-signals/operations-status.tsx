"use client";

import { useEffect, useState } from "react";

type Control = {
  id: string;
  label: string;
  state: "VERIFIED_FROM_RUNTIME" | "VERIFIED_FROM_REPOSITORY" | "BLOCKED_BY_EXTERNAL_CONFIGURATION" | "NOT_CONFIGURED";
  reasonCode: string;
  evidence: string[];
};

const stateCopy: Record<Control["state"], string> = {
  VERIFIED_FROM_RUNTIME: "VERIFIED FROM RUNTIME",
  VERIFIED_FROM_REPOSITORY: "VERIFIED FROM REPOSITORY",
  BLOCKED_BY_EXTERNAL_CONFIGURATION: "BLOCKED BY EXTERNAL CONFIGURATION",
  NOT_CONFIGURED: "NOT CONFIGURED",
};

export function OperationsStatus({ enterpriseId }: { enterpriseId: string }) {
  const [controls, setControls] = useState<Control[]>([]);
  const [notice, setNotice] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "unauthorized" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/operations/status", { headers: { "X-Enterprise-Id": enterpriseId }, credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { controls?: Control[]; truthNotice?: string; error?: string };
        if (response.status === 401 || response.status === 403) {
          setMessage(body.error ?? "Enterprise access denied.");
          setState("unauthorized");
          return;
        }
        if (!response.ok) throw new Error(body.error ?? "Operations status could not be loaded.");
        setControls(body.controls ?? []);
        setNotice(body.truthNotice ?? "");
        setState("ready");
      }).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMessage(error instanceof Error ? error.message : "Operations status could not be loaded.");
        setState("failed");
      });
    return () => controller.abort();
  }, [enterpriseId]);

  if (state === "loading") return <section data-state="loading" aria-busy="true" aria-label="Loading operations status" className="mt-8 grid animate-pulse gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-40 rounded-xl border border-zinc-800 bg-zinc-950" />)}<span className="sr-only">Loading operations status</span></section>;
  if (state === "unauthorized") return <section data-state="unauthorized" role="alert" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/20 p-6"><h2 className="text-xl font-semibold">Unauthorized</h2><p className="mt-2">{message}</p></section>;
  if (state === "failed") return <section data-state="failed" role="alert" className="mt-8 rounded-xl border border-rose-800 bg-rose-950/20 p-6"><h2 className="text-xl font-semibold">Operations status unavailable</h2><p className="mt-2">{message}</p></section>;
  if (!controls.length) return <section data-state="empty" className="enterprise-empty-state mt-8">No operational controls were returned.</section>;

  return <section aria-labelledby="control-status-heading" className="mt-8"><div className="rounded-xl border border-cyan-900 bg-cyan-950/20 p-5"><h2 id="control-status-heading" className="text-xl font-semibold">Control-plane evidence boundary</h2><p className="mt-2 text-zinc-300">{notice}</p></div><div className="mt-5 grid gap-4 md:grid-cols-2">{controls.map((control) => <article key={control.id} className="operational-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-lg font-semibold">{control.label}</h3><span className="enterprise-status-badge border-zinc-600 text-zinc-200">{stateCopy[control.state]}</span></div><p className="mt-4 text-sm text-zinc-400">Reason code: <span className="font-mono text-xs">{control.reasonCode}</span></p>{control.evidence.length ? <div className="mt-4"><h4 className="text-sm font-semibold">Authoritative evidence</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">{control.evidence.map((item) => <li key={item}>{item}</li>)}</ul></div> : <p className="mt-4 text-sm text-amber-200">No authoritative runtime evidence is attached. This control remains unverified.</p>}</article>)}</div></section>;
}
