import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { AgentIdentity, AgentPermission, TrustEvent } from "@/lib/ai-trust/types";
import {
  buildAgentRelationships,
  relationshipLabel,
  type TrustRelationshipView,
} from "@/lib/trust-relationships/relationships";
import {
  buildDerivedAgentTimeline,
  formatTimelineDate,
  mergeTimelineEvents,
  normalizeStoredTimelineEvent,
  type TrustTimelineEvent,
} from "@/lib/trust-timeline/provenance";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function latestAiAnalysis(row: Record<string, any> | null | undefined) {
  return asObject(asObject(row?.metadata).analysis);
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function Badge({ value }: { value?: string | null }) {
  return (
    <span className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-100">
      {value ?? "pending"}
    </span>
  );
}

function RelationshipItem({ relationship }: { relationship: TrustRelationshipView }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-100">
            {relationship.source_label}{" "}
            <span className="text-cyan-200">
              {relationshipLabel(relationship.relationship_type).toLowerCase()}
            </span>{" "}
            {relationship.target_label}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {relationship.explanation}
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-300">
          {relationship.confidence_level}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
        <p>Created by: {relationship.created_by}</p>
        <p>Triggered by: {relationship.trigger}</p>
        <p>Recorded: {formatDate(relationship.created_at)}</p>
      </div>
    </div>
  );
}

function TimelineItem({ event }: { event: TrustTimelineEvent }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-100">{event.event_title}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {event.event_summary}
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-300">
          {event.severity}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
        <p>Actor: {event.actor_type ?? "system"}</p>
        <p>Event: {event.event_type}</p>
        <p>When: {formatTimelineDate(event.created_at)}</p>
      </div>
    </div>
  );
}

export default async function AgentPassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ai_governance?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
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

  const [
    { data: events },
    { data: permissions },
    { data: latestTrustRun },
    { data: latestAiOverview },
    { data: sourceRelationships },
    { data: targetRelationships },
    { data: storedTimeline },
  ] = await Promise.all([
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
    supabase
      .from("trust_algorithm_runs")
      .select("*")
      .eq("subject_type", "agent")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("event_type", "governance_recommendation_created")
      .eq("metadata->>subject_type", "agent")
      .eq("metadata->>subject_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("trust_relationships")
      .select("*")
      .eq("source_type", "agent")
      .eq("source_id", id)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("trust_relationships")
      .select("*")
      .eq("target_type", "agent")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("trust_timeline_events")
      .select("*")
      .eq("subject_type", "agent")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  const activityRisk = (events ?? []).some((event) =>
    ["high", "critical"].includes(String(event.risk_level ?? "").toLowerCase())
  )
    ? "Elevated"
    : (events ?? []).some((event) =>
          ["medium", "review"].includes(String(event.risk_level ?? "").toLowerCase())
        )
      ? "Review"
      : "Low";
  const reasonCodes = [
    ...asStringArray(latestTrustRun?.positive_signals),
    ...asStringArray(latestTrustRun?.negative_signals),
    ...asStringArray(latestTrustRun?.missing_requirements),
  ];
  const aiAnalysis = latestAiAnalysis(latestAiOverview);
  const aiSourceReasoning = textList(aiAnalysis.source_reasoning);
  const aiObservations = textList(aiAnalysis.observations);
  const aiRecommendations = textList(aiAnalysis.recommendations);
  const storedRelationshipsById = new Map<string, Record<string, any>>();
  [...(sourceRelationships ?? []), ...(targetRelationships ?? [])].forEach((row) =>
    storedRelationshipsById.set(String(row.id), row)
  );
  const relationships = buildAgentRelationships({
    agent,
    events: events ?? [],
    permissions: permissions ?? [],
    trustRuns: latestTrustRun ? [latestTrustRun] : [],
    storedRelationships: [...storedRelationshipsById.values()],
  });
  const timelineEvents = mergeTimelineEvents(
    (storedTimeline ?? []).map(normalizeStoredTimelineEvent),
    buildDerivedAgentTimeline({
      agentId: id,
      events: events ?? [],
      permissions: permissions ?? [],
      trustRuns: latestTrustRun ? [latestTrustRun] : [],
      relationships: [...storedRelationshipsById.values()],
    })
  ).slice(0, 12);

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
            <Link
              href={`/trust-replay?subject_type=agent&subject_id=${encodeURIComponent(id)}`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-cyan-500"
            >
              Replay History
            </Link>
          </div>
        </section>

        {query.ai_governance ? (
          <div className="mt-6 rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">
            {query.ai_governance === "missing_openai_key"
              ? "AI-assisted governance analysis is unavailable because OPENAI_API_KEY is not configured."
              : "AI-assisted governance analysis could not be generated. Human governance review remains available."}
          </div>
        ) : null}

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
        <p className="mt-3 text-xs text-zinc-500">
          Trust Score Source: Heuristic Baseline. Provider evidence may inform review, but this is not a real-ML verdict.
        </p>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                AI-assisted activity overview
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {aiAnalysis.title ?? "Agent Activity Summary"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                Cyber Sentinels uses AI-assisted analysis while maintaining human governance and explainable operational review.
              </p>
            </div>
            <form action="/api/ai-governance/analyze" method="POST">
              <input type="hidden" name="subject_type" value="agent" />
              <input type="hidden" name="subject_id" value={id} />
              <button className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
                Generate AI Overview
              </button>
            </form>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-zinc-300">
            {aiAnalysis.explanation ?? "No AI-assisted activity overview has been generated yet."}
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Operational Context</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {aiAnalysis.operational_context ?? "Generate an overview to review operational context."}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Source Reasoning</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {aiSourceReasoning.length ? aiSourceReasoning.join(" ") : "No source reasoning recorded."}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Generated</p>
              <p className="mt-2 text-sm text-zinc-300">{formatDate(latestAiOverview?.created_at)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Governance Observations</p>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-300">
                {(aiObservations.length ? aiObservations : ["No observations recorded."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Recommendations Only</p>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-300">
                {(aiRecommendations.length ? aiRecommendations : ["No recommendations recorded."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                Agent Trust Algorithm
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {latestTrustRun?.score ?? "Not calculated"}
              </h2>
              <p className="mt-1 text-sm text-cyan-200">
                {latestTrustRun?.confidence_level ?? "Run the algorithm to classify this agent."}
              </p>
            </div>
            <form action="/api/trust-algorithm/run" method="POST">
              <input type="hidden" name="subject_type" value="agent" />
              <input type="hidden" name="subject_id" value={id} />
              <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
                Recalculate Trust Score
              </button>
            </form>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            {latestTrustRun?.explanation ?? "No algorithm explanation has been recorded yet."}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Activity Risk</p>
              <p className="mt-2 text-sm text-zinc-300">{activityRisk}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Verification Status</p>
              <p className="mt-2 text-sm text-zinc-300">{agent.status ?? "pending"}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Reason Codes</p>
              <p className="mt-2 text-sm text-zinc-300">
                {reasonCodes.length ? reasonCodes.join(", ") : "None recorded"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Recommended Action</p>
              <p className="mt-2 text-sm text-zinc-300">
                {latestTrustRun?.recommended_action ?? "Calculate trust score to generate an action."}
              </p>
            </div>
          </div>
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

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                Replay Trust History
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Operational memory for this agent
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                Replay activity history, governance interventions and
                provenance changes without changing audit trails or historical
                records.
              </p>
            </div>
            <Link
              href={`/trust-replay?subject_type=agent&subject_id=${encodeURIComponent(id)}`}
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
            >
              Open Replay
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Relationship View</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Agent relationships are derived from ownership, activity,
              permissions and governance records. AI may summarize these links
              later, but it cannot invent them.
            </p>
            <div className="mt-5 grid gap-3">
              {relationships.length ? (
                relationships.map((relationship) => (
                  <RelationshipItem key={relationship.id} relationship={relationship} />
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                  No relationships are available yet. Ownership, trust events
                  and permissions will create explainable links as the agent is
                  used.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Chronology</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Cyber Sentinels provides operational chronology and explainable
              trust history for agent activity, governance actions, ownership
              context and operational events.
            </p>
            <div className="mt-5 grid gap-3">
              {timelineEvents.length ? (
                timelineEvents.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                  No timeline events are available yet. Agent activity and
                  governance records will appear here as verification evidence is recorded.
                </p>
              )}
            </div>
          </div>

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
