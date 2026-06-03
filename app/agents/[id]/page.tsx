import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { AgentIdentity, AgentPermission, TrustEvent } from "@/lib/ai-trust/types";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function Badge({ value }: { value?: string | null }) {
  return (
    <span className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-100">
      {value ?? "pending"}
    </span>
  );
}

export default async function AgentPassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/agents/${encodeURIComponent(id)}`);

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle<AgentIdentity>();

  if (!agent) notFound();

  if (agent.owner_user_id !== user.id && !isAdminAllowlisted(user.email)) {
    return (
      <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-semibold">Agent not available</h1>
          <p className="mt-3 text-sm text-zinc-400">
            You can only view agents linked to your account.
          </p>
          <Link href="/agents" className="mt-5 inline-flex text-sm text-cyan-200">
            Back to Agents
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: events }, { data: permissions }] = await Promise.all([
    supabase
      .from("trust_events")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<TrustEvent[]>(),
    supabase
      .from("agent_permissions")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<AgentPermission[]>(),
  ]);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Agent Passport
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">{agent.name}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                {agent.purpose ?? "No purpose recorded."}
              </p>
            </div>
            <Link
              href={`/trust-events?agent_id=${encodeURIComponent(id)}`}
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
            >
              View Trust Events
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Owner", agent.owner_email ?? "Not recorded"],
            ["Provider / Model", `${agent.model_provider ?? "unknown"} / ${agent.model_name ?? "unknown"}`],
            ["Permission Scope", agent.permission_scope ?? "review_only"],
            ["Trust Score", String(agent.trust_score ?? 50)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
              <p className="mt-3 text-lg font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Status</p>
              <div className="mt-3"><Badge value={agent.status} /></div>
            </div>
            <p className="text-sm text-zinc-500">Created {formatDate(agent.created_at)}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Event Timeline</h2>
            <div className="mt-5 grid gap-3">
              {(events ?? []).length ? (
                (events ?? []).map((event) => (
                  <div key={event.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-medium text-zinc-100">{event.event_type}</p>
                      <Badge value={event.risk_level} />
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      {event.actor_type ?? "actor"} / {event.actor_label ?? "n/a"} / {event.event_source ?? "unknown"}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">{formatDate(event.created_at)}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                  No trust events yet. Events will appear when this agent is created, updated or linked to verification activity.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Permissions</h2>
            <div className="mt-5 grid gap-3">
              {(permissions ?? []).length ? (
                (permissions ?? []).map((permission) => (
                  <div key={permission.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-medium text-zinc-100">
                        {permission.permission_name ?? "Permission"}
                      </p>
                      <Badge value={permission.status} />
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      {permission.permission_scope ?? "scope"} / {permission.risk_level ?? "medium"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                  No explicit permissions recorded yet. The current permission scope is {agent.permission_scope ?? "review_only"}.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
