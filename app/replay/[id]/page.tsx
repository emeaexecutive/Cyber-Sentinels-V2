import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/phase-one-trust";
import { ProviderEvidencePanel } from "@/components/provider-evidence-panel";
import { DetectionEvidenceNote } from "@/components/session-integrity";
import {
  TrustJourneyVisualization,
  type TrustJourneyEvent,
  type TrustJourneyStage,
  type TrustJourneyState,
} from "@/components/trust-journey-visualization";
import { buildWorkflowProviderSignals } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;
type ReplayChronologyEvent = {
  id: string;
  type: string;
  title: unknown;
  summary: unknown;
  state: unknown;
  created_at: unknown;
  reviewer?: unknown;
  escalationReason?: unknown;
  workflowReference?: unknown;
  analystNote?: unknown;
};

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function label(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function occurredAt(row: Row) {
  return String(row.created_at ?? row.issued_at ?? "");
}

function trustStateForEvent(event: Row): TrustJourneyState {
  const combined = `${event.type ?? ""} ${event.title ?? ""} ${event.state ?? ""}`.toLowerCase();
  if (combined.includes("receipt")) return "trusted_workforce";
  if (combined.includes("replay")) return "replay_available";
  if (combined.includes("approved") || combined.includes("resolved")) return "verified";
  if (combined.includes("governance") || combined.includes("review")) return "governance_review";
  if (combined.includes("manual")) return "manual_review_required";
  if (combined.includes("injection") || combined.includes("integrity") || combined.includes("failed")) return "session_integrity_failed";
  if (combined.includes("risk") || combined.includes("escalated")) return "elevated_risk";
  return "verified";
}

function trustScoreForEvent(event: Row, index: number) {
  const state = trustStateForEvent(event);
  const baseByState: Record<TrustJourneyState, number> = {
    verified: 74,
    elevated_risk: 46,
    governance_review: 58,
    session_integrity_failed: 34,
    manual_review_required: 52,
    replay_available: 68,
    trusted_workforce: 88,
  };
  return Math.max(20, Math.min(96, baseByState[state] + index * 2));
}

function stageForEvent(event: Row): TrustJourneyStage {
  const text = `${event.type ?? ""} ${event.title ?? ""} ${event.summary ?? ""} ${event.state ?? ""}`.toLowerCase();
  if (text.includes("receipt")) return "receipt_issued";
  if (text.includes("approved") || text.includes("resolved") || text.includes("rejected") || text.includes("reviewer")) {
    return "manual_review_completed";
  }
  if (text.includes("governance") || text.includes("escalated")) return "governance_review_opened";
  if (text.includes("injection")) return "injection_risk_reviewed";
  if (text.includes("session") || text.includes("integrity") || text.includes("channel")) return "session_integrity_checked";
  if (text.includes("human") || text.includes("presence") || text.includes("liveness") || text.includes("identity")) {
    return "human_presence_checked";
  }
  return "identity_submitted";
}

export default async function VerificationReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/replay/${encodeURIComponent(id)}`);

  const { data: requestedReplay } = await supabase
    .from("trust_replay_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const subjectId = String(requestedReplay?.subject_id ?? id);
  const subjectType = String(requestedReplay?.subject_type ?? "interview_session");

  const [
    { data: session },
    { data: timeline },
    { data: evidenceChains },
    { data: governanceActions },
    { data: replaySessions },
    { data: receipts },
    { data: riskEvents },
    { data: auditRows },
  ] = await Promise.all([
    supabase.from("interview_sessions").select("*").eq("id", subjectId).maybeSingle(),
    supabase.from("trust_timeline_events").select("*").eq("subject_id", subjectId).order("created_at", { ascending: true }),
    supabase.from("evidence_chains").select("*").eq("subject_id", subjectId).order("created_at", { ascending: true }),
    supabase.from("governance_actions").select("*").eq("subject_id", subjectId).order("created_at", { ascending: true }),
    supabase.from("trust_replay_sessions").select("*").eq("subject_id", subjectId).order("created_at", { ascending: true }),
    supabase.from("verification_receipts").select("*").eq("subject_id", subjectId).order("issued_at", { ascending: false }),
    supabase.from("interview_risk_events").select("*").eq("interview_session_id", subjectId).order("created_at", { ascending: true }),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const auditLogs = (auditRows ?? []).filter((row) =>
    JSON.stringify(row.metadata ?? {}).includes(subjectId)
  );
  const chronology: ReplayChronologyEvent[] = [
    ...(timeline ?? []).map((row) => ({
      id: `timeline-${row.id}`,
      type: "timeline",
      title: row.event_title ?? row.event_type ?? "Verification event",
      summary: row.event_summary ?? "Verification state recorded.",
      state: row.severity ?? "info",
      created_at: row.created_at,
    })),
    ...(riskEvents ?? []).map((row) => ({
      id: `risk-${row.id}`,
      type: "signal",
      title: row.signal_type ?? "Integrity signal",
      summary: row.risk_reason ?? "Integrity flag retained for analyst review.",
      state: row.escalation_required ? "escalated" : "recorded",
      created_at: row.created_at,
      reviewer: row.escalation_required ? "Trust operations analyst" : "Session integrity reviewer",
      escalationReason: row.escalation_required
        ? label(row.risk_reason ?? row.signal_type, "Session integrity flag requires governance review")
        : "Recorded for chronology",
      workflowReference: `interview_session/${subjectId}`,
      analystNote: row.escalation_required
        ? "Review channel evidence before the workflow advances."
        : "No escalation required by this signal.",
    })),
    ...(governanceActions ?? []).map((row) => ({
      id: `governance-${row.id}`,
      type: "governance",
      title: "Governance action",
      summary: row.resolution_notes ?? "Reviewer action recorded for operational follow-up.",
      state: row.action_status ?? "pending",
      created_at: row.created_at,
      reviewer: row.assigned_to ?? row.resolved_by ?? row.created_by ?? "Trust operations reviewer",
      escalationReason: row.escalation_reason ?? row.action_type ?? "Governance review opened",
      workflowReference: `${row.subject_type ?? subjectType}/${row.subject_id ?? subjectId}`,
      analystNote: row.resolution_notes ?? "Reviewer action pending.",
    })),
    ...(evidenceChains ?? []).map((row) => ({
      id: `evidence-${row.id}`,
      type: "evidence",
      title: "Evidence retained",
      summary: row.chain_summary ?? "Evidence chain preserved with timestamp and subject reference.",
      state: "retained",
      created_at: row.created_at,
      reviewer: row.created_by ?? "Evidence reviewer",
      escalationReason: "Evidence retained for workflow review",
      workflowReference: `${row.subject_type ?? subjectType}/${row.subject_id ?? subjectId}`,
      analystNote: row.chain_summary ?? "Evidence chain preserved with timestamp and subject reference.",
    })),
    ...(receipts ?? []).map((row) => ({
      id: `receipt-${row.id}`,
      type: "receipt",
      title: "Verification receipt generated",
      summary: row.receipt_summary ?? "Enterprise verification receipt available for audit review.",
      state: row.verification_status ?? "generated",
      created_at: row.issued_at,
      reviewer: row.issued_by ?? "Receipt issuer",
      escalationReason: "Workflow outcome preserved for receipt review",
      workflowReference: `${row.subject_type ?? subjectType}/${row.subject_id ?? subjectId}`,
      analystNote: row.receipt_summary ?? "Verification receipt available for audit review.",
    })),
  ].sort((a, b) => new Date(occurredAt(a)).getTime() - new Date(occurredAt(b)).getTime());

  const latestGovernance = governanceActions?.at(-1);
  const latestEvidenceEvent = chronology.at(-1);
  const injectionEvent = (riskEvents ?? []).find((event) => /injection/i.test(String(event.signal_type ?? "")));
  const elevatedRiskEvent = (riskEvents ?? []).find((event) => event.escalation_required || /risk|fail|injection/i.test(String(event.signal_type ?? "")));
  const completed = Boolean(receipts?.length);
  const latestReceiptSnapshot = (receipts?.[0]?.evidence_snapshot ?? {}) as Record<string, unknown>;
  const providerSignals = buildWorkflowProviderSignals({
    evidenceSnapshot: latestReceiptSnapshot,
    providerVerificationState: receipts?.[0]?.verification_status ?? session?.verification_status,
    identityConfidence: latestReceiptSnapshot.identity_confidence,
    sessionIntegrity: session?.integrity_status,
    riskFlags: elevatedRiskEvent ? ["session_integrity_anomaly"] : [],
    evidenceReferences: [
      "Replay chronology",
      "Verification evidence",
      "Governance review",
      "Verification receipt",
    ],
  });
  const replayScoreBefore = elevatedRiskEvent ? 74 : latestGovernance ? 62 : 52;
  const replayScoreAfter = latestGovernance
    ? trustScoreForEvent(
        {
          type: "governance",
          title: "Governance action",
          state: latestGovernance.action_status,
        },
        chronology.length
      )
    : elevatedRiskEvent
      ? 42
      : replayScoreBefore;
  const reviewCompleted = ["approved", "rejected", "resolved"].includes(
    String(latestGovernance?.action_status ?? "")
  );
  const baselineJourneyEvents: TrustJourneyEvent[] = [
    {
      id: "baseline-verification-started",
      title: "Verification started",
      description: session?.title ?? "Verification workflow opened for operational replay.",
      occurredAt: session?.created_at ?? requestedReplay?.created_at,
      state: "manual_review_required",
      stage: "identity_submitted",
      evidenceLabel: "workflow record",
      flag: label(session?.status ?? session?.session_status, "started"),
      reviewer: "Workflow owner",
      escalationReason: "Verification workflow opened",
      workflowReference: `${subjectType}/${subjectId}`,
      analystNote: "Initial workflow state retained for replay.",
      score: 52,
    },
    {
      id: "baseline-replay-available",
      title: "Replay available",
      description: "Replay chronology is available for analyst and audit review.",
      occurredAt: requestedReplay?.created_at ?? chronology.at(-1)?.created_at,
      state: "replay_available",
      stage: "manual_review_completed",
      evidenceLabel: "replay evidence",
      flag: "Replay Available",
      reviewer: requestedReplay?.generated_by ?? "Trust operations reviewer",
      escalationReason: "Chronology generated for governance review",
      workflowReference: `${subjectType}/${subjectId}`,
      analystNote: requestedReplay?.replay_summary ?? "Replay chronology is available for analyst and audit review.",
      score: 68,
    },
  ];
  const trustJourneyEvents: TrustJourneyEvent[] = [
    ...baselineJourneyEvents,
    ...chronology.map((event, index) => ({
    id: event.id,
    title: label(event.title, "Verification milestone"),
    description: label(event.summary, "Trust state recorded for audit replay."),
    occurredAt: occurredAt(event),
    state: trustStateForEvent(event),
    stage: stageForEvent(event),
    evidenceLabel: label(event.type, "evidence"),
    flag: label(event.state, "recorded"),
    reviewerAction: event.type === "governance" ? label(event.summary, "Human review recorded.") : null,
    reviewer: label(event.reviewer, "Pending assignment"),
    escalationReason: label(event.escalationReason ?? event.state, "Not escalated"),
    workflowReference: label(event.workflowReference, `${subjectType}/${subjectId}`),
    analystNote: label(event.analystNote ?? event.summary, "No analyst note recorded"),
    score: trustScoreForEvent(event, index),
    })),
  ];
  const finalJourneyState: TrustJourneyState = receipts?.length
    ? "trusted_workforce"
    : latestGovernance
      ? "governance_review"
      : injectionEvent
        ? "session_integrity_failed"
        : "replay_available";

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-10 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap gap-3 text-sm print:hidden">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">Dashboard</Link>
          <Link href="/trust-replay" className="text-zinc-400 hover:text-white">Replay explorer</Link>
          {receipts?.[0] ? <Link href={`/verification/receipt/${receipts[0].id}`} className="text-cyan-200">Open receipt</Link> : null}
        </nav>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Verification Replay</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">{session?.title ?? "Verification workflow replay"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Read-only reconstruction of what happened, when state changed, which reviewer decision was taken, which evidence chain remains available and what workflow outcome is ready for audit review.
              </p>
              <p className="mt-2 font-mono text-xs text-zinc-600">Subject {subjectType} / {subjectId}</p>
            </div>
            <StatusBadge status={latestGovernance?.action_status ?? session?.integrity_status ?? "reviewable"} />
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Verification completed", completed ? "Recorded" : "Pending"],
            ["Review completed", reviewCompleted ? "Recorded" : "Pending"],
            ["Replay available", "Available"],
            ["Receipt generated", receipts?.length ? "Available" : "Pending"],
            ["Evidence retained", evidenceChains?.length ? "Retained" : "Pending"],
          ].map(([title, state]) => (
            <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{title}</p>
              <p className={`mt-2 text-sm font-semibold ${state === "Pending" ? "text-amber-200" : "text-emerald-200"}`}>{state}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Workflow continuity map</p>
          <h2 className="mt-2 text-xl font-semibold">Replay links governance, evidence and receipt outcome</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            This replay chronology connects the session integrity state, governance review, operational evidence,
            verification outcome and receipt record for the same workflow subject.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ["Session integrity", label(session?.integrity_status, "Reviewable"), `/trust/session/${subjectId}`],
              ["Governance review", label(latestGovernance?.action_status, "Pending"), "/dashboard/governance"],
              ["Operational evidence", `${evidenceChains?.length ?? 0} chain(s)`, "/evidence-vault"],
              ["Replay chronology", `${chronology.length} event(s)`, `/replay/${id}`],
              ["Verification receipt", receipts?.[0] ? label(receipts[0].verification_status, "Issued") : "Pending", receipts?.[0] ? `/verification/receipt/${receipts[0].id}` : "/verification-receipts"],
            ].map(([title, value, href]) => (
              <Link key={title} href={String(href)} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-700">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{title}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs uppercase text-zinc-600">Session integrity</p><p className="mt-2 text-sm">{label(session?.integrity_status, "Reviewable")}</p></div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs uppercase text-zinc-600">Injection risk</p><p className="mt-2 text-sm">{injectionEvent ? label(injectionEvent.signal_type) : "No recorded flag"}</p></div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs uppercase text-zinc-600">Governance outcome</p><p className="mt-2 text-sm">{label(latestGovernance?.action_status, "Pending")}</p></div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs uppercase text-zinc-600">Audit references</p><p className="mt-2 text-sm">{auditLogs.length}</p></div>
        </section>

        <section className="mt-8">
          <DetectionEvidenceNote
            title="Replay evidence explanation"
            markers={[
              `Why flagged: ${elevatedRiskEvent ? label(elevatedRiskEvent.risk_reason ?? elevatedRiskEvent.signal_type) : "No unresolved session integrity event is present in this replay."}`,
              "Confidence explanation: replay scores rank evidence strength and review urgency; they are not standalone media-authenticity conclusions.",
              `Evidence markers: ${chronology.length} retained event(s), ${evidenceChains?.length ?? 0} evidence chain(s), ${riskEvents?.length ?? 0} risk event(s), and reviewer actions when present.`,
              `Metadata/channel integrity summary: ${label(session?.integrity_status, "No channel integrity failure recorded")} with audit references preserved separately.`,
            ]}
            reportLanguage="Investigation export: list observed flags, retained evidence, channel or metadata state, governance action, reviewer notes and receipt status in chronological order."
          />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["What happened", session?.title ?? "Workflow reached review."],
            ["What was detected", injectionEvent ? label(injectionEvent.risk_reason ?? injectionEvent.signal_type) : "No unresolved session integrity events."],
            ["What action occurred", latestGovernance ? label(latestGovernance.resolution_notes ?? latestGovernance.action_status) : "No active governance escalations."],
          ].map(([title, value]) => (
            <div key={title} className="rounded-lg border border-cyan-950 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">{title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Replay validation</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
            This validation view explains what triggered, why it triggered, which evidence was used, what reviewer action occurred and how the trust score changed in this replay.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ["What triggered", elevatedRiskEvent ? label(elevatedRiskEvent.signal_type, "Session integrity event") : latestGovernance ? "Governance review" : "Replay generated"],
              ["Why it triggered", elevatedRiskEvent ? label(elevatedRiskEvent.risk_reason ?? elevatedRiskEvent.signal_type) : latestGovernance ? label(latestGovernance.escalation_reason ?? latestGovernance.action_type, "Reviewer action recorded") : "Replay requested for workflow evidence review"],
              ["Evidence used", `${chronology.length} chronology event(s), ${evidenceChains?.length ?? 0} evidence chain(s), ${auditLogs.length} audit reference(s)`],
              ["Reviewer actions", latestGovernance ? label(latestGovernance.resolution_notes ?? latestGovernance.action_status) : "No reviewer action attached yet"],
              ["Trust score changes", `${replayScoreBefore} -> ${replayScoreAfter} (${replayScoreAfter - replayScoreBefore >= 0 ? "+" : ""}${replayScoreAfter - replayScoreBefore})`],
            ].map(([title, value]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <ProviderEvidencePanel
            signals={providerSignals}
            title="Provider signals in replay chronology"
            description="External verification sources are shown as replayable workflow evidence. They support trust scores, receipts and governance review without replacing reviewer decisions."
          />
        </div>

        <div className="mt-8">
          <TrustJourneyVisualization
            title="Operational Trust Infrastructure replay"
            description="Verification milestones, integrity checks, injection-risk review, reviewer action and receipt outcome ordered as audit replay."
            events={trustJourneyEvents}
            finalState={finalJourneyState}
            proofState={{
              currentVerificationState: label(session?.verification_status ?? session?.session_status ?? session?.integrity_status, completed ? "Verified" : "Manual Review Required"),
              riskLevel: elevatedRiskEvent ? label(elevatedRiskEvent.risk_level ?? elevatedRiskEvent.signal_type, "Elevated") : "No elevated flag recorded",
              lastEvidenceEvent: latestEvidenceEvent ? `${label(latestEvidenceEvent.type)} / ${formatDate(latestEvidenceEvent.created_at)}` : "No evidence event recorded",
              reviewerAction: latestGovernance ? label(latestGovernance.resolution_notes ?? latestGovernance.action_status) : "Governance review pending",
              finalOutcome: receipts?.[0] ? label(receipts[0].verification_status, "Receipt issued") : "Receipt pending",
            }}
          />
        </div>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Evidence chronology</h2>
            <span className="text-xs text-zinc-500">{chronology.length} retained events</span>
          </div>
          <div className="mt-5 grid gap-3">
            {chronology.length ? chronology.map((event, index) => (
              <article key={event.id} className="grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 md:grid-cols-[110px_170px_1fr]">
                <div><p className="text-xs text-zinc-600">Step {index + 1}</p><p className="mt-2 text-xs text-zinc-500">{formatDate(event.created_at)}</p></div>
                <div><p className="text-xs uppercase tracking-[0.12em] text-cyan-300">{event.type}</p><p className="mt-2 text-sm font-semibold">{label(event.state)}</p></div>
                <div>
                  <p className="font-medium">{label(event.title)}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{label(event.summary, "Trust state recorded for audit replay.")}</p>
                  <p className="mt-3 text-xs text-zinc-600">
                    Continuity: {event.type === "governance" ? "reviewer decision affects workflow and receipt outcome" : event.type === "evidence" ? "evidence chain supports the replay chronology" : event.type === "receipt" ? "receipt preserves the final workflow state and audit-ready report" : "event retained for governance review"}
                  </p>
                </div>
              </article>
            )) : <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">No replay evidence available yet.</p>}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Session review history</h2>
            <div className="mt-4 grid gap-3">{(replaySessions ?? []).length ? (replaySessions ?? []).map((replay) => <div key={replay.id} className="rounded-lg border border-zinc-800 bg-black p-4"><p className="text-sm text-zinc-300">{replay.replay_summary}</p><p className="mt-2 text-xs text-zinc-600">{replay.generated_by ?? "system"} / {formatDate(replay.created_at)}</p></div>) : <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No replay evidence available yet.</p>}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Governance actions history</h2>
            <div className="mt-4 grid gap-3">{(governanceActions ?? []).length ? (governanceActions ?? []).map((action) => <div key={action.id} className="rounded-lg border border-zinc-800 bg-black p-4"><StatusBadge status={action.action_status ?? "pending"} /><p className="mt-3 text-sm text-zinc-400">{action.resolution_notes ?? "Reviewer action pending. Evidence remains available for analyst review."}</p><p className="mt-2 text-xs text-zinc-600">{formatDate(action.resolved_at ?? action.created_at)}</p></div>) : <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No active governance escalations.</p>}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
