"use client";

import { useEffect, useState } from "react";

export function ConsentAdminSummary({ enterpriseId }: { enterpriseId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!enterpriseId) return; fetch("/api/admin/consent/summary", { headers: { "x-enterprise-id": enterpriseId }, cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Summary unavailable."); setData(body); }).catch((reason) => setError(reason.message)); }, [enterpriseId]);
  if (!enterpriseId) return <p className="text-amber-200">Consent default enterprise configuration is required before aggregate reporting is available.</p>;
  if (error) return <p role="alert" className="text-amber-200">{error}</p>;
  if (!data) return <p className="text-zinc-400">Loading privacy-minimised consent metrics…</p>;
  const metrics = data.metrics as Record<string, unknown>;
  const scalar=Object.entries(metrics).filter(([,value])=>value===null||["number","string"].includes(typeof value));const grouped=Object.entries(metrics).filter(([,value])=>value&&typeof value==="object");
  return <div className="grid gap-4"><p className="text-sm text-zinc-400">Minimum cohort: {String(data.minimumCohort)} · {data.suppressed ? "Small-cohort metrics are suppressed." : "Aggregate metrics available."}</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{scalar.map(([key, value]) => <article key={key} className="rounded-xl border border-zinc-800 bg-black p-4"><p className="text-xs text-zinc-500">{key.replaceAll(/([A-Z])/g, " $1")}</p><p className="mt-2 text-xl font-semibold">{value === null ? "Suppressed" : typeof value === "number" && value <= 1 ? `${Math.round(value * 100)}%` : String(value)}</p></article>)}</div><div className="grid gap-3 md:grid-cols-2">{grouped.map(([key,value])=><article key={key} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><h2 className="text-sm font-semibold text-zinc-200">{key.replaceAll(/([A-Z])/g," $1")}</h2><div className="mt-3 grid gap-1 text-xs text-zinc-400">{Object.entries(value as Record<string,unknown>).map(([label,count])=><p key={label}>{label}: {typeof count==="number"&&count<=1?`${Math.round(count*100)}%`:String(count)}</p>)}</div></article>)}</div></div>;
}
