import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { evaluateAgentRuntimeControl } from "@/lib/agents/agent-runtime-control";
import type { AgentIdentity, AgentPermission, TrustEvent } from "@/lib/ai-trust/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function text(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function badgeClass(value: string) {
  if (/block|critical|kill|violation/.test(value)) return "border-red-900 text-red-200";
  if (/review|escalate|high|overbroad|step/.test(value)) return "border-amber-900 text-amber-200";
  if (/allow|active|within|low/.test(value)) return "border-emerald-900 text-emerald-200";
  return "border-zinc-700 text-zinc-300";
}

function Badge({ value }: { value: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${badgeClass(value)}`}>{text(value)}</span>;
}

export default async function AgentRuntimeControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/agents/${encodeURIComponent(id)}/runtime`);

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<AgentIdentity>();
  if (!agent) notFound();
  if (agent.owner_user_id !== user.id && !isAdminAllowlisted(user.email)) {
    redirect(`/agents/${encodeURIComponent(id)}`);
  }

  const [{ data: events }, { data: permissions }] = await Promise.all([
    supabase.from("trust_events").select("*").eq("agent_id", id).order("created_at", { ascending: false }).limit(40).returns<TrustEvent[]>(),
    supabase.from("agent_permissions").select("*").eq("agent_id", id).order("created_at", { ascending: false }).limit(40).returns<AgentPermission[]>(),
  ]);
  const latestPermission = permissions?.[0];
  const latestEvent = events?.[0];
  const control = evaluateAgentRuntimeControl({
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
    runtimeAction: latestEvent?.event_type ?? "agent_runtime_review",
    accessedResource: String(latestEvent?.metadata?.resource ?? latestPermission?.permission_name ?? "workflow"),
    credentialType: /key|token|secret/i.test(String(latestPermission?.permission_name ?? "")) ? "api_key" : "unknown",
    accessScope: latestPermission?.permission_scope ?? agent.permission_scope,
    orphanedStatus: !agent.owner_email,
    authorizationLineage: [
      `agent:${agent.id}`,
      agent.owner_email ? `owner:${agent.owner_email}` : "owner:missing",
      latestPermission?.id ? `permission:${latestPermission.id}` : "permission:declared_scope",
    ],
    delegatedConstraints: permissions?.slice(0, 5).map((permission) => `${permission.permission_name ?? "permission"}:${permission.permission_scope ?? "scope_unknown"}`),
    expiryStatus: latestPermission?.status === "revoked" ? "revoked" : latestPermission?.status === "expired" ? "expired" : "active",
    highScopeCredential: /admin|write|broad/i.test(String(latestPermission?.permission_scope ?? agent.permission_scope ?? "")),
    unusualCredentialUsage: (events ?? []).some((event) => /credential|token|secret/i.test(event.event_type)),
    agentAccessToSensitiveSecrets: (events ?? []).some((event) => /secret|credential|token/i.test(JSON.stringify(event.metadata ?? {}))),
    unexpectedOutboundAction: (events ?? []).some((event) => /outbound|export|webhook/i.test(event.event_type)),
    failedAuthorizationCount: (events ?? []).filter((event) => /fail|denied|unauthor/i.test(event.event_type)).length,
    largeDataAccess: (events ?? []).some((event) => /bulk|large|export/i.test(event.event_type)),
    unknownRuntime: !agent.model_provider,
    evidence_refs: (events ?? []).slice(0, 6).map((event) => String(event.id)),
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Agent Runtime Control</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">{agent.name}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Runtime view of identity, authority, permission boundary,
                accessed resource, credential exposure risk, suspicious behavior
                events, kill-switch status, replay and governance readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge value={control.decision} />
              <Badge value={control.kill_switch.status} />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Human owner", control.agent.human_owner],
            ["Authority", control.agent.delegated_authority],
            ["Permission boundary", control.agent.permission_boundary],
            ["Credential risk", control.credential_exposure.risk_band],
            ["Access scope", control.agent.access_scope],
            ["Accessed resource", control.accessed_resource],
            ["Source labels", control.source_labels.join(", ")],
            ["Confidence", `${Math.round(control.confidence * 100)}%`],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-sm font-medium text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Decision and kill-switch status</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{control.reason}</p>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Kill-switch status: {text(control.kill_switch.status)}. This is a
              recommendation or placeholder unless a governed runtime integration
              exposes activation and audit APIs.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link href={`/trust-replay?subject_type=agent&subject_id=${encodeURIComponent(agent.id)}`} className="text-cyan-200 hover:text-white">Open Replay</Link>
              <Link href="/dashboard/agent-risk" className="text-cyan-200 hover:text-white">Agent Risk Dashboard</Link>
            </div>
          </article>

          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Suspicious behavior events</h2>
            <div className="mt-4 grid gap-3">
              {control.suspicious_behavior_events.length ? control.suspicious_behavior_events.map((event) => (
                <div key={event.type} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-zinc-100">{text(event.type)}</p>
                    <Badge value={event.severity} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{event.explanation}</p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No suspicious agent behavior event was inferred from current records.</p>
              )}
            </div>
          </article>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Replay evidence model</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(control.replay_evidence_model).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{text(key)}</p>
                <p className="mt-2 text-sm text-zinc-300">{Array.isArray(value) ? value.join(", ") || "None" : String(value)}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-zinc-500">
            {control.limitations[0]} {control.limitations[control.limitations.length - 1]}
          </p>
        </section>
      </div>
    </main>
  );
}
