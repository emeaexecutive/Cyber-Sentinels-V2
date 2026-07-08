import Link from "next/link";
import { redirect } from "next/navigation";
import { evaluateAgentRuntimeControl } from "@/lib/agents/agent-runtime-control";
import type { AgentIdentity, AgentPermission, TrustEvent } from "@/lib/ai-trust/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function text(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function stateClass(value: string) {
  if (/block|critical|kill/.test(value)) return "border-red-900 text-red-200";
  if (/review|escalate|high|step/.test(value)) return "border-amber-900 text-amber-200";
  if (/allow|low|not/.test(value)) return "border-emerald-900 text-emerald-200";
  return "border-zinc-700 text-zinc-300";
}

function Badge({ value }: { value: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${stateClass(value)}`}>{text(value)}</span>;
}

export default async function AgentRiskDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/agent-risk");

  const [{ data: agents }, { data: events }, { data: permissions }] = await Promise.all([
    supabase.from("agents").select("*").order("created_at", { ascending: false }).limit(60).returns<AgentIdentity[]>(),
    supabase.from("trust_events").select("*").eq("actor_type", "agent").order("created_at", { ascending: false }).limit(120).returns<TrustEvent[]>(),
    supabase.from("agent_permissions").select("*").order("created_at", { ascending: false }).limit(120).returns<AgentPermission[]>(),
  ]);

  const controls = (agents ?? []).map((agent) => {
    const agentEvents = (events ?? []).filter((event) => event.agent_id === agent.id || event.actor_id === agent.id);
    const agentPermissions = (permissions ?? []).filter((permission) => permission.agent_id === agent.id);
    const latestPermission = agentPermissions[0];
    return evaluateAgentRuntimeControl({
      agentId: agent.id,
      agentName: agent.name,
      humanOwner: agent.owner_email,
      delegatedAuthority: agent.owner_email ? "active" : "missing",
      permissionBoundary:
        latestPermission?.status === "revoked"
          ? "violation"
          : latestPermission?.risk_level === "high"
            ? "overbroad"
            : agent.permission_scope === "admin" || agent.permission_scope === "broad"
              ? "overbroad"
              : "within_scope",
      runtimeAction: agentEvents[0]?.event_type ?? "agent_runtime_review",
      accessedResource: String(agentEvents[0]?.metadata?.resource ?? latestPermission?.permission_name ?? "workflow"),
      credentialType: /key|token|secret/i.test(String(latestPermission?.permission_name ?? "")) ? "api_key" : "unknown",
      accessScope: latestPermission?.permission_scope ?? agent.permission_scope,
      orphanedStatus: !agent.owner_email,
      highScopeCredential: /admin|write|broad/i.test(String(latestPermission?.permission_scope ?? agent.permission_scope ?? "")),
      unusualCredentialUsage: agentEvents.some((event) => /credential|token|secret/i.test(event.event_type)),
      agentAccessToSensitiveSecrets: agentEvents.some((event) => /secret|credential|token/i.test(JSON.stringify(event.metadata ?? {}))),
      unexpectedOutboundAction: agentEvents.some((event) => /outbound|export|webhook/i.test(event.event_type)),
      failedAuthorizationCount: agentEvents.filter((event) => /fail|denied|unauthor/i.test(event.event_type)).length,
      largeDataAccess: agentEvents.some((event) => /bulk|large|export/i.test(event.event_type)),
      unknownRuntime: !agent.model_provider,
      evidence_refs: agentEvents.slice(0, 4).map((event) => String(event.id)),
    });
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Agentic Threat Runtime Control</p>
          <h1 className="mt-4 text-4xl font-semibold">Agent Risk Dashboard</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Runtime control view for agent identity, human ownership, authority,
            permission boundaries, credential exposure risk, suspicious behavior
            events, kill-switch status and replay readiness. Signals are
            heuristic runtime evidence unless source-labelled provider evidence exists.
          </p>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Agents", controls.length],
            ["Review/escalate/block", controls.filter((item) => item.decision !== "allow").length],
            ["Kill-switch review", controls.filter((item) => item.kill_switch.recommended).length],
            ["Credential risk high", controls.filter((item) => ["high", "critical"].includes(item.credential_exposure.risk_band)).length],
            ["Suspicious events", controls.reduce((total, item) => total + item.suspicious_behavior_events.length, 0)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{String(value)}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4">
          {controls.length ? controls.map((control) => (
            <article key={control.agent.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100">{control.agent.name}</h2>
                  <p className="mt-2 text-sm text-zinc-500">Owner: {control.agent.human_owner} / Boundary: {text(control.agent.permission_boundary)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge value={control.decision} />
                  <Badge value={control.kill_switch.status} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <p className="rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-400">Credential risk: <span className="text-zinc-100">{control.credential_exposure.risk_band}</span></p>
                <p className="rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-400">Authority: <span className="text-zinc-100">{text(control.agent.delegated_authority)}</span></p>
                <p className="rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-400">Events: <span className="text-zinc-100">{control.suspicious_behavior_events.length}</span></p>
                <p className="rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-400">Confidence: <span className="text-zinc-100">{Math.round(control.confidence * 100)}%</span></p>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">{control.reason}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Link href={`/agents/${encodeURIComponent(control.agent.id)}/runtime`} className="text-cyan-200 hover:text-white">Runtime control</Link>
                <Link href={`/trust-replay?subject_type=agent&subject_id=${encodeURIComponent(control.agent.id)}`} className="text-cyan-200 hover:text-white">Replay</Link>
              </div>
            </article>
          )) : (
            <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">No agent records are available yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
