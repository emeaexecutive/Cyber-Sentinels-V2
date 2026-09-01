"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Key = {
  id: string;
  label: string;
  key_prefix: string;
  status: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

const allScopes = ["agents:write", "agents:verify", "authority:read", "authority:write", "trust:request", "trust:read", "evidence:write", "outcomes:write", "review:read", "review:write"];
const presets = {
  AGENT_RUNTIME: ["agents:write", "agents:verify", "authority:read", "trust:request", "trust:read", "outcomes:write"],
  CUSTOMER_ZERO_ADMIN: ["agents:write", "agents:verify", "authority:read", "authority:write", "trust:request", "trust:read", "outcomes:write", "review:read", "review:write"],
  APPLICATION: ["trust:request", "trust:read", "outcomes:write"],
  EVIDENCE_PROVIDER: ["evidence:write", "trust:read"],
  ROBOTICS_RUNTIME: ["authority:read", "trust:request", "trust:read", "evidence:write", "outcomes:write"],
  READ_ONLY_AUDITOR: ["authority:read", "trust:read"],
} as const;
const scopePurpose: Record<string, string> = {
  "agents:write": "Register Gamma, credentials, and manifests",
  "agents:verify": "Issue challenges and submit proof of possession",
  "authority:read": "Read Gamma's effective authority",
  "authority:write": "Owner/admin grant and revoke within an explicit management boundary",
  "trust:request": "Request canonical ALLOW, REVIEW, or DENY decisions",
  "trust:read": "Retrieve transactions, Replay, receipts, and trust state",
  "evidence:write": "Submit provider-attributed evidence without decision authority",
  "outcomes:write": "Submit explicitly classified outcome assertions",
  "review:read": "Read client-owned governed REVIEW records",
  "review:write": "Owner/admin/reviewer resolve REVIEW without mutating the original decision",
};
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "Never";

export function ApiKeyManager({ enterpriseId }: { enterpriseId: string }) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...presets.AGENT_RUNTIME]);
  const [message, setMessage] = useState("Loading tenant API clients…");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const pendingRotations = useRef(new Map<string, string>());

  const load = useCallback(async () => {
    const response = await fetch("/api/developer/api-keys", {
      cache: "no-store",
      headers: { "x-enterprise-id": enterpriseId },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "API key list failed");
    setKeys(body.keys ?? []);
    setMessage(body.keys?.length ? "" : "No external API clients yet.");
  }, [enterpriseId]);
  useEffect(() => { void load().catch(() => setMessage("API keys are temporarily unavailable.")); }, [load]);

  const create = async (formData: FormData) => {
    setSecret(null);
    const requestedScopes = allScopes.filter((scope) => formData.getAll("scopes").includes(scope));
    const references = (name: string) => String(formData.get(name) ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const authorityManagementBoundary = requestedScopes.includes("authority:write") ? {
      actions: references("authority_actions"),
      target_prefixes: references("authority_target_prefixes"),
      purposes: references("authority_purposes"),
      environments: references("authority_environments"),
      max_ttl_seconds: Number(formData.get("authority_max_ttl_seconds")),
    } : undefined;
    try {
      const response = await fetch("/api/developer/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json", "x-enterprise-id": enterpriseId },
        body: JSON.stringify({
          label: formData.get("label"),
          environment: formData.get("environment"),
          scopes: requestedScopes,
          authority_management_boundary: authorityManagementBoundary,
        }),
      });
      const body = await response.json() as { error?: string; api_key?: string };
      if (!response.ok || !body.api_key) { setMessage(`Creation failed: ${body.error ?? "API_KEY_CREATE_UNAVAILABLE"}`); return; }
      setSecret(body.api_key);
      setMessage("API key created. Copy it now; it cannot be displayed again.");
      await load();
    } catch {
      setMessage("Creation could not be confirmed. Check the list before trying again.");
    }
  };

  const mutate = async (keyId: string, action: "revoke" | "rotate") => {
    setSecret(null);
    setBusyKey(keyId);
    const storageKey = `cyber-sentinels:api-key-rotation:${keyId}`;
    const storedRotation = action === "rotate" ? globalThis.sessionStorage?.getItem(storageKey) : null;
    const rotationRequestId = action === "rotate"
      ? pendingRotations.current.get(keyId) ?? storedRotation ?? crypto.randomUUID()
      : undefined;
    if (rotationRequestId) {
      pendingRotations.current.set(keyId, rotationRequestId);
      globalThis.sessionStorage?.setItem(storageKey, rotationRequestId);
    }
    try {
      const response = await fetch("/api/developer/api-keys", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-enterprise-id": enterpriseId },
        body: JSON.stringify({ key_id: keyId, action, rotation_request_id: rotationRequestId }),
      });
      const body = await response.json() as { error?: string; api_key?: string; idempotent_replay?: boolean };
      if (!response.ok) {
        if (response.status < 500) {
          pendingRotations.current.delete(keyId);
          globalThis.sessionStorage?.removeItem(storageKey);
        }
        setMessage(`${action} failed: ${body.error ?? "API_KEY_MUTATION_UNAVAILABLE"}`);
        return;
      }
      pendingRotations.current.delete(keyId);
      globalThis.sessionStorage?.removeItem(storageKey);
      if (body.api_key) {
        setSecret(body.api_key);
        setMessage(body.idempotent_replay
          ? "Rotation recovered after an uncertain response. Copy the replacement key now."
          : "Replacement key created. Copy it now; the previous key is revoked.");
      } else {
        setMessage("API key revoked.");
      }
      await load();
    } catch {
      setMessage(action === "rotate"
        ? "Rotation response was uncertain. Retry Rotate to recover the same replacement key safely."
        : "Revocation could not be confirmed. Refresh the list before retrying.");
    } finally {
      setBusyKey(null);
    }
  };

  return <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.4fr]">
    <form action={create} className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
      <h2 className="text-xl font-semibold">Create API client</h2>
      <label className="grid gap-2 text-sm text-zinc-300">Label<input required name="label" maxLength={80} placeholder="Agent Gamma staging" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3" /></label>
      <label className="grid gap-2 text-sm text-zinc-300">Environment<select name="environment" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><option value="test">Test</option><option value="live">Live</option></select></label>
      <label className="grid gap-2 text-sm text-zinc-300">Preset<select aria-label="API key preset" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3" defaultValue="AGENT_RUNTIME" onChange={(event) => setSelectedScopes([...presets[event.target.value as keyof typeof presets]])}>{Object.keys(presets).map((preset) => <option key={preset} value={preset}>{preset.replaceAll("_", " ")}</option>)}</select></label>
      <fieldset className="grid gap-2"><legend className="text-sm text-zinc-300">Scopes</legend><p className="text-xs text-zinc-500">Presets select least-privilege scopes; fine-grained controls remain editable.</p>{allScopes.map((scope) => <label key={scope} className="flex items-start gap-2 text-sm text-zinc-400"><input className="mt-1" type="checkbox" name="scopes" value={scope} checked={selectedScopes.includes(scope)} onChange={(event) => setSelectedScopes((current) => event.target.checked ? [...new Set([...current, scope])] : current.filter((item) => item !== scope))} /><span><span className="font-mono text-zinc-300">{scope}</span><span className="block text-xs text-zinc-500">{scopePurpose[scope]}</span></span></label>)}</fieldset>
      {selectedScopes.includes("authority:write") ? <fieldset className="grid gap-3 rounded-lg border border-amber-900/70 p-4"><legend className="px-1 text-sm text-amber-100">Authority-management boundary</legend><p className="text-xs leading-5 text-zinc-500">Required for authority:write. Comma-separated values are server-validated and cannot be expanded by the API client later.</p><label className="grid gap-1 text-xs text-zinc-400">Actions<input required name="authority_actions" defaultValue="read_repository" className="rounded border border-zinc-800 bg-zinc-950 p-2" /></label><label className="grid gap-1 text-xs text-zinc-400">Target prefixes<input required name="authority_target_prefixes" defaultValue="repository:" className="rounded border border-zinc-800 bg-zinc-950 p-2" /></label><label className="grid gap-1 text-xs text-zinc-400">Purposes<input required name="authority_purposes" defaultValue="deployment_evidence_review" className="rounded border border-zinc-800 bg-zinc-950 p-2" /></label><label className="grid gap-1 text-xs text-zinc-400">Environments<input required name="authority_environments" defaultValue="staging" className="rounded border border-zinc-800 bg-zinc-950 p-2" /></label><label className="grid gap-1 text-xs text-zinc-400">Maximum TTL seconds<input required name="authority_max_ttl_seconds" type="number" min="300" max="7776000" defaultValue="3600" className="rounded border border-zinc-800 bg-zinc-950 p-2" /></label></fieldset> : null}
      <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">Create and reveal once</button>
      <p className="text-xs leading-5 text-zinc-500">Secrets have 256 bits of entropy, are one-way hashed at rest, tenant scoped, and never used from browser SDK sessions.</p>
    </form>
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-semibold">Tenant API clients</h2>
      {message ? <p className="mt-4 rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-300">{message}</p> : null}
      {secret ? <div className="mt-4 rounded-lg border border-amber-700 bg-amber-950/20 p-4"><p className="text-sm font-semibold text-amber-100">SECRET SHOWN ONCE</p><p className="mt-2 text-xs text-amber-100">Copy this value now. Reloading or leaving this page permanently hides it.</p><code className="mt-2 block break-all text-xs text-amber-200">{secret}</code><p className="mt-4 text-xs text-zinc-300">Set it in your shell; never paste it into a script or commit it:</p><pre className="mt-2 overflow-x-auto whitespace-pre rounded bg-black p-3 text-xs text-cyan-100">{`$env:CYBER_SENTINELS_BASE_URL="${globalThis.location?.origin ?? "https://<approved-non-production-host>"}"
$env:CYBER_SENTINELS_API_KEY="<paste the one-time secret>"`}</pre></div> : null}
      <div className="mt-5 grid gap-3">{keys.map((key) => <article key={key.id} className="rounded-lg border border-zinc-800 bg-black p-4">
        <div className="flex justify-between gap-3"><div><p className="font-medium">{key.label}</p><p className="mt-1 font-mono text-xs text-zinc-500">{key.key_prefix}.••••••••</p></div><span className="text-xs text-cyan-200">{key.status}</span></div>
        <p className="mt-3 text-xs text-zinc-500">Scopes: {key.scopes.join(", ")}</p><p className="mt-2 text-xs text-zinc-500">Created {date(key.created_at)} · Last used {date(key.last_used_at)} · Expires {date(key.expires_at)}</p>
        {key.status === "active" ? <div className="mt-4 flex gap-2"><button disabled={busyKey === key.id} type="button" onClick={() => void mutate(key.id, "rotate")} className="rounded border border-zinc-700 px-3 py-2 text-xs disabled:opacity-50">{busyKey === key.id ? "Working…" : "Rotate"}</button><button disabled={busyKey === key.id} type="button" onClick={() => void mutate(key.id, "revoke")} className="rounded border border-red-900 px-3 py-2 text-xs text-red-200 disabled:opacity-50">Revoke</button></div> : null}
      </article>)}</div>
    </section>
  </div>;
}
