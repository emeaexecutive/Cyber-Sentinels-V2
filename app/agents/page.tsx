import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import type { AgentIdentity } from "@/lib/ai-trust/types";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

async function createAgent(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/agents");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/agents?error=missing_name");

  const actor = user.email ?? user.id;
  const payload = {
    name,
    agent_name: name,
    owner_email: user.email ?? actor,
    owner_user_id: user.id,
    owner_name: actor,
    purpose: String(formData.get("purpose") ?? "").trim(),
    declared_purpose: String(formData.get("purpose") ?? "").trim(),
    model_provider: String(formData.get("model_provider") ?? "").trim(),
    model_name: String(formData.get("model_name") ?? "").trim(),
    model_family: String(formData.get("model_name") ?? "").trim(),
    permission_scope: String(formData.get("permission_scope") ?? "review_only").trim(),
    status: "pending",
    trust_score: 50,
    metadata: { actor, source: "agents.page" },
  };

  const { data: agent, error } = await supabase
    .from("agents")
    .insert(payload)
    .select("id,name")
    .single();

  if (error || !agent) {
    console.error("agent page insert failed", error);
    redirect("/agents?error=create_failed");
  }

  const metadata = { agent_id: agent.id, actor, owner_user_id: user.id };

  const { data: trustEvent } = await supabase
    .from("trust_events")
    .insert({
      actor_type: "agent",
      actor_id: agent.id,
      actor_label: agent.name,
      event_type: "agent_created",
      event_source: "agents.page",
      risk_level: "low",
      agent_id: agent.id,
      metadata,
    })
    .select("id,event_type")
    .single();
  await createAuditLog(supabase, "agent_created", actor, metadata);
  await createSignal(supabase, "Agent created", metadata);
  await createAuditLog(supabase, "trust_event_created", actor, {
    ...metadata,
    trust_event_id: trustEvent?.id,
    event_type: trustEvent?.event_type ?? "agent_created",
  });
  await createSignal(supabase, "Trust event created", {
    ...metadata,
    trust_event_id: trustEvent?.id,
    event_type: trustEvent?.event_type ?? "agent_created",
  });

  redirect(`/agents/${encodeURIComponent(agent.id)}`);
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/agents");

  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AgentIdentity[]>();

  const rows = agents ?? [];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            AI Identity
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            AI Agent Passports
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            Register AI agents with purpose, ownership, model context,
            permission scope and a trust event timeline. No autonomous scoring
            or LLM analysis is used in this foundation.
          </p>
          <Link
            href="/agents/register"
            className="mt-5 inline-flex rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
          >
            Register Agent
          </Link>
        </section>

        {params?.error ? (
          <p className="mt-6 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">
            Could not create this agent. Check the required fields.
          </p>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <form action={createAgent} className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Create Agent Identity</h2>
            <input
              name="name"
              required
              placeholder="Agent name"
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
            />
            <textarea
              name="purpose"
              rows={4}
              placeholder="Purpose"
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
            />
            <input
              name="model_provider"
              placeholder="Model provider"
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
            />
            <input
              name="model_name"
              placeholder="Model name"
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white placeholder:text-zinc-600"
            />
            <select
              name="permission_scope"
              defaultValue="review_only"
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white"
            >
              <option value="review_only">Review only</option>
              <option value="observe">Observe</option>
              <option value="advise">Advise</option>
              <option value="approval_required">Approval required</option>
              <option value="restricted_execution">Restricted execution</option>
            </select>
            <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">
              Create Agent
            </button>
          </form>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Your Agents</h2>
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
                          {agent.model_provider ?? "unknown"} / {agent.model_name ?? "unknown"}
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
                      Trust {agent.trust_score ?? 50} / Created {formatDate(agent.created_at)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                  No AI agents yet. Create an agent identity to begin trust event tracking.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
