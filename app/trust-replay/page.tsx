import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingHint } from "@/components/onboarding-walkthrough";
import { ProviderEvidencePanel } from "@/components/provider-evidence-panel";
import { createClient } from "@/lib/supabase/server";
import { buildWorkflowProviderSignals } from "@/lib/providers";
import {
  buildReplaySnapshot,
  replayDefaultAsOf,
  replayStage,
  rowMetadata,
  type ReplayRow,
  type ReplaySession,
} from "@/lib/trust-replay/replay";
import {
  formatTimelineDate,
  normalizeStoredTimelineEvent,
  type TrustTimelineEvent,
} from "@/lib/trust-timeline/provenance";
import { trustPostureClass } from "@/lib/trust-posture/posture";

export const dynamic = "force-dynamic";

type TrustReplayPageProps = {
  searchParams?: Promise<{
    subject_type?: string;
    subject_id?: string;
    as_of?: string;
    replay_saved?: string;
    replay_error?: string;
  }>;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const supportedSubjectTypes = ["all", "passport", "agent", "workflow"];

async function fetchRows(
  supabase: SupabaseServerClient,
  table: string,
  select = "*",
  limit = 120
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ReplayRow[]>();

  return {
    rows: error ? [] : data ?? [],
    unavailable: Boolean(error),
  };
}

async function createReplaySession(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trust-replay");
  }

  const requestedSubjectType = String(formData.get("subject_type") ?? "workflow");
  const subjectType = supportedSubjectTypes.includes(requestedSubjectType)
    ? requestedSubjectType
    : "workflow";
  const subjectId = String(formData.get("subject_id") ?? "").trim() || null;
  const requestedAsOf = String(formData.get("as_of") ?? replayDefaultAsOf());
  const asOf = Number.isNaN(new Date(requestedAsOf).getTime())
    ? replayDefaultAsOf()
    : new Date(requestedAsOf).toISOString();
  const replaySummary = String(formData.get("replay_summary") ?? "").trim();

  const { error } = await supabase.from("trust_replay_sessions").insert({
    subject_type: subjectType === "all" ? "workflow" : subjectType,
    subject_id: subjectId,
    replay_summary:
      replaySummary ||
      `Operational replay generated for ${subjectType} as of ${formatTimelineDate(asOf)}.`,
    generated_by: user.email ?? user.id,
  });

  const params = new URLSearchParams({
    subject_type: subjectType,
    as_of: asOf,
  });

  if (subjectId) params.set("subject_id", subjectId);
  params.set(error ? "replay_error" : "replay_saved", "1");

  redirect(`/trust-replay?${params.toString()}`);
}

function eventTitle(row: ReplayRow, fallback: string) {
  return String(
    row.event_title ??
      row.event_type ??
      row.event ??
      row.decision ??
      row.file_name ??
      row.relationship_type ??
      fallback
  );
}

function ReplayList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: ReplayRow[];
  empty: string;
}) {
  return (
    <section className="operational-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
          {rows.length}
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {rows.length ? (
          rows.slice(0, 10).map((row) => {
            const metadata = rowMetadata(row);
            return (
              <div key={String(row.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="font-medium text-zinc-100">{eventTitle(row, title)}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {String(
                    row.event_summary ??
                      row.explanation ??
                      row.notes ??
                      metadata.explanation ??
                      "Replay record preserved for operational governance memory."
                  )}
                </p>
                <p className="mt-3 text-xs text-zinc-600">
                  {formatTimelineDate(row.created_at)}
                </p>
              </div>
            );
          })
        ) : (
          <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}

function TimelineReplay({ events }: { events: TrustTimelineEvent[] }) {
  return (
    <section className="operational-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Replay Timeline</h2>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
          deterministic chronology
        </span>
      </div>
      <div className="replay-timeline mt-5 grid gap-3">
        {events.length ? (
          events.slice(0, 20).map((event) => (
            <div
              key={event.id}
              className="operational-card replay-event grid gap-3 p-4 md:grid-cols-[160px_1fr]"
            >
              <span className="replay-marker" aria-hidden="true" />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {formatTimelineDate(event.created_at)}
                </p>
                <p className="mt-3 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                  {replayStage(event.event_type)}
                </p>
              </div>
              <div>
                <p className="font-medium text-zinc-100">{event.event_title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {event.event_summary}
                </p>
                <p className="mt-3 text-xs text-zinc-600">
                  Actor: {event.actor_type ?? "system"} / Source: {event.source}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
            No timeline events are available for this replay window.
          </p>
        )}
      </div>
    </section>
  );
}

export default async function TrustReplayPage({ searchParams }: TrustReplayPageProps) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trust-replay");
  }

  const subjectType = supportedSubjectTypes.includes(String(query.subject_type))
    ? String(query.subject_type)
    : "all";
  const subjectId = String(query.subject_id ?? "").trim() || null;
  const asOf = query.as_of && !Number.isNaN(new Date(query.as_of).getTime())
    ? new Date(query.as_of).toISOString()
    : replayDefaultAsOf();

  const [
    timelineResult,
    evidenceResult,
    signalResult,
    decisionResult,
    auditResult,
    relationshipResult,
    sessionIntegrityResult,
    riskEventResult,
    replaySessionResult,
  ] = await Promise.all([
    fetchRows(supabase, "trust_timeline_events", "*", 200),
    fetchRows(supabase, "evidence_files", "*", 120),
    fetchRows(supabase, "signals", "*", 160),
    fetchRows(supabase, "decisions", "*", 120),
    fetchRows(supabase, "audit_logs", "*", 160),
    fetchRows(supabase, "trust_relationships", "*", 120),
    fetchRows(supabase, "session_integrity_checks", "*", 120),
    fetchRows(supabase, "interview_risk_events", "*", 120),
    fetchRows(supabase, "trust_replay_sessions", "*", 20),
  ]);
  const timelineRows = timelineResult.rows;
  const evidence = evidenceResult.rows;
  const signals = signalResult.rows;
  const decisions = decisionResult.rows;
  const auditLogs = auditResult.rows;
  const relationships = relationshipResult.rows;
  const sessionIntegrity = sessionIntegrityResult.rows;
  const riskEvents = riskEventResult.rows;
  const sessions = replaySessionResult.rows as ReplaySession[];
  const unavailableSources = [
    ["Replay Timeline", timelineResult.unavailable],
    ["Evidence Chain", evidenceResult.unavailable],
    ["Signals", signalResult.unavailable],
    ["Governance Review", decisionResult.unavailable],
    ["Audit History", auditResult.unavailable],
    ["Authorization Lineage", relationshipResult.unavailable],
    ["Session Integrity", sessionIntegrityResult.unavailable || riskEventResult.unavailable],
    ["Replay Sessions", replaySessionResult.unavailable],
  ]
    .filter(([, unavailable]) => unavailable)
    .map(([label]) => label);
  const aiSummaries = auditLogs.filter((row) =>
    ["ai_summary_generated", "governance_recommendation_created", "anomaly_review_recommended"].includes(
      String(row.event_type ?? "")
    )
  );
  const timelineEvents = timelineRows.map(normalizeStoredTimelineEvent);
  const snapshot = buildReplaySnapshot({
    subjectType,
    subjectId,
    asOf,
    evidence,
    signals,
    decisions,
    auditLogs,
    relationships,
    aiSummaries,
    timelineEvents,
  });
  const providerEvidence = snapshot.evidence
    .map((row) => rowMetadata(row))
    .find((metadata) => Array.isArray(metadata.provider_signals));
  const providerSignals = providerEvidence
    ? buildWorkflowProviderSignals({ evidenceSnapshot: providerEvidence })
    : [];
  const replayValidationRows = [
    ["What triggered", riskEvents.length ? "Session integrity or interview risk event" : signals.length ? "Workflow signal" : "No active trigger in this replay window"],
    ["Why it triggered", riskEvents[0]?.risk_reason ?? signals[0]?.event ?? "Replay is showing available workflow evidence without an active risk trigger."],
    ["Evidence used", `${snapshot.evidence.length} evidence record(s), ${snapshot.timelineEvents.length} timeline event(s), ${auditLogs.length} audit event(s)`],
    ["Reviewer actions", snapshot.decisions.length ? `${snapshot.decisions.length} governance decision(s) preserved` : "No reviewer action in this replay window"],
    ["Trust score changes", snapshot.timelineEvents.length ? "Timeline events preserve score movement when source records include score fields." : "No score movement recorded in this replay window"],
  ];
  const policyAudit = [...snapshot.auditLogs]
    .reverse()
    .find((row) => {
      const metadata = rowMetadata(row);
      return Boolean(
        metadata.policy_id ||
          metadata.policy_name ||
          metadata.policy_route ||
          metadata.replay_context
      );
    });
  const policyMetadata = policyAudit ? rowMetadata(policyAudit) : {};
  const replayContext =
    policyMetadata.replay_context &&
    typeof policyMetadata.replay_context === "object" &&
    !Array.isArray(policyMetadata.replay_context)
      ? (policyMetadata.replay_context as Record<string, unknown>)
      : {};
  const policyReplayRows = [
    [
      "Policy triggered",
      String(
        replayContext.policyTriggered ??
          policyMetadata.policy_name ??
          policyMetadata.policy_id ??
          "No policy evaluation retained in this replay window"
      ),
    ],
    [
      "Why escalation occurred",
      String(
        replayContext.whyEscalated ??
          "No replay-linked policy escalation reason was retained."
      ),
    ],
    [
      "Threshold that changed trust state",
      Array.isArray(replayContext.thresholdChanges)
        ? replayContext.thresholdChanges.map(String).join("; ")
        : "No policy threshold transition was retained.",
    ],
    [
      "Governance resolution",
      snapshot.decisions.length
        ? String(
            snapshot.decisions.at(-1)?.resolution_notes ??
              snapshot.decisions.at(-1)?.decision ??
              snapshot.decisions.at(-1)?.action_status ??
              "Governance action retained without resolution notes."
          )
        : String(
            replayContext.resolutionRequired ??
              "No governance resolution was recorded in this replay window."
          ),
    ],
  ];

  return (
    <main className="operational-shell min-h-screen px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          <Link href="/platform" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            Platform
          </Link>
          <Link href="/timeline" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            Timeline
          </Link>
          <Link href="/dashboard/governance" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            Governance Review
          </Link>
        </nav>

        <section className="operational-panel replay-signature mt-10 p-6 md:p-8">
          <p className="operational-eyebrow">
            TrustOps operational memory
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Operational memory for intelligent systems.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Replay Timeline is the signature Cyber Sentinels capability: one
            governed workflow chronology for humans, AI agents, operational
            outcomes, Authorization Lineage, Governance Review and Trust Posture
            transitions.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            It reconstructs the Evidence Chain, authorization changes, reviewer
            decisions, governed execution history, workflow outcome and audit
            context that existed at a point in time without mutating the
            underlying records.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Trust changes over time. Replay preserves governance memory and
            operational continuity without rewriting source evidence. Summaries
            remain secondary to the recorded chronology.
          </p>
          <div className="mt-5 max-w-3xl">
            <OnboardingHint area="replay" />
          </div>
        </section>

        {query.replay_saved ? (
          <div className="mt-6 rounded-lg border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">
            Replay session saved to operational memory.
          </div>
        ) : null}
        {query.replay_error ? (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">
            Replay could not be saved. The underlying evidence was not changed.
            Retry after confirming the operational connection is available.
          </div>
        ) : null}
        {unavailableSources.length ? (
          <div className="mt-6 rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
            Replay is incomplete because these sources could not be loaded:{" "}
            {unavailableSources.join(", ")}. Empty counts must not be treated as
            confirmed absence.
          </div>
        ) : null}

        <section className="operational-panel mt-8 p-5">
          <form className="grid gap-4 md:grid-cols-[1fr_2fr_2fr_auto]" action="/trust-replay">
            <label className="grid gap-2 text-sm text-zinc-400">
              Subject
              <select
                name="subject_type"
                defaultValue={subjectType}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
              >
                {supportedSubjectTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-400">
              Subject ID
              <input
                name="subject_id"
                defaultValue={subjectId ?? ""}
                placeholder="Optional UUID"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>
            <label className="grid gap-2 text-sm text-zinc-400">
              Replay as of
              <input
                name="as_of"
                type="datetime-local"
                defaultValue={asOf.slice(0, 16)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>
            <button className="self-end rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
              Reconstruct
            </button>
          </form>
        </section>

        <section aria-label="Replay operational snapshot" className="mt-8 grid gap-3 md:grid-cols-5">
          {[
            ["Trust Posture", snapshot.posture.label],
            ["Evidence Chain", snapshot.evidence.length],
            ["Governance Review", snapshot.decisions.length],
            ["Authorization Lineage", snapshot.relationships.length],
            ["Session Integrity", sessionIntegrity.length + riskEvents.length],
          ].map(([label, value]) => (
            <div key={label} className="operational-card p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Replay Summary</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
                {snapshot.summary}
              </p>
            </div>
            <form action={createReplaySession}>
              <input type="hidden" name="subject_type" value={subjectType} />
              <input type="hidden" name="subject_id" value={subjectId ?? ""} />
              <input type="hidden" name="as_of" value={asOf} />
              <input type="hidden" name="replay_summary" value={snapshot.summary} />
              <button className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
                Save Replay Session
              </button>
            </form>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                Trust Freshness
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {snapshot.posture.label}
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
                {snapshot.posture.explanation}. {snapshot.posture.nextReview}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${trustPostureClass(snapshot.posture.state)}`}>
              {snapshot.posture.reverificationRecommended ? "Reverification recommended" : "Current posture reviewable"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {snapshot.posture.continuityChecks.map((check) => (
              <div key={check} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
                {check}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <ProviderEvidencePanel
            signals={providerSignals}
            title="Provider-backed verification signal context"
            description="Replay keeps provider outputs as explainable verification evidence beside workflow events, decisions and audit history."
          />
        </div>

        <section className="operational-panel mt-8 p-5">
          <h2 className="text-xl font-semibold">Replay Integrity</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            Replay shows the trigger, reason, evidence, reviewer action and
            Trust Posture movement without claiming certainty beyond the record.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {replayValidationRows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{String(value)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="operational-panel mt-8 border-cyan-950 p-5">
          <h2 className="text-xl font-semibold">Governance Review and Policy Replay</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            Canonical replay keeps the policy, threshold crossing, escalation reason and reviewer resolution connected to the operational evidence available at the time.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {policyReplayRows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{String(value)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <TimelineReplay events={snapshot.timelineEvents} />
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Continuity Record</h2>
            <div className="mt-5 grid gap-3">
              {[
                ["Verification chronology", snapshot.timelineEvents.length ? "Timeline events preserve the order of workflow changes." : "No timeline events in this replay window."],
                ["Session events", sessionIntegrity.length + riskEvents.length ? "Session integrity and risk events are visible for review." : "No session events in this replay window."],
                ["Escalation history", snapshot.decisions.length ? "Governance decisions and reviewer actions are preserved." : "No governance decisions in this replay window."],
                ["Evidence chain", snapshot.evidence.length ? "Evidence records can be reviewed beside decisions, replay chronology, workflow outcome and audit history." : "No evidence records in this replay window."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium text-zinc-100">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Replay Sessions</h2>
            <div className="mt-5 grid gap-3">
              {sessions.length ? (
                sessions.map((session) => (
                  <Link href={`/replay/${session.id}`} key={session.id} className="block rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                    <p className="text-sm leading-6 text-zinc-300">
                      {session.replay_summary ?? "Replay session"}
                    </p>
                    <p className="mt-3 text-xs text-zinc-600">
                      {session.generated_by ?? "user"} / {formatTimelineDate(session.created_at)}
                    </p>
                    <p className="mt-3 text-xs text-cyan-300">Open replay &gt;</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No replay sessions saved yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <ReplayList
            title="Evidence Chain"
            rows={snapshot.evidence}
            empty="No evidence existed in this replay window."
          />
          <ReplayList
            title="Governance Actions"
            rows={snapshot.decisions}
            empty="No governance decisions existed in this replay window."
          />
          <ReplayList
            title="Signals"
            rows={snapshot.signals}
            empty="No signals existed in this replay window."
          />
          <ReplayList
            title="Session Integrity"
            rows={[...sessionIntegrity, ...riskEvents]}
            empty="No session integrity or interview risk events existed in this replay window."
          />
          <ReplayList
            title="Audit History"
            rows={snapshot.auditLogs}
            empty="No audit events existed in this replay window."
          />
          <ReplayList
            title="Relationships"
            rows={snapshot.relationships}
            empty="No trust relationships existed in this replay window."
          />
          <ReplayList
            title="Operational Summaries"
            rows={snapshot.aiSummaries}
            empty="No operational summaries existed in this replay window."
          />
        </section>
      </div>
    </main>
  );
}
