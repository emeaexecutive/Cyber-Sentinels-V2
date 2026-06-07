import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { TrustEvent } from "@/lib/ai-trust/types";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function TrustEventsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/trust-events");

  let query = supabase.from("trust_events").select("*");

  if (params?.agent_id) {
    query = query.eq("agent_id", params.agent_id);
  }

  if (!isAdminAllowlisted(user.email)) {
    query = query.contains("metadata", { owner_user_id: user.id });
  }

  const { data: events } = await query
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<TrustEvent[]>();

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Events
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Trust Events
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            A structured record for verification activity, evidence-backed
            review and operational trust visibility.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="hidden grid-cols-[1fr_0.8fr_1fr_0.7fr_0.9fr_1fr_1fr] gap-4 border-b border-zinc-800 pb-3 text-xs uppercase tracking-[0.16em] text-zinc-600 lg:grid">
            <span>Event</span>
            <span>Actor</span>
            <span>Label</span>
            <span>Risk</span>
            <span>Source</span>
            <span>Related</span>
            <span>Created</span>
          </div>
          <div className="mt-4 grid gap-3">
            {(events ?? []).length ? (
              (events ?? []).map((event) => (
                <article
                  key={event.id}
                  className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-4 lg:grid-cols-[1fr_0.8fr_1fr_0.7fr_0.9fr_1fr_1fr] lg:items-center"
                >
                  <p className="font-medium text-zinc-100">{event.event_type}</p>
                  <p className="text-sm text-zinc-400">{event.actor_type ?? "n/a"}</p>
                  <p className="text-sm text-zinc-400">{event.actor_label ?? "n/a"}</p>
                  <span className="w-fit rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-100">
                    {event.risk_level ?? "review"}
                  </span>
                  <p className="text-sm text-zinc-500">{event.event_source ?? "unknown"}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {event.agent_id ? (
                      <Link href={`/agents/${event.agent_id}`} className="text-cyan-200 hover:text-white">
                        Agent
                      </Link>
                    ) : null}
                    {event.passport_id ? (
                      <Link href={`/passports/${event.passport_id}`} className="text-cyan-200 hover:text-white">
                        Passport
                      </Link>
                    ) : null}
                    {event.case_id ? <span className="text-zinc-500">Case</span> : null}
                  </div>
                  <p className="text-xs text-zinc-600">{formatDate(event.created_at)}</p>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No trust events yet. Verification activity, evidence updates and
                review milestones will appear here as the workflow progresses.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
