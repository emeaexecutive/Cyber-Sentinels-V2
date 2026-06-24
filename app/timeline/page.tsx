import Link from "next/link";
import { OnboardingHint } from "@/components/onboarding-walkthrough";
import { createClient } from "@/lib/supabase/server";
import {
  formatTimelineDate,
  normalizeStoredTimelineEvent,
  timelineCategory,
  type TimelineSeverity,
  type TrustTimelineEvent,
} from "@/lib/trust-timeline/provenance";

export const dynamic = "force-dynamic";

type TimelinePageProps = {
  searchParams?: Promise<{ filter?: string }>;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AnyRow = Record<string, any>;

const filters = [
  ["all", "All"],
  ["passports", "Passports"],
  ["agents", "Agents"],
  ["signals", "Signals"],
  ["governance", "Governance"],
  ["evidence", "Evidence"],
];

const severityStyles: Record<TimelineSeverity, string> = {
  info: "border-cyan-800 text-cyan-200",
  review: "border-amber-800 text-amber-200",
  warning: "border-orange-800 text-orange-200",
  critical: "border-red-800 text-red-200",
};

async function fetchRows(
  supabase: SupabaseServerClient,
  filter: string
): Promise<TrustTimelineEvent[]> {
  let query = supabase
    .from("trust_timeline_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "passports") {
    query = query.eq("subject_type", "passport");
  } else if (filter === "agents") {
    query = query.eq("subject_type", "agent");
  } else if (filter === "evidence") {
    query = query.ilike("event_type", "%evidence%");
  } else if (filter === "signals") {
    query = query.or("event_type.ilike.%signal%,event_type.ilike.%anomaly%");
  } else if (filter === "governance") {
    query = query.or("event_type.ilike.%decision%,event_type.ilike.%review%,event_type.ilike.%governance%");
  }

  const { data, error } = await query.returns<AnyRow[]>();

  if (error) return [];
  return (data ?? []).map(normalizeStoredTimelineEvent);
}

function TimelineCard({ event }: { event: TrustTimelineEvent }) {
  const href =
    event.subject_type === "passport" && event.subject_id
      ? `/passports/${encodeURIComponent(event.subject_id)}`
      : event.subject_type === "agent" && event.subject_id
        ? `/agents/${encodeURIComponent(event.subject_id)}`
        : "/timeline";

  return (
    <Link
      href={href}
      className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5 hover:border-zinc-500 md:grid-cols-[180px_1fr]"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
          {formatTimelineDate(event.created_at)}
        </p>
        <span className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-xs ${severityStyles[event.severity]}`}>
          {event.severity}
        </span>
      </div>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">
              {timelineCategory(event.event_type)}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-100">
              {event.event_title}
            </h2>
          </div>
          <p className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
            {event.source}
          </p>
        </div>
        <p className="mt-3 text-sm leading-7 text-zinc-400">
          {event.event_summary}
        </p>
        <div className="mt-4 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
          <p>Subject: {event.subject_type ?? "workflow"}</p>
          <p>Actor: {event.actor_type ?? "system"}</p>
          <p>Event: {event.event_type}</p>
        </div>
      </div>
    </Link>
  );
}

export default async function TimelinePage({ searchParams }: TimelinePageProps) {
  const query = searchParams ? await searchParams : {};
  const activeFilter = filters.some(([key]) => key === query.filter)
    ? String(query.filter)
    : "all";
  const supabase = await createClient();
  const events = await fetchRows(supabase, activeFilter);
  const reviewCount = events.filter((event) => event.severity !== "info").length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /
          </Link>
          <Link href="/trust-graph" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            Trust Graph
          </Link>
          <Link href="/trust-algorithm" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            Trust Algorithm
          </Link>
        </nav>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Operational chronology
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Timeline
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels provides operational chronology and explainable trust
            history. Timeline events show how trust workflows evolve through
            evidence, review, signals, governance actions and agent activity.
          </p>
          <div className="mt-5 max-w-3xl">
            <OnboardingHint area="timeline" />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Future AI-assisted summaries may describe progression and governance
            history, but AI does not rewrite history.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            ["Timeline Events", events.length],
            ["Needs Review", reviewCount],
            ["Filter", activeFilter],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold capitalize text-zinc-100">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 flex flex-wrap gap-2">
          {filters.map(([key, label]) => (
            <Link
              key={key}
              href={key === "all" ? "/timeline" : `/timeline?filter=${key}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                activeFilter === key
                  ? "border-cyan-700 bg-cyan-950/30 text-cyan-100"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-4">
          {events.length ? (
            events.map((event) => <TimelineCard key={event.id} event={event} />)
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-black p-5 text-sm leading-7 text-zinc-500">
              No timeline events are available yet. New evidence uploads,
              signals, governance decisions, trust algorithm runs, relationship
              creation and AI-assisted summaries will create provenance entries
              automatically.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
