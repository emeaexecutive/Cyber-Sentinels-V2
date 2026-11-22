"use client";

import { useState } from "react";
import type { swarmOperations } from "@/lib/swarm/operations";
type Snapshot = Awaited<ReturnType<ReturnType<typeof swarmOperations>["snapshot"]>>;
const money = (minor: number) => new Intl.NumberFormat("en", { style: "currency", currency: "EUR" }).format(minor / 100);

export default function SwarmConsole() {
  const [enterprise, setEnterprise] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [kind, setKind] = useState("swarm"), [scope, setScope] = useState(""), [reason, setReason] = useState("");
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [receipt, setReceipt] = useState(""), [provision, setProvision] = useState(""), [signedCommand, setSignedCommand] = useState("");
  const [warning, setWarning] = useState(""), [alertDigest, setAlertDigest] = useState("");
  const [socRole, setSocRole] = useState("TORCH"), [ownerId, setOwnerId] = useState("");
  const [falsePositive, setFalsePositive] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function load() {
    setSnapshot(null);
    const response = await fetch("/api/tenente/swarm", { headers: { "x-enterprise-id": enterprise }, cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Unable to load operations.");
    setSnapshot(body.snapshot);
  }
  async function perform(action?: "soc-register" | "soc-ingest" | "soc-investigate" | "soc-feedback" | "cancel" | "reconcile-cancellation" | "contain" | "reconcile" | "revoke" | "restore-member" | "restore-scope" | "provision" | "signed-command" | "enroll-runtime") {
    setBusy(true); setMessage("");
    try {
      if (action) {
        const response = await fetch("/api/tenente/swarm", { method: "POST", headers: { "content-type": "application/json", "x-enterprise-id": enterprise }, body: JSON.stringify({ kind, id: scope, reason, receipt, publicKeyPem, ...(action === "provision" ? JSON.parse(provision) : {}), ...(["signed-command", "cancel", "reconcile-cancellation"].includes(action) ? { envelope: JSON.parse(signedCommand) } : {}), ...(action === "soc-ingest" ? { envelope: JSON.parse(warning) } : {}), ...(action === "soc-register" ? { role: socRole, ownerId } : {}), ...(["soc-investigate", "soc-feedback"].includes(action) ? { alertDigest, falsePositive } : {}), action }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Operation failed.");
        setMessage(`Recorded ${body.receipt.cancellationStatus ?? body.receipt.kind}. Receipt: ${body.receipt.digest}`);
      }
      await load();
    } catch (error) { setSnapshot(null); setMessage(error instanceof Error ? error.message : "Operations unavailable."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void perform(); }}>
      <label className="grid gap-1">Workspace identifier<input className="rounded border bg-transparent p-2" required value={enterprise} onChange={e => { setEnterprise(e.target.value); setSnapshot(null); }} disabled={busy} /></label>
      <button className="rounded border px-4 py-2" disabled={busy}>Load current state</button>
    </form>
    <p role="status" className="break-all">{busy ? "Checking current state…" : message}</p>
    {snapshot && <>
      <section className="space-y-2"><h2 className="text-xl font-semibold">Swarm authority</h2>{snapshot.collectives.map(s => <article key={s.id} className="rounded border p-3"><h3>{s.id} · {s.state}</h3><p>Orchestrator: {s.orchestratorId ?? "Not recorded"} · Responsible principal: {s.responsiblePrincipalId ?? "Not recorded"}</p><p>Authority: {s.originalAuthority} · Workflow: {s.workflowId}</p><p>Tools: {s.executionPolicy?.allowedTools.join(", ") ?? "Policy not provisioned"} · Environments: {s.executionPolicy?.environments.join(", ") ?? "Policy not provisioned"}</p></article>)}</section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Shared budgets</h2>
        <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Budget", "Limit", "Reserved", "Spent", "Parallel limit"].map(s => <th className="p-2" key={s}>{s}</th>)}</tr></thead><tbody>{Object.entries(snapshot.budgets).map(([id, b]) => <tr key={id}><td className="p-2">{id}</td><td>{money(b.limitMinor)}</td><td>{money(b.reservedMinor)}</td><td>{money(b.spentMinor)}</td><td>{b.maxParallel}</td></tr>)}</tbody></table></div>
        {!Object.keys(snapshot.budgets).length && <p>No shared budgets recorded.</p>}
      </section>
      <section><h2 className="text-xl font-semibold">Members and execution</h2><ul>{snapshot.members.map(m => <li key={m.id}>{m.id}: {m.state} · {m.swarmId} · Parent: {m.parentId ?? "Root member"}</li>)}</ul><ul>{snapshot.leases.map(l => <li className="break-all" key={l.id}>{l.memberId}: {l.state} ? Task: {l.taskId} · {l.id}</li>)}</ul></section>
      <section className="space-y-3" aria-label="SOC incident evidence"><h2 className="text-xl font-semibold">SOC incident timeline</h2>
        <p>{snapshot.soc.totalAlerts} authenticated synthetic alerts. Copilot: {snapshot.soc.modelConfigured ? "Configured; individual run evidence below" : "Not configured"}. Response dispatch requires a qualified destination adapter.</p>
        <p>Owners and administrators can register an enrolled agent, verify a signed synthetic warning, investigate recorded evidence and submit analyst feedback. These controls do not dispatch a response.</p>
        <form className="grid gap-3 rounded border p-3" onSubmit={e => { e.preventDefault(); void perform("soc-register"); }}>
          <label className="grid gap-1">SOC agent role<select className="rounded border bg-black p-2" value={socRole} onChange={e => setSocRole(e.target.value)} disabled={busy}>{["TORCH", "Swarm Investigator", "Sentinel Intelligence", "Authority Guardian", "CHIRIVETA", "TENENTE", "Sentinel Copilot"].map(role => <option key={role}>{role}</option>)}</select></label>
          <label className="grid gap-1">Responsible owner identifier<input className="rounded border bg-transparent p-2" required maxLength={240} value={ownerId} onChange={e => setOwnerId(e.target.value)} disabled={busy} /></label>
          <button className="rounded border p-2" disabled={busy || !ownerId.trim()}>Register enrolled SOC agent</button>
        </form>
        <form className="grid gap-3 rounded border p-3" onSubmit={e => { e.preventDefault(); void perform("soc-ingest"); }}>
          <label className="grid gap-1">Signed synthetic warning envelope<textarea className="min-h-32 rounded border bg-transparent p-2" required maxLength={4096} value={warning} onChange={e => setWarning(e.target.value)} disabled={busy} /></label>
          <button className="rounded border p-2" disabled={busy || !warning.trim()}>Verify and ingest warning</button>
        </form>
        <form className="grid gap-3 rounded border p-3" onSubmit={e => { e.preventDefault(); void perform("soc-investigate"); }}>
          <label className="grid gap-1">Alert evidence digest<input className="rounded border bg-transparent p-2" required pattern="[a-f0-9]{64}" maxLength={64} value={alertDigest} onChange={e => setAlertDigest(e.target.value)} disabled={busy} /></label>
          <button className="rounded border p-2" disabled={busy || !/^[a-f0-9]{64}$/.test(alertDigest)}>Investigate alert evidence</button>
          <label className="flex items-center gap-2"><input type="checkbox" checked={falsePositive} onChange={e => setFalsePositive(e.target.checked)} disabled={busy} />Analyst assessment: false positive</label>
          <button type="button" className="rounded border p-2" disabled={busy || !/^[a-f0-9]{64}$/.test(alertDigest)} onClick={() => void perform("soc-feedback")}>Record analyst feedback</button>
        </form>
        <ol className="space-y-3">{snapshot.soc.timeline.map(event => <li className="break-all rounded border p-3" key={event.digest}><strong>{event.kind}</strong> · {event.subjectId}<p>{new Date(event.at).toISOString()} · {event.actorId}</p><details><summary>Verifiable record</summary><p>Receipt: {event.digest}</p><pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre></details></li>)}</ol>
        {!snapshot.soc.timeline.length && <p>No SOC incident evidence has been recorded in this workspace.</p>}
      </section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Emergency containment</h2><p>Only workspace owners and administrators can contain a scope. This does not undo external effects or rotate external credentials.</p>
        <form className="grid gap-3" onSubmit={e => { e.preventDefault(); void perform("contain"); }}>
          <label>Scope <select className="rounded border bg-black p-2" value={kind} onChange={e => setKind(e.target.value)} disabled={busy}>{["swarm", "agent", "chain", "workflow"].map(k => <option key={k}>{k}</option>)}</select></label>
          <label className="grid gap-1">Scope identifier<input className="rounded border bg-transparent p-2" required maxLength={240} value={scope} onChange={e => setScope(e.target.value)} disabled={busy} /></label>
          <label className="grid gap-1">Reason<textarea className="rounded border bg-transparent p-2" required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label>
          <button className="rounded border border-red-400 p-2" disabled={busy}>Contain scope</button>
        </form>
        <button className="rounded border p-2" disabled={busy} onClick={() => void perform("reconcile")}>Reconcile expired leases and heartbeats</button>
        <button className="rounded border border-red-400 p-2" disabled={busy || kind !== "agent" || !scope || !reason.trim()} onClick={() => void perform("revoke")}>Revoke selected agent and descendants</button>
        <ul>{snapshot.quarantines.map(q => <li className="break-all" key={q.receipt}>{q.kind}: {q.id} · receipt {q.receipt}</li>)}</ul>
      </section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Independent recovery</h2>
        <p>Recovery requires a different authorized operator and reconciled outcomes. Members still need fresh credentials and a verified heartbeat.</p>
        <label className="grid gap-1">Containment receipt<input className="rounded border bg-transparent p-2" value={receipt} onChange={e => setReceipt(e.target.value)} disabled={busy} /></label>
        <button className="rounded border p-2" disabled={busy || !receipt} onClick={() => void perform("restore-scope")}>Review scope restoration</button>
        <button className="rounded border p-2" disabled={busy || !receipt || !scope} onClick={() => void perform("restore-member")}>Restore selected member</button>
      </section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Provision approved membership and tasks</h2>
        <p>Membership and policy restrict existing authority; they cannot create it. Existing collective policy is immutable.</p>
        <label className="grid gap-1">Approved collective and member JSON<textarea className="min-h-32 rounded border bg-transparent p-2" value={provision} onChange={e => setProvision(e.target.value)} disabled={busy} /></label>
        <button className="rounded border p-2" disabled={busy || !provision} onClick={() => void perform("provision")}>Provision membership</button>
        {snapshot.collectives.flatMap(c => (c.executionPolicy?.tasks ?? []).map(t => <p className="break-all" key={c.id + t.id}>{t.id}: {t.memberId} | Parent task: {t.parentTaskId ?? "Independent"} | Transaction: {t.transactionId}</p>))}
      </section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Runtime public-key enrollment</h2>
        <p>Enroll a fresh Ed25519 public key for the selected active member. The agent retains its private key. Enrollment resets heartbeat freshness and advances the credential generation.</p>
        <label className="grid gap-1">Public key PEM<textarea className="min-h-32 rounded border bg-transparent p-2" value={publicKeyPem} onChange={e => setPublicKeyPem(e.target.value)} disabled={busy} /></label>
        <button className="rounded border p-2" disabled={busy || !scope || !publicKeyPem} onClick={() => void perform("enroll-runtime")}>Enroll runtime public key</button>
      </section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Signed containment command</h2>
        <p>Paste a time-bound command signed by an approved operator. Never paste a private key.</p>
        <label className="grid gap-1">Signed command envelope<textarea className="min-h-32 rounded border bg-transparent p-2" value={signedCommand} onChange={e => setSignedCommand(e.target.value)} disabled={busy} /></label>
        <button className="rounded border border-red-400 p-2" disabled={busy || !signedCommand} onClick={() => void perform("signed-command")}>Verify and apply containment</button>
      </section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Controlled runtime cancellation</h2><p>Use the signed envelope field above with a cancellation command bound to the task and execution identifiers. In-flight transport aborts remain unconfirmed unless verified outcome evidence resolves them.</p><button className="rounded border p-2" disabled={busy || !signedCommand} onClick={() => void perform("cancel")}>Request signed cancellation</button><button className="rounded border p-2" disabled={busy || !signedCommand} onClick={() => void perform("reconcile-cancellation")}>Reconcile cancellation outcome</button></section>
      <section><h2 className="text-xl font-semibold">Coordinated denial alerts</h2><p>Recommendations do not grant authority or automatically stop external runtimes.</p><ul>{snapshot.anomalies.map(a => <li className="break-all" key={a.evidence[0]}>{a.recommendedLevel}: {a.evidence.length} correlated denials. Evidence: {a.evidence.join(", ")}</li>)}</ul></section>
      <section><h2 className="text-xl font-semibold">Recent receipts</h2><p>Showing the latest {snapshot.receipts.length} of {snapshot.totalReceipts} receipts.</p><ol>{snapshot.receipts.map(r => <li className="break-all" key={r.digest}>{r.sequence}. {r.cancellationStatus ?? r.kind} · {new Date(r.at).toISOString()} · {r.digest}</li>)}</ol></section>
    </>}
  </div>;
}
