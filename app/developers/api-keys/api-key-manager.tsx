"use client";

import { useCallback, useEffect, useState } from "react";

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

const allScopes = ["agents:write", "agents:verify", "authority:read", "trust:request", "trust:read", "evidence:write", "outcomes:write"];
const presets = {
  AGENT_RUNTIME: ["agents:write", "agents:verify", "authority:read", "trust:request", "trust:read", "outcomes:write"],
  APPLICATION: ["trust:request", "trust:read", "outcomes:write"],
  EVIDENCE_PROVIDER: ["evidence:write", "trust:read"],
  ROBOTICS_RUNTIME: ["authority:read", "trust:request", "trust:read", "evidence:write", "outcomes:write"],
  READ_ONLY_AUDITOR: ["authority:read", "trust:read"],
} as const;
const scopePurpose: Record<string, string> = {
  "agents:write": "Register Gamma, credentials, and manifests",
  "agents:verify": "Issue challenges and submit proof of possession",
  "authority:read": "Read Gamma's effective authority",
  "trust:request": "Request canonical ALLOW, REVIEW, or DENY decisions",
  "trust:read": "Retrieve transactions, Replay, receipts, and trust state",
  "evidence:write": "Submit provider-attributed evidence without decision authority",
  "outcomes:write": "Submit explicitly classified outcome assertions",
};
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "Never";

export function ApiKeyManager({ enterpriseId }: { enterpriseId: string }) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...presets.AGENT_RUNTIME]);
  const [message, setMessage] = useState("Loading tenant API clients…");

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
    const response = await fetch("/api/developer/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json", "x-enterprise-id": enterpriseId },
      body: JSON.stringify({
        label: formData.get("label"),
        environment: formData.get("environment"),
        scopes: allScopes.filter((scope) => formData.getAll("scopes").includes(scope)),
      }),
    });
    const body = await response.json();
    if (!response.ok) { setMessage(`Creation failed: ${body.error}`); return; }
    setSecret(body.api_key);
    setMessage("API key created. Copy it now; it cannot be displayed again.");
    await load();
  };

  const mutate = async (keyId: string, action: "revoke" | "rotate") => {
    setSecret(null);
    const response = await fetch("/api/developer/api-keys", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-enterprise-id": enterpriseId },
      body: JSON.stringify({ key_id: keyId, action }),
    });
    const body = await response.json();
    if (!response.ok) { setMessage(`${action} failed: ${body.error}`); return; }
    if (body.api_key) {
      setSecret(body.api_key);
      setMessage("Replacement key created. Copy it now; the previous key is revoked.");
    } else {
      setMessage("API key revoked.");
    }
    await load();
  };

  return <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.4fr]">
    <form action={create} className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
      <h2 className="text-xl font-semibold">Create API client</h2>
      <label className="grid gap-2 text-sm text-zinc-300">Label<input required name="label" maxLength={80} placeholder="Agent Gamma staging" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3" /></label>
      <label className="grid gap-2 text-sm text-zinc-300">Environment<select name="environment" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"><option value="test">Test</option><option value="live">Live</option></select></label>
      <label className="grid gap-2 text-sm text-zinc-300">Preset<select aria-label="API key preset" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3" defaultValue="AGENT_RUNTIME" onChange={(event) => setSelectedScopes([...presets[event.target.value as keyof typeof presets]])}>{Object.keys(presets).map((preset) => <option key={preset} value={preset}>{preset.replaceAll("_", " ")}</option>)}</select></label>
      <fieldset className="grid gap-2"><legend className="text-sm text-zinc-300">Scopes</legend><p className="text-xs text-zinc-500">Presets select least-privilege scopes; fine-grained controls remain editable.</p>{allScopes.map((scope) => <label key={scope} className="flex items-start gap-2 text-sm text-zinc-400"><input className="mt-1" type="checkbox" name="scopes" value={scope} checked={selectedScopes.includes(scope)} onChange={(event) => setSelectedScopes((current) => event.target.checked ? [...new Set([...current, scope])] : current.filter((item) => item !== scope))} /><span><span className="font-mono text-zinc-300">{scope}</span><span className="block text-xs text-zinc-500">{scopePurpose[scope]}</span></span></label>)}</fieldset>
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
        {key.status === "active" ? <div className="mt-4 flex gap-2"><button type="button" onClick={() => void mutate(key.id, "rotate")} className="rounded border border-zinc-700 px-3 py-2 text-xs">Rotate</button><button type="button" onClick={() => void mutate(key.id, "revoke")} className="rounded border border-red-900 px-3 py-2 text-xs text-red-200">Revoke</button></div> : null}
      </article>)}</div>
    </section>
  </div>;
}
