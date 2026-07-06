import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { calculateTrustScoreV1 } from "@/lib/trust-score-engine";
import {
  buildPassportRelationships,
  relationshipLabel,
  type TrustRelationshipView,
} from "@/lib/trust-relationships/relationships";
import {
  buildDerivedPassportTimeline,
  formatTimelineDate,
  mergeTimelineEvents,
  normalizeStoredTimelineEvent,
  type TrustTimelineEvent,
} from "@/lib/trust-timeline/provenance";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type PassportViewerPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ai_governance?: string }>;
};

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function value(value: unknown, fallback = "Not recorded") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function latestAiAnalysis(row: AnyRow | null | undefined) {
  return asObject(asObject(row?.metadata).analysis);
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function friendlyStatus(status: unknown) {
  const normalized = String(status ?? "pending").toLowerCase();

  if (["verified", "approved", "allow", "complete", "completed"].includes(normalized)) {
    return "Verification completed";
  }

  if (["rejected", "denied", "deny"].includes(normalized)) {
    return "Additional review required";
  }

  if (["escalated", "manual_review", "in_review"].includes(normalized)) {
    return "Under review";
  }

  if (["needs_more_evidence", "evidence_requested"].includes(normalized)) {
    return "Awaiting evidence";
  }

  return "Pending review";
}

function nextAction(status: unknown, hasEvidence: boolean, hasDecision: boolean) {
  const friendly = friendlyStatus(status);

  if (!hasEvidence) {
    return "Upload evidence so reviewers can continue the verification workflow.";
  }

  if (hasDecision || friendly === "Verification completed") {
    return "Review the outcome, audit trail and notifications for the verification record.";
  }

  if (friendly === "Additional review required") {
    return "A review outcome needs attention. You can read updates or submit an appeal if needed.";
  }

  return "This passport is in operational review. Watch notifications for evidence requests or review updates.";
}

function rowMetadata(row: AnyRow) {
  const metadata = row.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function relatedEvent(row: AnyRow, passportId: string, caseIds: Set<string>) {
  const metadata = rowMetadata(row);
  const metaPassportId = String(metadata.passport_id ?? "");
  const metaCaseId = String(metadata.verification_case_id ?? "");

  return (
    metaPassportId === passportId ||
    (metaCaseId ? caseIds.has(metaCaseId) : false)
  );
}

function StatusChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-cyan-800 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-100">
      {children}
    </span>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">{label}</p>;
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

export default async function PassportViewerPage({
  params,
  searchParams,
}: PassportViewerPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/passports/${encodeURIComponent(id)}`);
  }

  const { data: passport } = await supabase
    .from("passports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!passport) {
    return (
      <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-semibold">Passport not found</h1>
          <Link href="/passports" className="mt-5 inline-flex text-sm text-cyan-200">
            Back to Trust Passports
          </Link>
        </div>
      </main>
    );
  }

  if (
    passport.user_email &&
    user.email !== passport.user_email &&
    !isAdminAllowlisted(user.email)
  ) {
    return (
      <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-semibold">Passport not available</h1>
          <p className="mt-3 text-sm text-zinc-400">
            You can only view passports linked to your account.
          </p>
          <Link href="/passports" className="mt-5 inline-flex text-sm text-cyan-200">
            Back to My Passports
          </Link>
        </div>
      </main>
    );
  }

  const { data: verificationCases } = await supabase
    .from("verification_cases")
    .select("*")
    .eq("passport_id", id)
    .order("created_at", { ascending: false });
  const cases = verificationCases ?? [];
  const caseIds = new Set(cases.map((item) => String(item.id)));
  const [{ data: passportEvidence }, { data: caseEvidence }] = await Promise.all([
    supabase
      .from("evidence_files")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false }),
    caseIds.size
      ? supabase
          .from("evidence_files")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as AnyRow[] }),
  ]);
  const evidenceById = new Map<string, AnyRow>();
  [...(passportEvidence ?? []), ...(caseEvidence ?? [])].forEach((row) =>
    evidenceById.set(String(row.id), row)
  );
  const evidence = [...evidenceById.values()];
  const [{ data: passportDecisions }, { data: caseDecisions }] = await Promise.all([
    supabase
      .from("decisions")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false }),
    caseIds.size
      ? supabase
          .from("decisions")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as AnyRow[] }),
  ]);
  const decisionById = new Map<string, AnyRow>();
  [...(passportDecisions ?? []), ...(caseDecisions ?? [])].forEach((row) =>
    decisionById.set(String(row.id), row)
  );
  const decisions = [...decisionById.values()];
  const [{ data: signalRows }, { data: auditRows }] = await Promise.all([
    supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const subjectNeedle = String(passport.subject_name ?? "").toLowerCase();
  const signals = (signalRows ?? [])
    .filter(
      (row) =>
        relatedEvent(row, id, caseIds) ||
        (subjectNeedle
          ? String(row.event ?? "").toLowerCase().includes(subjectNeedle)
          : false)
    )
    .slice(0, 12);
  const auditLogs = (auditRows ?? [])
    .filter((row) => relatedEvent(row, id, caseIds))
    .slice(0, 12);
  const [
    { data: notifications },
    { data: messageThreads },
    { data: appeals },
    { data: latestTrustRun },
    { data: latestAiSummary },
    { data: sourceRelationships },
    { data: targetRelationships },
    { data: storedTimeline },
  ] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("message_threads")
        .select("*")
        .eq("created_by_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("appeals")
        .select("*")
        .eq("submitted_by_user_id", user.id)
        .eq("passport_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("trust_algorithm_runs")
        .select("*")
        .eq("subject_type", "passport")
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("event_type", "ai_summary_generated")
        .eq("metadata->>subject_type", "passport")
        .eq("metadata->>subject_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("trust_relationships")
        .select("*")
        .eq("source_type", "passport")
        .eq("source_id", id)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("trust_relationships")
        .select("*")
        .eq("target_type", "passport")
        .eq("target_id", id)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("trust_timeline_events")
        .select("*")
        .eq("subject_type", "passport")
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
  const score = calculateTrustScoreV1({
    passport,
    evidence,
    decisions,
    auditLogs,
    signals,
  });
  const status =
    passport.verification_status ??
    passport.review_status ??
    passport.reality_passport_status ??
    "pending";
  const trustRunReasonCodes = [
    ...asStringArray(latestTrustRun?.positive_signals),
    ...asStringArray(latestTrustRun?.negative_signals),
    ...asStringArray(latestTrustRun?.missing_requirements),
  ];
  const aiAnalysis = latestAiAnalysis(latestAiSummary);
  const aiSourceReasoning = textList(aiAnalysis.source_reasoning);
  const aiObservations = textList(aiAnalysis.observations);
  const aiRecommendations = textList(aiAnalysis.recommendations);
  const storedRelationshipsById = new Map<string, AnyRow>();
  [...(sourceRelationships ?? []), ...(targetRelationships ?? [])].forEach((row) =>
    storedRelationshipsById.set(String(row.id), row)
  );
  const relationships = buildPassportRelationships({
    passport,
    verificationCases: cases,
    evidence,
    decisions,
    auditLogs,
    signals,
    trustRuns: latestTrustRun ? [latestTrustRun] : [],
    storedRelationships: [...storedRelationshipsById.values()],
  });
  const timelineEvents = mergeTimelineEvents(
    (storedTimeline ?? []).map(normalizeStoredTimelineEvent),
    buildDerivedPassportTimeline({
      passportId: id,
      evidence,
      decisions,
      auditLogs,
      signals,
      trustRuns: latestTrustRun ? [latestTrustRun] : [],
      relationships: [...storedRelationshipsById.values()],
    })
  ).slice(0, 12);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Passport
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                {value(passport.subject_name, "Unnamed passport")}
              </h1>
              <p className="mt-3 text-sm text-zinc-500">{id}</p>
            </div>
            {isAdminAllowlisted(user.email) ? (
              <Link
                href={`/trust-graph-engine?passport_id=${encodeURIComponent(id)}`}
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
              >
                Open Trust Graph
              </Link>
            ) : null}
            <Link
              href={`/trust-replay?subject_type=passport&subject_id=${encodeURIComponent(id)}`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-cyan-500"
            >
              Replay Trust History
            </Link>
          </div>
        </section>

        {query.ai_governance ? (
          <div className="mt-6 rounded-lg border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">
            {query.ai_governance === "missing_openai_key"
              ? "AI-assisted governance analysis is unavailable because OPENAI_API_KEY is not configured."
              : "AI-assisted governance analysis could not be generated. Human review remains available."}
          </div>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
              Verification Confidence
            </p>
            <p className="mt-3 text-4xl font-semibold">{score.score}</p>
            <p className="mt-1 text-sm text-cyan-200">{score.confidenceLabel}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Status</p>
            <div className="mt-4"><StatusChip>{friendlyStatus(status)}</StatusChip></div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Created</p>
            <p className="mt-3 text-lg text-zinc-100">{formatDate(passport.created_at)}</p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                Explainable Trust Algorithm
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {latestTrustRun?.score ?? "Not calculated"}
              </h2>
              <p className="mt-1 text-sm text-cyan-200">
                {value(latestTrustRun?.confidence_level, "Run the algorithm to classify this passport.")}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Trust Score Source: Heuristic Baseline
              </p>
            </div>
            <form action="/api/trust-algorithm/run" method="POST">
              <input type="hidden" name="subject_type" value="passport" />
              <input type="hidden" name="subject_id" value={id} />
              <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
                Recalculate Trust Score
              </button>
            </form>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            {value(latestTrustRun?.explanation, "No algorithm explanation has been recorded yet.")}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Recommended Action</p>
              <p className="mt-2 text-sm text-zinc-300">
                {value(latestTrustRun?.recommended_action, "Calculate trust score to generate an action.")}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Reason Codes</p>
              <p className="mt-2 text-sm text-zinc-300">
                {trustRunReasonCodes.length ? trustRunReasonCodes.join(", ") : "None recorded"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Last Calculated</p>
              <p className="mt-2 text-sm text-zinc-300">
                {formatDate(latestTrustRun?.created_at)}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                AI-assisted operational summary
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {value(aiAnalysis.title, "Operational Summary")}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                Cyber Sentinels uses AI-assisted analysis while maintaining human governance and explainable operational review.
              </p>
            </div>
            <form action="/api/ai-governance/analyze" method="POST">
              <input type="hidden" name="subject_type" value="passport" />
              <input type="hidden" name="subject_id" value={id} />
              <button className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
                Generate AI Summary
              </button>
            </form>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-zinc-300">
            {value(aiAnalysis.explanation, "No AI-assisted operational summary has been generated yet.")}
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-600">Operational Context</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {value(aiAnalysis.operational_context, "Generate a summary to review operational context.")}
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
              <p className="mt-2 text-sm text-zinc-300">{formatDate(latestAiSummary?.created_at)}</p>
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
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
            Next Required Action
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {friendlyStatus(status)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            {nextAction(status, evidence.length > 0, decisions.length > 0)}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!evidence.length ? (
              <Link
                href="/evidence-upload"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white"
              >
                Upload Evidence
              </Link>
            ) : null}
            <Link
              href="/notifications"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              View Notifications
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                Replay Trust History
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Operational memory for this passport
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                Review historical trust progression, evidence evolution,
                governance decisions and signals over time. Replay is read-only
                and does not mutate audit trails or governance history.
              </p>
            </div>
            <Link
              href={`/trust-replay?subject_type=passport&subject_id=${encodeURIComponent(id)}`}
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
            >
              Open Replay
            </Link>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Relationship View">
            {relationships.length ? (
              relationships.map((relationship) => (
                <RelationshipItem key={relationship.id} relationship={relationship} />
              ))
            ) : (
              <Empty label="No relationships are available yet. Evidence, decisions, signals and audit activity will create explainable links as this passport moves through review." />
            )}
          </Panel>

          <Panel title="Verification Chronology">
            <p className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-500">
              Cyber Sentinels provides operational chronology and explainable
              trust history for evidence, review, trust changes, governance
              actions and audit events.
            </p>
            {timelineEvents.length ? (
              timelineEvents.map((event) => (
                <TimelineItem key={event.id} event={event} />
              ))
            ) : (
              <Empty label="No timeline events are available yet. Workflow activity will appear here as provenance is recorded." />
            )}
          </Panel>

          <Panel title="Evidence">
            {evidence.length ? (
              evidence.map((item) => (
                <div key={String(item.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium">{value(item.file_name ?? item.file_url, "Evidence file")}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {value(item.evidence_type ?? item.file_type)} / {friendlyStatus(item.status ?? item.scan_status)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(item.created_at)}</p>
                </div>
              ))
            ) : (
              <Empty label="No evidence has been uploaded yet. Add supporting records when you are ready to continue the workflow." />
            )}
          </Panel>

          <Panel title="Decisions">
            {decisions.length ? (
              decisions.map((decision) => (
                <div key={String(decision.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium">{value(decision.decision, "Decision")}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {friendlyStatus(decision.status)} / {value(decision.actor ?? decision.decided_by)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(decision.created_at)}</p>
                </div>
              ))
            ) : (
              <Empty label="No decision has been recorded yet. The verification workflow may still be in operational review." />
            )}
          </Panel>

          <Panel title="Trust Events">
            {signals.length ? (
              signals.map((signal) => (
                <div key={String(signal.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-300">{value(signal.event)}</p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                </div>
              ))
            ) : (
              <Empty label="No trust events yet. Workflow updates will appear here as the review progresses." />
            )}
          </Panel>

          <Panel title="Audit Trail">
            {auditLogs.length ? (
              auditLogs.map((log) => (
                <div key={String(log.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-300">{value(log.event_type)}</p>
                  <p className="mt-1 text-sm text-zinc-500">{value(log.actor)}</p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(log.created_at)}</p>
                </div>
              ))
            ) : (
              <Empty label="No audit activity yet. Review history will appear here when actions are recorded." />
            )}
          </Panel>

          <Panel title="Notifications">
            {(notifications ?? []).length ? (
              (notifications ?? []).map((notification) => (
                <div key={String(notification.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium text-zinc-100">
                    {value(notification.title, "Notification")}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {value(notification.body, "Update recorded.")}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <Empty label="No notifications yet. Operational updates will appear here when the workflow changes." />
            )}
          </Panel>

          <Panel title="Recent Messages">
            {(messageThreads ?? []).length ? (
              (messageThreads ?? []).map((thread) => (
                <Link
                  key={String(thread.id)}
                  href="/messages"
                  className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
                >
                  <p className="font-medium text-zinc-100">
                    {value(thread.subject, "Message thread")}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {value(thread.status, "open")}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(thread.updated_at ?? thread.created_at)}
                  </p>
                </Link>
              ))
            ) : (
              <Empty label="No messages yet. Start a message thread if you need help with this verification workflow." />
            )}
          </Panel>

          <Panel title="Appeal Status">
            {(appeals ?? []).length ? (
              (appeals ?? []).map((appeal) => (
                <Link
                  key={String(appeal.id)}
                  href="/appeals"
                  className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800"
                >
                  <p className="font-medium text-zinc-100">
                    {value(appeal.status, "submitted")}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {value(appeal.resolution_notes, "Awaiting human review.")}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {formatDate(appeal.created_at)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-500">
                  No appeal submitted. Appeals are available when a review
                  outcome needs another look.
                </p>
                <Link
                  href="/appeals"
                  className="mt-3 inline-flex rounded-lg border border-cyan-800 px-3 py-2 text-sm text-cyan-100 hover:text-white"
                >
                  Submit Appeal
                </Link>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
