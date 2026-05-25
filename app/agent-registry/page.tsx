import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  agentRiskLevels,
  demoAgents,
  getAgentRegistrySummary,
  normalizeAgents,
  permissionScopes,
  type AgentRow,
} from "@/lib/trust-engine/agentRegistry";

export const dynamic = "force-dynamic";

type Signal = {
  id: string;
  event: string;
  created_at: string | null;
};

function badgeClass(value: string) {
  if (["critical", "revoked"].includes(value)) return "border-red-700 text-red-200";
  if (["high", "restricted", "under_review"].includes(value)) {
    return "border-amber-700 text-amber-200";
  }
  if (["low", "verified"].includes(value)) return "border-emerald-700 text-emerald-200";

  return "border-zinc-700 text-zinc-300";
}

export default async function AgentRegistryPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: signals }] = await Promise.all([
    supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AgentRow[]>(),
    supabase
      .from("signals")
      .select("id,event,created_at")
      .ilike("event", "%agent%")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<Signal[]>(),
  ]);
  const agents = !error && data?.length ? normalizeAgents(data) : demoAgents;
  const summary = getAgentRegistrySummary(agents);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/agent-passport", "Agent Passport"],
            ["/permissions-firewall", "Permissions Firewall"],
            ["/mission-control", "Mission Control"],
            ["/admin", "Admin"],
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
            Agent governance
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Agent Registry™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Every autonomous agent needs a passport before permission.
          </p>
          <Link
            href="/permissions-firewall"
            className="mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Open Permissions Firewall™
          </Link>
          {error || !data?.length ? (
            <p className="mt-3 text-sm text-zinc-600">
              Showing demo agents until the agents table contains records.
            </p>
          ) : null}
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-6">
          {[
            ["Registered Agents", summary.total],
            ["Pending Verification", summary.pending + summary.underReview],
            ["Verified", summary.verified],
            ["Restricted", summary.restricted],
            ["Revoked", summary.revoked],
            ["High Risk", summary.highRisk],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Registered Agents</h2>
            <div className="mt-5 space-y-3">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agent-registry/${encodeURIComponent(agent.id)}`}
                  className="block rounded-lg border border-zinc-800 bg-black p-4 hover:border-zinc-500"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {agent.agent_name}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {agent.agent_type} / {agent.model_provider ?? "unknown"}{" "}
                        {agent.model_family ?? ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(
                          agent.status
                        )}`}
                      >
                        {agent.status}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(
                          agent.risk_level
                        )}`}
                      >
                        {agent.risk_level}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">
                    {agent.declared_purpose ?? "No declared purpose"}
                  </p>
                  <p className="mt-3 text-xs text-zinc-600">
                    Trust {agent.trust_score ?? "n/a"} / Origin{" "}
                    {agent.origin_trace_score ?? "n/a"} / Policy{" "}
                    {agent.policy_status ?? "pending"}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Permission Scopes</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {permissionScopes.map((scope) => (
                  <code
                    key={scope}
                    className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    {scope}
                  </code>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Risk Levels</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {agentRiskLevels.map((risk) => (
                  <span
                    key={risk}
                    className={`rounded-full border px-2.5 py-1 text-xs ${badgeClass(
                      risk
                    )}`}
                  >
                    {risk}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Policy Status</h2>
              <div className="mt-5 space-y-3">
                {agents.slice(0, 5).map((agent) => (
                  <div
                    key={`policy-${agent.id}`}
                    className="rounded-lg border border-zinc-800 bg-black p-3"
                  >
                    <p className="text-sm text-zinc-300">{agent.agent_name}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {agent.policy_status ?? "pending_policy_review"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Agent Signals</h2>
            <div className="mt-5 space-y-3">
              {signals?.length ? (
                signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-300">{signal.event}</p>
                  </div>
                ))
              ) : (
                [
                  "agent_registered",
                  "agent_verified",
                  "agent_permission_changed",
                ].map((signal) => (
                  <div
                    key={signal}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-300">{signal}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Agent Passport Links</h2>
            <div className="mt-5 space-y-3">
              {agents.map((agent) => (
                <Link
                  key={`passport-${agent.id}`}
                  href={`/agent-registry/${encodeURIComponent(agent.id)}`}
                  className="block rounded-lg border border-zinc-800 bg-black p-4 hover:border-zinc-500"
                >
                  {agent.agent_name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
