"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  TrustCentreRow,
  TrustCentreSearchResult,
  TrustCentreSnapshot,
} from "@/src/lib/trust-centre/types";
import type { buildContinuousOperationalTrustScenario } from "@/lib/trust-intelligence";

type OperationalIntelligenceScenario = ReturnType<typeof buildContinuousOperationalTrustScenario>;

type View =
  | "overview"
  | "graph"
  | "dna"
  | "replay"
  | "continuous"
  | "alerts"
  | "policies"
  | "providers"
  | "reports"
  | "intelligence";

const views: Array<{ id: View; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "intelligence", label: "Operational intelligence" },
  { id: "graph", label: "Trust graph" },
  { id: "dna", label: "Trust DNA" },
  { id: "replay", label: "Replay" },
  { id: "continuous", label: "Continuous trust" },
  { id: "alerts", label: "Alerts" },
  { id: "policies", label: "Policies" },
  { id: "providers", label: "Providers" },
  { id: "reports", label: "Reports" },
];

const panel = "rounded-2xl border border-white/10 bg-white/[0.035] p-5";
const subtleButton =
  "rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400";
const primaryButton =
  "rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-black transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#05080d] disabled:cursor-not-allowed disabled:opacity-50";

function text(value: unknown, fallback = "Awaiting data") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function when(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date) + " UTC"
    : "Not recorded";
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-zinc-400">
      {children}
    </p>
  );
}

function StatePill({ value }: { value: unknown }) {
  const state = text(value, "UNKNOWN").toUpperCase();
  const tone = /VERIFIED|TRUSTED|HEALTHY|ACTIVE|RESOLVED/.test(state)
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : /BLOCKED|REVOKED|CRITICAL|FAILED|DOWN/.test(state)
      ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
      : /CHALLENGED|DEGRADED|HIGH|OPEN|INVESTIGATING/.test(state)
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : "border-white/15 bg-white/5 text-zinc-300";
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${tone}`}>
      {state.replaceAll("_", " ")}
    </span>
  );
}

function Overview({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  const cards = [
    ["Current trust health", snapshot.overview.currentTrustHealth === null ? "—" : `${snapshot.overview.currentTrustHealth}/100`],
    ["High-risk entities", snapshot.overview.highRiskCount],
    ["Pending reviews", snapshot.overview.pendingReviewCount],
    ["Open alerts", snapshot.overview.openAlertCount],
    ["Measured providers", snapshot.overview.providerCount],
    ["Replay events", snapshot.overview.replayActivityCount],
    ["Policies", snapshot.overview.policyCount],
    ["Runtime subjects", snapshot.overview.subjectCount],
  ];
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Trust overview">
        {cards.map(([label, value]) => (
          <article className={panel} key={String(label)}>
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-100">{value}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className={panel}>
          <h2 className="text-lg font-semibold">Trust score distribution</h2>
          <div className="mt-5 space-y-3">
            {snapshot.distribution.map((item) => {
              const percentage = snapshot.overview.subjectCount
                ? Math.round((item.count / snapshot.overview.subjectCount) * 100)
                : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.label}</span><span>{item.count} · {percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {!snapshot.distribution.length ? <Empty>No measured trust states are available.</Empty> : null}
          </div>
        </section>
        <section className={panel}>
          <h2 className="text-lg font-semibold">Organisation summary</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-zinc-500">Workspace</dt><dd className="mt-1">{snapshot.organisation.name}</dd></div>
            <div><dt className="text-xs text-zinc-500">Access profile</dt><dd className="mt-1">{snapshot.organisation.role.replaceAll("_", " ")}</dd></div>
            <div><dt className="text-xs text-zinc-500">Evidence records</dt><dd className="mt-1">{snapshot.evidence.length}</dd></div>
            <div><dt className="text-xs text-zinc-500">Last recalculated</dt><dd className="mt-1">{when(snapshot.generatedAt)}</dd></div>
          </dl>
        </section>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <EntityList title="High-risk entities" rows={snapshot.highRiskEntities} />
        <EntityList title="Verification queue" rows={snapshot.verificationQueue} />
        <EntityList title="AI agent status" rows={snapshot.aiAgents} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <EntityList title="Manual reviews" rows={snapshot.manualReviews} />
        <EventList title="Recent Replay activity" rows={snapshot.replayActivity.slice(0, 10)} />
      </div>
    </div>
  );
}

function EntityList({ title, rows }: { title: string; rows: TrustCentreRow[] }) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.slice(0, 8).map((row, index) => (
          <article className="rounded-xl border border-white/10 p-3" key={`${row.subject_id ?? row.id ?? index}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{text(row.subject_id ?? row.subject_reference ?? row.id)}</p>
                <p className="mt-1 text-xs text-zinc-500">{text(row.domain_key ?? row.subject_type ?? row.alert_type, "Trust subject")}</p>
              </div>
              <StatePill value={row.state ?? row.status ?? row.severity} />
            </div>
          </article>
        ))}
        {!rows.length ? <Empty>No measured records require attention.</Empty> : null}
      </div>
    </section>
  );
}

function EventList({ title, rows }: { title: string; rows: TrustCentreRow[] }) {
  return (
    <section className={panel}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <article className="border-l border-cyan-400/40 pl-4" key={`${row.event_id ?? index}`}>
            <p className="font-medium">{text(row.event_type, "Trust event")}</p>
            <p className="mt-1 text-xs text-zinc-500">{text(row.subject_id)} · {when(row.occurred_at ?? row.received_at)}</p>
          </article>
        ))}
        {!rows.length ? <Empty>No immutable Replay events are available.</Empty> : null}
      </div>
    </section>
  );
}

function GraphExplorer({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  const [subject, setSubject] = useState(String(snapshot.runtime[0]?.subject_id ?? ""));
  const [graph, setGraph] = useState<Record<string, unknown> | null>(null);
  const [selected, setSelected] = useState<TrustCentreRow | null>(null);
  const [status, setStatus] = useState("Select a subject to load its graph.");
  useEffect(() => {
    if (!subject) return;
    let active = true;
    setStatus("Loading tenant-scoped graph…");
    fetch(`/api/trust-architecture/subjects/${encodeURIComponent(subject)}/graph?limit=200`, {
      cache: "no-store",
      headers: { "X-Enterprise-Id": snapshot.organisation.id },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Graph unavailable");
        return response.json() as Promise<Record<string, unknown>>;
      })
      .then((body) => {
        if (!active) return;
        const next = body.graph && typeof body.graph === "object" ? body.graph as Record<string, unknown> : null;
        setGraph(next);
        setSelected(null);
        setStatus(next ? "Graph loaded." : "No graph is available.");
      })
      .catch(() => active && setStatus("The graph could not be loaded safely."));
    return () => { active = false; };
  }, [snapshot.organisation.id, subject]);
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes as TrustCentreRow[] : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges as TrustCentreRow[] : [];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Interactive evidence graph</h2><p className="mt-1 text-sm text-zinc-400">Choose a node to inspect its safe metadata and relationships.</p></div>
          <label className="text-sm">Subject
            <select className="ml-2 rounded-lg border border-white/15 bg-[#0b111a] px-3 py-2" value={subject} onChange={(event) => setSubject(event.target.value)}>
              {snapshot.runtime.map((row) => <option key={String(row.subject_id)} value={String(row.subject_id)}>{text(row.subject_id)}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-zinc-500" role="status" aria-live="polite">{status}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <button type="button" key={String(node.nodeId)} onClick={() => setSelected(node)} className="rounded-xl border border-white/10 p-4 text-left transition hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <span className="text-xs uppercase text-cyan-300">{text(node.nodeType)}</span>
              <span className="mt-2 block break-all font-medium">{text(node.label ?? node.externalId)}</span>
              <span className="mt-2 block text-xs text-zinc-500">{text(node.domainKey, "Cross-domain")}</span>
            </button>
          ))}
          {!nodes.length ? <Empty>No graph nodes were found for this subject.</Empty> : null}
        </div>
        {edges.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><caption className="mb-3 text-left font-medium">Relationships</caption><thead className="text-xs uppercase text-zinc-500"><tr><th className="pb-2">From</th><th className="pb-2">Relationship</th><th className="pb-2">To</th></tr></thead><tbody>{edges.map((edge) => <tr className="border-t border-white/10" key={String(edge.edgeId)}><td className="py-2">{text(edge.fromNodeId)}</td><td><StatePill value={edge.edgeType} /></td><td>{text(edge.toNodeId)}</td></tr>)}</tbody></table></div> : null}
      </section>
      <aside className={panel} aria-label="Selected graph node details">
        <h2 className="text-lg font-semibold">Node evidence</h2>
        {selected ? <dl className="mt-4 space-y-4">
          <div><dt className="text-xs text-zinc-500">Label</dt><dd className="mt-1 break-all">{text(selected.label ?? selected.externalId)}</dd></div>
          <div><dt className="text-xs text-zinc-500">Type</dt><dd className="mt-1">{text(selected.nodeType)}</dd></div>
          <div><dt className="text-xs text-zinc-500">Confidence context</dt><dd className="mt-1">Use the linked evidence and Trust DNA confidence; confidence is never inferred from graph position.</dd></div>
          <div><dt className="text-xs text-zinc-500">Safe metadata</dt><dd className="mt-1 break-words text-sm text-zinc-300">{JSON.stringify(selected.metadata ?? {})}</dd></div>
          <div><dt className="text-xs text-zinc-500">History</dt><dd className="mt-1">{when(selected.createdAt)}</dd></div>
        </dl> : <Empty>Select a graph node to inspect it.</Empty>}
      </aside>
    </div>
  );
}

function TrustDna({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-lg font-semibold">Trust DNA profile</h2><p className="mt-1 max-w-3xl text-sm text-zinc-400">Explainable operational projection from canonical evidence. Missing evidence remains unscored.</p></div>
        <StatePill value={snapshot.dataAvailability.trustDna ? "evidence available" : "unavailable"} />
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500"><tr><th className="pb-3">Dimension</th><th className="pb-3">Score</th><th className="pb-3">Confidence</th><th className="pb-3">Weight</th><th className="pb-3">Trend</th><th className="pb-3">Explanation</th></tr></thead>
          <tbody>{snapshot.trustDna.map((dimension) => <tr className="border-t border-white/10 align-top" key={dimension.dimension}><td className="py-4 font-medium">{dimension.dimension}</td><td>{dimension.score ?? "—"}</td><td>{dimension.confidence}%</td><td>{dimension.weight}%</td><td><StatePill value={dimension.trend} /></td><td className="max-w-sm text-zinc-400">{dimension.explanation}{dimension.comparedWith !== null ? ` Previous measured value: ${dimension.comparedWith}.` : ""}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function ReplayViewer({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [audit, setAudit] = useState(false);
  const providers = [...new Set(snapshot.replayActivity.map((row) => text(row.provider_key, "unattributed")))].sort();
  const filtered = snapshot.replayActivity.filter((row) => {
    const searchable = `${row.event_type ?? ""} ${row.subject_id ?? ""} ${row.provider_key ?? ""} ${(Array.isArray(row.reason_codes) ? row.reason_codes : []).join(" ")}`.toLowerCase();
    return searchable.includes(query.toLowerCase()) && (provider === "all" || text(row.provider_key, "unattributed") === provider);
  });
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Replay Viewer</h2><p className="mt-1 text-sm text-zinc-400">Immutable canonical events, filtered without changing the retained record.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={audit} onChange={(event) => setAudit(event.target.checked)} /> Audit mode</label></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Search timeline<input className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="text-sm">Provider<select className="mt-1 w-full rounded-lg border border-white/15 bg-[#0b111a] px-3 py-2" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="all">All providers</option>{providers.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="mt-6 space-y-4">
        {filtered.map((row, index) => <article className="grid gap-3 border-l border-cyan-400/50 pl-4 sm:grid-cols-[160px_1fr_auto]" key={String(row.event_id ?? index)}><time className="text-xs text-zinc-500">{when(row.occurred_at ?? row.received_at)}</time><div><p className="font-medium">{text(row.event_type)}</p><p className="mt-1 text-sm text-zinc-400">{text(row.subject_id)} · {text(row.provider_key, "No provider")}</p>{audit ? <p className="mt-2 break-all font-mono text-xs text-zinc-500">Sequence {text(row.sequence)} · Hash {text(row.event_hash)}</p> : null}</div><StatePill value={(Array.isArray(row.reason_codes) && row.reason_codes.length) ? "explained" : "recorded"} /></article>)}
        {!filtered.length ? <Empty>No Replay events match the current filters.</Empty> : null}
      </div>
    </section>
  );
}

function ContinuousTrust({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <EntityList title="Live trust state" rows={snapshot.runtime} />
      <section className={panel}><h2 className="text-lg font-semibold">Recent signals and recalculations</h2><div className="mt-4 space-y-3">{snapshot.assessments.slice(0, 20).map((row) => <article className="rounded-xl border border-white/10 p-3" key={String(row.assessment_id)}><div className="flex justify-between gap-3"><p className="font-medium">{text(row.subject_id)}</p><StatePill value={row.transition_type} /></div><p className="mt-2 text-sm text-zinc-400">Score {text(row.score)} · confidence {text(row.confidence)}% · {text(row.evidence_freshness)}</p><p className="mt-1 text-xs text-zinc-500">Next evaluation {when(row.next_evaluation_at)}</p></article>)}{!snapshot.assessments.length ? <Empty>No automatic recalculations have been retained.</Empty> : null}</div></section>
    </div>
  );
}

function Alerts({ snapshot, onRefresh }: { snapshot: TrustCentreSnapshot; onRefresh: () => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [activity, setActivity] = useState<TrustCentreRow[]>([]);
  const canTriage = snapshot.capabilities.includes("triage");
  async function act(action: string) {
    if (!selected.length) return;
    setBusy(true); setStatus("Applying audited alert action…");
    try {
      const response = await fetch("/api/trust-centre/alerts/bulk", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Enterprise-Id": snapshot.organisation.id },
        body: JSON.stringify({ alertIds: selected, action, note, assignedTo: assignee || undefined }),
      });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(body.error ?? "Action failed"));
      setSelected([]); setNote(""); setStatus("Alert action recorded in the immutable audit trail.");
      await onRefresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Alert action failed safely."); }
    finally { setBusy(false); }
  }
  async function loadActivity(alertId: string) {
    setStatus("Loading alert audit trail…");
    try {
      const response = await fetch(`/api/trust-centre/alerts/${alertId}/activity`, {
        cache: "no-store",
        headers: { "X-Enterprise-Id": snapshot.organisation.id },
      });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(String(body.error ?? "Audit trail unavailable"));
      const rows = Array.isArray(body.activity) ? body.activity as TrustCentreRow[] : [];
      setActivity(rows); setStatus(`${rows.length} audit entr${rows.length === 1 ? "y" : "ies"} loaded.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Audit trail unavailable."); }
  }
  return (
    <section className={panel}>
      <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-lg font-semibold">Enterprise alerts</h2><p className="mt-1 text-sm text-zinc-400">Select up to 100 alerts for a tenant-scoped audited action.</p></div><StatePill value={snapshot.organisation.role} /></div>
      <div className="mt-5 flex flex-wrap gap-2">
        {["acknowledge", "investigating", "resolved", "dismissed"].map((action) => <button className={subtleButton} disabled={!canTriage || !selected.length || busy} key={action} onClick={() => void act(action)} type="button">{action}</button>)}
        <button className={subtleButton} disabled={!snapshot.capabilities.includes("comment") || !selected.length || busy || !note.trim()} onClick={() => void act("comment")} type="button">Add comment</button>
      </div>
      {snapshot.capabilities.includes("assign") ? <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex-1 text-sm">Assignee user ID<input className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2" value={assignee} onChange={(event) => setAssignee(event.target.value)} /></label><button className={subtleButton} disabled={!selected.length || busy || !assignee} onClick={() => void act("assign")} type="button">Assign selected</button></div> : null}
      <label className="mt-4 block text-sm">Action note<textarea className="mt-1 min-h-20 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <p className="mt-2 text-xs text-zinc-500" role="status" aria-live="polite">{status || (!canTriage ? "Your role has read-only alert access." : `${selected.length} selected.`)}</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="pb-3"><span className="sr-only">Select</span></th><th className="pb-3">Alert</th><th className="pb-3">Entity</th><th className="pb-3">Severity</th><th className="pb-3">State</th><th className="pb-3">Assigned</th><th className="pb-3">Detected</th><th className="pb-3">Audit</th></tr></thead><tbody>{snapshot.alerts.map((row) => { const id = String(row.id); return <tr className="border-t border-white/10" key={id}><td className="py-3"><input aria-label={`Select alert ${text(row.alert_type)}`} type="checkbox" checked={selected.includes(id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, id].slice(0, 100) : current.filter((item) => item !== id))} /></td><td>{text(row.alert_type).replaceAll("_", " ")}</td><td>{text(row.subject_reference)}</td><td><StatePill value={row.severity} /></td><td><StatePill value={row.status} /></td><td>{text(row.assigned_to, "Unassigned")}</td><td>{when(row.detected_at)}</td><td><button className={subtleButton} type="button" onClick={() => void loadActivity(id)}>Activity</button></td></tr>; })}</tbody></table>{!snapshot.alerts.length ? <Empty>No enterprise alerts are present.</Empty> : null}</div>
      {activity.length ? <div className="mt-6 rounded-xl border border-white/10 p-4"><h3 className="font-medium">Alert audit trail</h3><ol className="mt-3 space-y-3">{activity.map((row) => <li className="border-l border-cyan-400/40 pl-3 text-sm" key={String(row.activity_id)}><span className="font-medium">{text(row.action)}</span><span className="text-zinc-500"> · {when(row.created_at)} · actor {text(row.actor_id)}</span>{row.note ? <p className="mt-1 text-zinc-300">{text(row.note)}</p> : null}</li>)}</ol></div> : null}
    </section>
  );
}

function Policies({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  const [decisionId, setDecisionId] = useState("");
  const [mode, setMode] = useState("HISTORICAL_REPLAY");
  const [result, setResult] = useState("");
  async function simulate(event: React.FormEvent) {
    event.preventDefault();
    setResult("Running non-mutating simulation…");
    try {
      const response = await fetch("/api/trust-architecture/simulations", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Enterprise-Id": snapshot.organisation.id },
        body: JSON.stringify({ mode, decisionId, overrides: {} }),
      });
      const body = await response.json() as Record<string, unknown>;
      setResult(response.ok ? JSON.stringify(body.simulation, null, 2) : String(body.error ?? "Simulation failed safely."));
    } catch { setResult("Simulation failed safely."); }
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className={panel}><h2 className="text-lg font-semibold">Policy Centre</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="pb-3">Policy</th><th className="pb-3">Status</th><th className="pb-3">Version</th><th className="pb-3">Domain</th><th className="pb-3">Trigger count</th><th className="pb-3">Recent decision</th><th className="pb-3">Effective</th></tr></thead><tbody>{snapshot.policies.map((row) => <tr className="border-t border-white/10" key={String(row.policy_version_id)}><td className="py-3">{text(row.policy_id)}</td><td><StatePill value={row.active ? "active" : "inactive"} /></td><td>{text(row.version)}</td><td>{text(row.domain_key, "Enterprise")}</td><td>{text(row.trigger_count, "0")}</td><td>{when(row.recent_decision_at)}</td><td>{when(row.valid_from)}</td></tr>)}</tbody></table>{!snapshot.policies.length ? <Empty>No applicable policies are available.</Empty> : null}</div></section>
      <section className={panel}><h2 className="text-lg font-semibold">Policy outcome simulation</h2><p className="mt-2 text-sm text-zinc-400">Hash-addressed simulation only. Production trust state is never mutated.</p>{snapshot.capabilities.includes("simulate") ? <form className="mt-5 space-y-4" onSubmit={simulate}><label className="block text-sm">Mode<select className="mt-1 w-full rounded-lg border border-white/15 bg-[#0b111a] px-3 py-2" value={mode} onChange={(event) => setMode(event.target.value)}><option>HISTORICAL_REPLAY</option><option>POLICY_SIMULATION</option><option>PROVIDER_OUTAGE_SIMULATION</option><option>EVIDENCE_EXCLUSION_SIMULATION</option></select></label><label className="block text-sm">Decision ID<input required className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2" value={decisionId} onChange={(event) => setDecisionId(event.target.value)} /></label><button className={primaryButton} type="submit">Run simulation</button></form> : <Empty>Administrator access is required to simulate policy outcomes.</Empty>}{result ? <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-zinc-300">{result}</pre> : null}</section>
    </div>
  );
}

function Providers({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  return (
    <section className={panel}><h2 className="text-lg font-semibold">Provider operations</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="pb-3">Provider</th><th className="pb-3">Status</th><th className="pb-3">Latency</th><th className="pb-3">Availability</th><th className="pb-3">Confidence</th><th className="pb-3">Failure rate</th><th className="pb-3">Last successful verification</th></tr></thead><tbody>{snapshot.providerHealth.map((row) => <tr className="border-t border-white/10" key={String(row.providerKey)}><td className="py-3">{text(row.providerKey)}</td><td><StatePill value={row.state} /></td><td>{row.latencyMs === null ? "Not measured" : `${row.latencyMs} ms`}</td><td>{row.circuitOpen ? "Circuit open" : "Circuit closed"}</td><td>Not measured</td><td>{row.errorRate === null ? "Not measured" : `${Math.round(Number(row.errorRate) * 100)}%`}</td><td>{String(row.state).toUpperCase() === "HEALTHY" ? when(row.observedAt) : "Not recorded"}</td></tr>)}</tbody></table>{!snapshot.providerHealth.length ? <Empty>Provider health history is awaiting measured snapshots.</Empty> : null}</div></section>
  );
}

function Reports({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  const [report, setReport] = useState("trust-summary");
  const [format, setFormat] = useState("pdf");
  const [status, setStatus] = useState("");
  async function download() {
    setStatus("Generating tenant-scoped report…");
    try {
      const response = await fetch(`/api/trust-centre/reports?report=${report}&format=${format}`, { cache: "no-store", headers: { "X-Enterprise-Id": snapshot.organisation.id } });
      if (!response.ok) throw new Error("Report generation failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `cyber-sentinels-${report}.${format}`; anchor.click();
      URL.revokeObjectURL(url); setStatus("Report generated.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Report generation failed."); }
  }
  return (
    <section className={`${panel} max-w-3xl`}><h2 className="text-lg font-semibold">Enterprise reporting</h2><p className="mt-2 text-sm text-zinc-400">Exports include only the authenticated tenant read model and are generated on demand.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm">Report<select className="mt-1 w-full rounded-lg border border-white/15 bg-[#0b111a] px-3 py-2" value={report} onChange={(event) => setReport(event.target.value)}><option value="trust-summary">Trust Summary</option><option value="risk-summary">Risk Summary</option><option value="evidence">Evidence Report</option><option value="replay">Replay Report</option><option value="trust-drift">Trust Drift Report</option><option value="policy">Policy Report</option></select></label><label className="text-sm">Format<select className="mt-1 w-full rounded-lg border border-white/15 bg-[#0b111a] px-3 py-2" value={format} onChange={(event) => setFormat(event.target.value)}><option value="pdf">PDF</option><option value="csv">CSV</option><option value="json">JSON</option></select></label></div><button className={`${primaryButton} mt-5`} type="button" onClick={() => void download()}>Generate report</button><p className="mt-3 text-xs text-zinc-500" role="status" aria-live="polite">{status}</p></section>
  );
}

function EnterpriseSearch({ snapshot }: { snapshot: TrustCentreSnapshot }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrustCentreSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setStatus(""); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("Searching…");
      fetch(`/api/trust-centre/search?q=${encodeURIComponent(query)}&limit=20`, {
        cache: "no-store", signal: controller.signal,
        headers: { "X-Enterprise-Id": snapshot.organisation.id },
      }).then(async (response) => {
        const body = await response.json() as Record<string, unknown>;
        if (!response.ok) throw new Error(String(body.error ?? "Search failed"));
        const next = Array.isArray(body.results) ? body.results as TrustCentreSearchResult[] : [];
        setResults(next); setOpen(true); setStatus(`${next.length} result${next.length === 1 ? "" : "s"}.`);
      }).catch((error) => { if (error instanceof Error && error.name !== "AbortError") setStatus("Search failed safely."); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, snapshot.organisation.id]);
  return (
    <div className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor="enterprise-search">Search enterprise trust records</label>
      <input id="enterprise-search" className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400" placeholder="Search people, agents, devices, evidence, Replay, policies…" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} />
      <span className="sr-only" role="status" aria-live="polite">{status}</span>
      {open && query.length >= 2 ? <div className="absolute z-30 mt-2 max-h-96 w-full overflow-auto rounded-xl border border-white/15 bg-[#0a1018] p-2 shadow-2xl"><div role="listbox" aria-label="Enterprise search results">{results.map((result) => <Link role="option" className="block rounded-lg p-3 hover:bg-white/5 focus:bg-white/5 focus:outline-none" href={result.href} key={`${result.type}:${result.id}`} onClick={() => setOpen(false)}><span className="text-xs uppercase text-cyan-300">{result.type.replaceAll("_", " ")}</span><span className="mt-1 block font-medium">{result.label}</span><span className="mt-1 block text-xs text-zinc-500">{result.description}</span></Link>)}{!results.length ? <Empty>No protected records match this query.</Empty> : null}</div></div> : null}
    </div>
  );
}

function OperationalIntelligenceView({ scenario }: { scenario: OperationalIntelligenceScenario }) {
  const counts = scenario.network.counts;
  const entityHref = `/operational-entities/${encodeURIComponent(scenario.alpha.entityId)}`;
  const cards = [
    ["Healthy", counts.HEALTHY], ["Watch", counts.WATCH], ["Degraded", counts.DEGRADED],
    ["Review Required", counts.REVIEW_REQUIRED], ["Suspended", counts.SUSPENDED], ["Unknown", counts.UNKNOWN],
  ];
  const changes = [
    ["Material Drift", scenario.changes.filter((event) => ["HIGH", "CRITICAL"].includes(event.materiality)).length],
    ["Authority Changes", scenario.changes.filter((event) => event.changeType.startsWith("AUTHORITY_")).length],
    ["Provider Changes", scenario.changes.filter((event) => event.changeType === "PROVIDER_CHANGED").length],
    ["Evidence Conflicts", scenario.changes.filter((event) => event.changeType === "EVIDENCE_CONTRADICTED").length],
    ["Outcome Contradictions", scenario.changes.filter((event) => event.changeType === "OUTCOME_CONTRADICTED").length],
  ];
  const attention = [
    ["Human Review", scenario.criticalDecision === "REVIEW" ? 1 : 0],
    ["Expiring Authority", scenario.network.expiringAuthority.length],
    ["Stale Evidence", scenario.network.staleEvidence.length],
    ["Open Incidents", scenario.network.involvedInIncidents.length],
    ["Recovery Pending", scenario.network.awaitingRecovery.length],
  ];
  return (
    <div className="space-y-6">
      <section className={panel}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Controlled deterministic scenario · Derived only</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">Operational Trust Command View</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Answers what changed, why it matters, which entities are affected, the supporting evidence, whether trust continues, and the bounded next action. No live provider or Production-scale claim is made.</p></div><Link className={subtleButton} href={entityHref}>Open Agent Alpha intelligence</Link></div>
      </section>
      <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Operational entities</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{cards.map(([label, value]) => <Link href={entityHref} key={String(label)} className={panel}><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-3xl font-semibold text-cyan-100">{value}</p></Link>)}</div></section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className={panel}><h2 className="text-lg font-semibold">Trust changes</h2><div className="mt-4 space-y-3">{changes.map(([label, value]) => <Link href={entityHref} key={String(label)} className="flex justify-between rounded-xl border border-white/10 p-3"><span>{label}</span><strong>{value}</strong></Link>)}</div></section>
        <section className={panel}><h2 className="text-lg font-semibold">Attention required</h2><div className="mt-4 space-y-3">{attention.map(([label, value]) => <Link href={entityHref} key={String(label)} className="flex justify-between rounded-xl border border-white/10 p-3"><span>{label}</span><strong>{value}</strong></Link>)}</div></section>
      </div>
      <section className={panel}><h2 className="text-lg font-semibold">Network impact</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><div><p className="text-xs text-zinc-500">Affected entities</p><p className="mt-2 text-2xl font-semibold">{scenario.blastRadius.affectedOperationalEntities.length}</p></div><div><p className="text-xs text-zinc-500">Blast-radius findings</p><p className="mt-2 text-2xl font-semibold">{scenario.blastRadius.impacts.length}</p></div><div><p className="text-xs text-zinc-500">Trust Cascade</p><p className="mt-2 text-2xl font-semibold">{scenario.resolvedCascade.resolved ? "Resolved" : "Active"}</p></div></div><p className="mt-4 text-sm text-zinc-400">Workflow Delta moved to REVIEW_REQUIRED because its deployment approval depends on Agent Alpha. Each cascade edge retains canonical evidence, cycle detection, and maximum traversal depth.</p></section>
    </div>
  );
}

export function EnterpriseTrustCentre({ initialSnapshot, operationalIntelligence }: { initialSnapshot: TrustCentreSnapshot; operationalIntelligence: OperationalIntelligenceScenario }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [view, setView] = useState<View>("overview");
  const [connection, setConnection] = useState<"live" | "refreshing" | "degraded">("live");
  const lastUpdated = useMemo(() => when(snapshot.generatedAt), [snapshot.generatedAt]);
  async function refresh() {
    setConnection("refreshing");
    try {
      const response = await fetch("/api/trust-centre/overview?limit=100", {
        cache: "no-store",
        headers: { "X-Enterprise-Id": snapshot.organisation.id },
      });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok || !body.snapshot) throw new Error("refresh_failed");
      setSnapshot(body.snapshot as TrustCentreSnapshot); setConnection("live");
    } catch { setConnection("degraded"); }
  }
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    return () => window.clearInterval(timer);
  // The tenant never changes within a mounted Trust Centre.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.organisation.id]);
  return (
    <div className="space-y-7">
      <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_40%),rgba(255,255,255,0.025)] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Enterprise Trust Centre™</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Operational trust, one evidence-backed view</h1><p className="mt-3 max-w-3xl leading-7 text-zinc-400">Security, identity, risk and compliance operations across authoritative Trust Graph, evidence, Replay, policy and continuous trust records.</p><Link href="/trust-centre/fabric" className="mt-4 inline-flex rounded-lg border border-cyan-400/40 px-3 py-2 text-sm text-cyan-100 hover:border-cyan-300">Open Enterprise Trust Fabric™</Link></div>
          <EnterpriseSearch snapshot={snapshot} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500"><StatePill value={connection} /><span>Last refreshed {lastUpdated}</span><span>·</span><span>{snapshot.organisation.name}</span><button type="button" className={subtleButton} onClick={() => void refresh()}>Refresh now</button></div>
      </header>
      <nav className="overflow-x-auto" aria-label="Trust Centre sections"><div className="flex min-w-max gap-2" role="tablist">{views.map((item) => <button type="button" role="tab" aria-selected={view === item.id} aria-controls={`trust-centre-${item.id}`} id={`trust-centre-tab-${item.id}`} className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${view === item.id ? "bg-cyan-300 font-semibold text-black" : "border border-white/10 text-zinc-300 hover:border-white/25"}`} onClick={() => setView(item.id)} key={item.id}>{item.label}</button>)}</div></nav>
      <div role="tabpanel" id={`trust-centre-${view}`} aria-labelledby={`trust-centre-tab-${view}`} tabIndex={0}>
        {view === "overview" ? <Overview snapshot={snapshot} /> : null}
        {view === "intelligence" ? <OperationalIntelligenceView scenario={operationalIntelligence} /> : null}
        {view === "graph" ? <GraphExplorer snapshot={snapshot} /> : null}
        {view === "dna" ? <TrustDna snapshot={snapshot} /> : null}
        {view === "replay" ? <ReplayViewer snapshot={snapshot} /> : null}
        {view === "continuous" ? <ContinuousTrust snapshot={snapshot} /> : null}
        {view === "alerts" ? <Alerts snapshot={snapshot} onRefresh={refresh} /> : null}
        {view === "policies" ? <Policies snapshot={snapshot} /> : null}
        {view === "providers" ? <Providers snapshot={snapshot} /> : null}
        {view === "reports" ? <Reports snapshot={snapshot} /> : null}
      </div>
    </div>
  );
}
