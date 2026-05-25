import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  demoAgents,
  normalizeAgent,
  type AgentRow,
} from "@/lib/trust-engine/agentRegistry";

export const dynamic = "force-dynamic";

type AuditLog = {
  id: string;
  event_type: string;
  actor: string | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "n/a";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AgentRegistryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data, error }, { data: auditLogs }] = await Promise.all([
    supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .limit(1)
      .returns<AgentRow[]>(),
    supabase
      .from("audit_logs")
      .select("id,event_type,actor,created_at")
      .in("event_type", [
        "agent_registry_created",
        "agent_permission_updated",
        "agent_verification_completed",
        "agent_revoked",
      ])
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AuditLog[]>(),
  ]);
  const agent =
    !error && data?.[0]
      ? normalizeAgent(data[0])
      : demoAgents.find((item) => item.id === id);

  if (!agent) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/agent-registry", "Agent Registry"],
            ["/agent-passport", "Agent Passport"],
            ["/mission-control", "Mission Control"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Agent Passport
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            {agent.agent_name}
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            {agent.declared_purpose ?? "No declared purpose recorded."}
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            ["Status", agent.status],
            ["Risk", agent.risk_level],
            ["Trust", agent.trust_score ?? "n/a"],
            ["Origin", agent.origin_trace_score ?? "n/a"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Identity</h2>
            <div className="mt-5 space-y-3 text-sm text-zinc-300">
              <p>Type: {agent.agent_type}</p>
              <p>Owner: {agent.owner_name ?? "n/a"}</p>
              <p>Owner email: {agent.owner_email ?? "n/a"}</p>
              <p>
                Model: {agent.model_provider ?? "unknown"} /{" "}
                {agent.model_family ?? "unknown"}
              </p>
              <p>Policy: {agent.policy_status ?? "pending_policy_review"}</p>
              <p>Last verified: {formatDate(agent.last_verified_at)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Permissions</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {agent.permissions.length ? (
                agent.permissions.map((permission) => (
                  <code
                    key={permission}
                    className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    {permission}
                  </code>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No permissions granted.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Audit History</h2>
          <div className="mt-5 space-y-3">
            {auditLogs?.length ? (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="text-zinc-300">{log.event_type}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {log.actor ?? "system"} / {formatDate(log.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                No agent audit events recorded yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
