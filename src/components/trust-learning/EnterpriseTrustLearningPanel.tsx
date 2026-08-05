"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EnterpriseTrustPattern } from "@/src/lib/trust-learning/types";

export function EnterpriseTrustLearningPanel({ enterpriseId }: { enterpriseId: string }) {
  const [patterns, setPatterns] = useState<EnterpriseTrustPattern[]>([]);
  const [state, setState] = useState("Loading tenant-bound derived patterns…");
  const [target, setTarget] = useState("");
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/trust/learning/patterns?limit=100", { cache: "no-store", signal: controller.signal, headers: { "X-Enterprise-Id": enterpriseId } })
      .then(async (response) => { const body = await response.json() as { patterns?: EnterpriseTrustPattern[]; error?: string }; if (!response.ok) throw new Error(body.error ?? "Pattern retrieval failed safely."); setPatterns(body.patterns ?? []); setState(body.patterns?.length ? `${body.patterns.length} derived pattern(s).` : "No recurrence meets the configured deterministic threshold."); })
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setState("Pattern data is unavailable until the development migration is applied."); });
    return () => controller.abort();
  }, [enterpriseId]);
  async function run(kind: "simulation" | "resilience") {
    if (!target.trim()) return;
    setState(`Running non-mutating ${kind}…`);
    const url = kind === "simulation" ? "/api/trust/learning/simulations" : "/api/trust/learning/resilience";
    const body = kind === "simulation" ? { simulationType: "provider_outage", targetReference: target.trim() } : { providerReference: target.trim() };
    try { const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "X-Enterprise-Id": enterpriseId }, body: JSON.stringify(body) }); const value = await response.json() as Record<string, unknown>; if (!response.ok) throw new Error(String(value.error ?? "Analysis failed safely.")); setAnalysis(value); setState(`${kind} completed against an immutable snapshot.`); } catch (error) { setState(error instanceof Error ? error.message : "Analysis failed safely."); }
  }
  return <div className="space-y-6">
    <section className="rounded-2xl border border-cyan-300/15 bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Enterprise Trust Learning™</p><h2 className="mt-2 text-xl font-semibold">Evidence-backed recurring patterns</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Derived patterns preserve canonical source references. They never replace policy, evidence, authority, Replay, Trust Memory, or a canonical trust decision.</p></div><span className="rounded-full border border-amber-300/30 px-3 py-1 text-xs text-amber-100">AI adapter: not configured</span></div>
      <p className="mt-4 text-xs text-zinc-500" role="status" aria-live="polite">{state}</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">{patterns.map((pattern) => <article className="rounded-xl border border-white/10 bg-black/20 p-4" key={pattern.patternId}><div className="flex justify-between gap-3"><h3 className="font-medium">{pattern.patternType.replaceAll("_", " ")}</h3><span className="text-xs uppercase text-cyan-300">Derived pattern</span></div><p className="mt-3 text-sm text-zinc-300">{pattern.supportingEventCount} supporting events · {pattern.evidenceStrength} evidence · {pattern.confidenceClassification} confidence classification</p><p className="mt-2 text-xs text-zinc-500">Observed {new Date(pattern.firstObservedAt).toLocaleString()} — {new Date(pattern.lastObservedAt).toLocaleString()}</p><p className="mt-3 text-xs text-zinc-400">Affected Trust Objects: {pattern.subjectReferences.join(", ") || "Not recorded"}</p><p className="mt-1 text-xs text-zinc-400">Authorities: {pattern.authorityReferences.join(", ") || "Not recorded"}</p><p className="mt-1 text-xs text-zinc-400">Providers: {pattern.providerReferences.join(", ") || "Not recorded"}</p><p className="mt-3 text-xs text-amber-100/80">{pattern.uncertainty.join(" ")}</p></article>)}{!patterns.length ? <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-zinc-400">No tenant pattern is displayed. The deterministic fallback and synthetic demonstrator remain available without a configured model.</div> : null}</div>
    </section>
    <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h3 className="font-semibold">Simulation and resilience</h3><p className="mt-2 text-sm text-zinc-400">Evaluate a provider reference against a captured snapshot. Canonical state is never mutated.</p><input aria-label="Provider reference" className="mt-4 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" placeholder="provider:reference" value={target} onChange={(event) => setTarget(event.target.value)} /><div className="mt-3 flex gap-2"><button className="rounded-lg border border-cyan-300/30 px-3 py-2 text-sm" type="button" onClick={() => void run("simulation")}>Simulate outage</button><button className="rounded-lg border border-cyan-300/30 px-3 py-2 text-sm" type="button" onClick={() => void run("resilience")}>Assess resilience</button></div>{analysis ? <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-zinc-300">{JSON.stringify(analysis, null, 2)}</pre> : null}</div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h3 className="font-semibold">Evidence and continuity</h3><ul className="mt-3 space-y-2 text-sm text-zinc-400"><li>Observed evidence stays distinct from derived patterns.</li><li>AI-generated drafts require citations and human review.</li><li>Corrections and contradictions remain visible.</li><li>Replay and Trust Memory preserve material outcomes.</li></ul><div className="mt-5 flex flex-wrap gap-2"><Link className="rounded-lg border border-white/15 px-3 py-2 text-sm" href="/trust-centre/fabric">Trust Fabric</Link><Link className="rounded-lg border border-white/15 px-3 py-2 text-sm" href="/demo/operational-trust">Synthetic demonstrator</Link></div></div></section>
  </div>;
}
