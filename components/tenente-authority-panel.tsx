"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TenenteAuthorityPanel({ enterpriseId, entityId, delegations, canAdminister }: {
  enterpriseId: string; entityId: string; delegations: Record<string, unknown>[]; canAdminister: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function restrict(delegationId: string, operation: "SUSPEND" | "REVOKE") {
    if (pending || !reason.trim()) return;
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/operational-entities/${encodeURIComponent(entityId)}/delegated-authority`, {
        method: "POST", headers: { "content-type": "application/json", "x-enterprise-id": enterpriseId },
        body: JSON.stringify({ action: "restrict_tenente_authority", delegationId, operation, reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Authority restriction was not accepted.");
      setMessage(`Authority ${operation === "SUSPEND" ? "suspended" : "revoked"}. Audit evidence: ${result.result.evidenceReference}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Authority operation failed."); }
    finally { setPending(false); }
  }
  return <section aria-labelledby="tenente-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 id="tenente-title" className="text-xl font-semibold">TENENTE™ · Delegated authority</h2>
    <p className="mt-2 text-sm text-slate-600">Authority is checked again for each action. Suspended, expired or revoked authority cannot permit a new execution. Historical decisions remain available in Replay.</p>
    {canAdminister && <label className="mt-4 block text-sm font-medium">Reason for restriction
      <input value={reason} onChange={event => setReason(event.target.value)} maxLength={500} disabled={pending} className="mt-1 block w-full rounded border border-slate-300 p-2" placeholder="Record why authority must be restricted" />
    </label>}
    {!delegations.length ? <p className="mt-4 text-sm">No delegated authority recorded for this entity.</p> : <ul className="mt-4 space-y-4">
      {delegations.map(item => <li key={String(item.delegation_id)} className="rounded border border-slate-200 p-4">
        <p className="font-medium">{String(item.delegator_operational_entity_id)} → {String(item.delegate_operational_entity_id)}</p>
        <dl className="mt-2 grid gap-1 text-sm"><div><dt className="inline font-medium">State: </dt><dd className="inline">{String(item.status)}</dd></div>
          <div><dt className="inline font-medium">Actions: </dt><dd className="inline">{(item.permitted_actions as string[] ?? []).join(", ")}</dd></div>
          <div><dt className="inline font-medium">Resources: </dt><dd className="inline">{(item.permitted_targets as string[] ?? []).join(", ")}</dd></div>
          <div><dt className="inline font-medium">Expires: </dt><dd className="inline">{String(item.expires_at)}</dd></div>
          <div><dt className="inline font-medium">Authority evidence: </dt><dd className="inline break-all">delegation:{String(item.delegation_id)}</dd></div></dl>
        {canAdminister && ["ACTIVE", "PENDING", "SUSPENDED"].includes(String(item.status)) && <div className="mt-3 flex gap-3">
          <button disabled={pending || !reason.trim() || item.status === "SUSPENDED"} onClick={() => restrict(String(item.delegation_id), "SUSPEND")} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Suspend authority</button>
          <button disabled={pending || !reason.trim()} onClick={() => restrict(String(item.delegation_id), "REVOKE")} className="rounded border border-red-300 px-3 py-2 text-sm text-red-800 disabled:opacity-50">Revoke authority</button>
        </div>}
      </li>)}
    </ul>}
    <p role="status" aria-live="polite" className="mt-3 text-sm">{message}</p>
    <p className="mt-3 text-xs text-slate-600">To narrow a signed grant, revoke it and issue a new bounded delegation through the existing authority workflow. Signed scope is never edited in place.</p>
  </section>;
}
