import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import type { AgentIdentity, TrustEvent } from "@/lib/ai-trust/types";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminAgentsPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/agents");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/agents" });

  const [{ data: agents }, { data: events }] = await Promise.all([
    supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AgentIdentity[]>(),
    supabase
      .from("trust_events")
      .select("*")
      .not("agent_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<TrustEvent[]>(),
  ]);
  const rows = agents ?? [];
  const highRiskEvents = (events ?? []).filter((event) =>
    ["high", "critical"].includes(String(event.risk_level).toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Admin Agent Registry</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            Manage AI agent identity records and inspect trust event activity
            without autonomous analysis or black-box scoring.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Agents", rows.length],
            ["Pending", rows.filter((agent) => agent.status === "pending").length],
            ["Active", rows.filter((agent) => agent.status === "active").length],
            ["High-Risk Events", highRiskEvents.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Agent Registry</h2>
            <Link href="/agents" className="rounded-lg border border-cyan-800 px-3 py-2 text-sm text-cyan-100 hover:text-white">
              Open User Registry
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {rows.length ? (
              rows.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${encodeURIComponent(agent.id)}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{agent.name}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {agent.owner_email ?? "unknown owner"} / {agent.model_provider ?? "unknown"} {agent.model_name ?? ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-100">
                      {agent.status ?? "pending"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {agent.purpose ?? "No purpose recorded."}
                  </p>
                  <p className="mt-3 text-xs text-zinc-600">
                    Permission {agent.permission_scope ?? "review_only"} / Trust {agent.trust_score ?? 50} / {formatDate(agent.created_at)}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No agents registered yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">High-Risk Agent Events</h2>
          <div className="mt-5 grid gap-3">
            {highRiskEvents.length ? (
              highRiskEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/trust-events?agent_id=${event.agent_id ?? ""}`}
                  className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-zinc-100">{event.event_type}</p>
                    <span className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
                      {event.risk_level}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">
                    {event.actor_label ?? "Agent"} / {event.event_source ?? "unknown"} / {formatDate(event.created_at)}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No high-risk agent events.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
