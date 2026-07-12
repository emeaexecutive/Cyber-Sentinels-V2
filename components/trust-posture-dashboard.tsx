import Link from "next/link";
import { DecisionSummary } from "@/components/executive-summary";
import {
  Activity,
  BadgeCheck,
  ClipboardCheck,
  History,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  TrustJourneyVisualization,
  type TrustJourneyEvent,
  type TrustJourneyState,
} from "@/components/trust-journey-visualization";
import type {
  TrustPostureDashboardSnapshot,
} from "@/lib/trust-posture/dashboard";
import type { TrustPostureBadge as TrustPostureBadgeType } from "@/lib/trust-posture/posture";
import { ContinuousTrustLifecycleDashboard } from "@/components/continuous-trust-lifecycle-dashboard";
import { projectOperationalStateToLifecycle } from "@/lib/core/trust-lifecycle";

const badgeDetails: Record<TrustPostureBadgeType, { label: string; className: string }> = {
  trusted: { label: "Trusted", className: "border-emerald-800 text-emerald-200" },
  context_shift: { label: "Context Shift Detected", className: "border-cyan-800 text-cyan-100" },
  elevated_risk: { label: "Elevated Risk", className: "border-red-800 text-red-200" },
  reverification_due: { label: "Reverification Due", className: "border-amber-800 text-amber-200" },
  governance_review: { label: "Governance Review", className: "border-amber-800 text-amber-100" },
};

const lifecycleStages = [
  ["current", "Current", "Evidence and authority remain inside the active window."],
  ["decaying", "Decay", "Freshness reaches a checkpoint and review priority increases."],
  ["escalated", "Escalate", "Risk or governance state interrupts ordinary reliance."],
  ["recovered", "Recover", "Recorded review or new evidence restores a current posture."],
  ["reverification_due", "Re-verify", "Expired or missing evidence must be refreshed."],
] as const;

export function TrustPostureBadge({ value }: { value: TrustPostureBadgeType }) {
  const badge = badgeDetails[value];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function clean(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function journeyStateForPosture(value: unknown): TrustJourneyState {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("trusted")) return "trusted_workforce";
  if (text.includes("replay")) return "replay_available";
  if (text.includes("governance") || text.includes("review")) return "governance_review";
  if (text.includes("manual")) return "manual_review_required";
  if (text.includes("integrity") || text.includes("session")) return "session_integrity_failed";
  if (text.includes("risk") || text.includes("anomaly") || text.includes("changed")) return "elevated_risk";
  return "verified";
}

export function TrustPostureDashboard({
  snapshot,
  enterprise = false,
}: {
  snapshot: TrustPostureDashboardSnapshot;
  enterprise?: boolean;
}) {
  const lifecycleSnapshot = projectOperationalStateToLifecycle({
    activeTrustLevel: snapshot.activeTrustLevel,
    activeTrustLabel: snapshot.activeTrustLabel,
    evidenceCount: snapshot.recentEvents.length,
    reviewCount: snapshot.reviewQueue.length,
    anomalyCount: snapshot.sessionAnomalies.length,
    contextChangeCount: snapshot.metrics.contextChanges,
    latestEventAt: snapshot.recentEvents[0]?.created_at,
  });
  const metrics = [
    ["Context changes", snapshot.metrics.contextChanges, Activity],
    ["Reverification due", snapshot.metrics.reverificationDue, RefreshCw],
    ["Governance reviews", snapshot.metrics.governanceReviews, ClipboardCheck],
    ["Elevated indicators", snapshot.metrics.elevatedIndicators, ShieldAlert],
    ["Recent trust events", snapshot.metrics.recentEvents, History],
  ] as const;
  const journeyEvents: TrustJourneyEvent[] = [
    {
      id: "active-trust-level",
      title: "Identity submitted",
      description: snapshot.activeTrustLabel,
      occurredAt: snapshot.summaries[0]?.updatedAt ?? snapshot.recentEvents[0]?.created_at,
      state: snapshot.badge === "trusted" ? "trusted_workforce" : journeyStateForPosture(snapshot.badge),
      stage: "identity_submitted",
      evidenceLabel: "active posture",
      flag: snapshot.activeTrustLabel,
      score: snapshot.activeTrustLevel,
      workflowReference: "trust posture / active state",
      analystNote: "Trust posture changes are derived from consented workflow records.",
    },
    ...snapshot.recentEvents.slice(0, 5).map((row, index): TrustJourneyEvent => ({
      id: `recent-${row.id ?? index}`,
      title: clean(row.posture_label, "Verification milestone"),
      description: clean(row.explanation, "Existing verification, session or timeline event retained for audit review."),
      occurredAt: row.created_at,
      state: journeyStateForPosture(`${row.posture_source ?? ""} ${row.posture_label ?? ""} ${row.explanation ?? ""}`),
      stage: String(row.posture_source ?? "").includes("session")
        ? "session_integrity_checked"
        : String(row.posture_source ?? "").includes("signal")
          ? "injection_risk_reviewed"
          : "human_presence_checked",
      evidenceLabel: clean(row.posture_source, "timeline"),
      flag: clean(row.posture_label, "recorded"),
      score: Number.isFinite(Number(row.score ?? row.trust_score ?? row.confidence_score))
        ? Number(row.score ?? row.trust_score ?? row.confidence_score)
        : null,
      reviewer: "Workflow reviewer",
      escalationReason: clean(row.posture_label, "Trust state changed"),
      workflowReference: clean(row.posture_source, "trust posture event"),
      analystNote: "Event retained for replayable trust history.",
    })),
    ...snapshot.reviewQueue.slice(0, 3).map((row, index): TrustJourneyEvent => ({
      id: `review-${row.id ?? index}`,
      title: row.posture_queue_type === "session" ? "Session integrity checked" : "Governance review opened",
      description: clean(row.resolution_notes ?? row.review_summary, "Human review remains required before the posture is current."),
      occurredAt: row.created_at,
      state: row.posture_queue_type === "session" ? "session_integrity_failed" : "governance_review",
      stage: row.posture_queue_type === "session" ? "session_integrity_checked" : "governance_review_opened",
      evidenceLabel: row.posture_queue_type === "session" ? "session review" : "governance action",
      reviewerAction: clean(row.resolution_notes ?? row.action_status, "review pending"),
      score: null,
      reviewer: "Governance reviewer",
      escalationReason: "Review keeps trust-state transition accountable",
      workflowReference: clean(row.posture_queue_type, "review queue"),
      analystNote: "Reviewer intervention is part of governance continuity.",
    })),
    ...snapshot.elevatedRisk.slice(0, 3).map((row, index): TrustJourneyEvent => ({
      id: `risk-${row.id ?? index}`,
      title: String(row.category ?? "").includes("injection") ? "Injection risk reviewed" : clean(row.category, "Elevated risk indicator"),
      description: clean(row.explanation, "Risk indicator retained for reviewer action."),
      occurredAt: row.created_at,
      state: row.requires_manual_review ? "manual_review_required" : "elevated_risk",
      stage: "injection_risk_reviewed",
      evidenceLabel: clean(row.category, "risk flag"),
      flag: clean(row.risk_level, "elevated"),
      score: Number.isFinite(Number(row.score ?? row.trust_score ?? row.confidence_score))
        ? Number(row.score ?? row.trust_score ?? row.confidence_score)
        : null,
      reviewer: "Trust operations reviewer",
      escalationReason: clean(row.explanation, "Elevated signal requires review"),
      workflowReference: clean(row.category, "risk event"),
      analystNote: "Risk signal is review context, not surveillance.",
    })),
  ];
  const authorizationEvent: TrustJourneyEvent = {
    id: "authorization-lineage",
    title: "Authorization lineage reviewed",
    description: "Workflow access, reviewer ownership and evidence history stay connected as posture changes.",
    occurredAt: snapshot.recentEvents[0]?.created_at ?? snapshot.summaries[0]?.updatedAt,
    state: snapshot.reviewQueue.length ? "governance_review" : "verified",
    stage: "authorization_changed",
    evidenceLabel: "authorization lineage",
    flag: snapshot.reviewQueue.length ? "review required" : "lineage current",
    reviewer: snapshot.reviewQueue.length ? "Governance reviewer" : "Workflow owner",
    escalationReason: "Authorization depends on evidence continuity and governance state",
    workflowReference: "trust posture / authorization",
    analystNote: "No hidden tracking; posture is derived from workflow records.",
    score: null,
  };
  const finalJourneyState: TrustJourneyState = snapshot.reviewQueue.length
    ? "governance_review"
    : snapshot.elevatedRisk.length
      ? "elevated_risk"
      : "trusted_workforce";

  return (
    <main className="operational-shell min-h-screen px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">
            {enterprise ? "Enterprise Trust Posture" : "Persistent Trust Posture"}
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1 className="text-4xl font-semibold md:text-5xl">
                {enterprise ? "Trust Posture Operations" : "Active Trust Posture"}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Verification is a point-in-time event; trust is continuous. This
                view keeps posture changes across humans, AI agents, non-human
                identities, workflows, approvals and runtime sessions visible
                as evidence, authorization and Governance Review evolve.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
                Cyber Sentinels creates replayable operational trust memory across enterprise workflows.
              </p>
            </div>
            <TrustPostureBadge value={snapshot.badge} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/governance" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:border-cyan-400">
              Governance Queue
            </Link>
            <Link href="/trust-replay" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
              Review Replay
            </Link>
            <Link href="/dashboard/session-integrity" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
              Session Integrity
            </Link>
          </div>
        </section>

        <div className="mt-6">
          <DecisionSummary items={[
            { label: "Current posture", value: snapshot.posture.label },
            { label: "Current risks", value: `${snapshot.elevatedRisk.length} elevated risk(s); ${snapshot.reviewQueue.length} review item(s)` },
            { label: "Recommended action", value: snapshot.reviewQueue.length ? "Open Governance Queue and assign review" : snapshot.posture.nextReview },
            { label: "Evidence available", value: `${snapshot.recentEvents.length} recent trust event(s)` },
            { label: "Confidence", value: snapshot.activeTrustLevel === null ? "No numeric posture recorded" : "Evidence-backed posture available" },
            { label: "Responsible owner", value: snapshot.reviewQueue.length ? "Governance reviewer" : "Workflow owner" },
          ]} />
        </div>

        <ContinuousTrustLifecycleDashboard snapshot={lifecycleSnapshot} />

        <section className="mt-8 grid gap-3 md:grid-cols-[1.2fr_2fr]">
          <div className="operational-card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Current verification state</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-100">
              {snapshot.activeTrustLabel}
            </p>
            <p className="mt-2 text-sm text-cyan-200">
              {snapshot.activeTrustLevel === null ? "No numeric posture recorded" : "Evidence-backed posture available"}
            </p>
          </div>
          <div className="operational-card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Reverification status</p>
            <h2 className="mt-3 text-xl font-semibold">{snapshot.posture.label}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {snapshot.posture.explanation}. {snapshot.posture.nextReview}
              </p>
              <p className="mt-3 text-sm leading-6 text-cyan-100">
                Recalculation reason: {snapshot.posture.recalculationReason}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-zinc-500">
                Governance review state: {snapshot.posture.governanceReviewState}
              </p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="operational-eyebrow">Posture lifecycle</p>
              <h2 className="mt-2 text-xl font-semibold capitalize">
                Current phase: {snapshot.posture.lifecyclePhase.replaceAll("_", " ")}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                {snapshot.posture.lifecycleExplanation}
              </p>
            </div>
            <Link href="/trust-replay" className="text-sm font-semibold text-cyan-200 hover:text-white">
              Review how posture changed
            </Link>
          </div>
          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2 xl:grid-cols-5">
            {lifecycleStages.map(([phase, title, explanation]) => {
              const active = phase === snapshot.posture.lifecyclePhase;
              return (
                <article key={title} className={`min-w-0 p-4 ${active ? "bg-cyan-950/40" : "bg-black"}`}>
                  <p className={`text-sm font-semibold ${active ? "text-cyan-100" : "text-zinc-200"}`}>{title}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{explanation}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <TrustJourneyVisualization
            title="Trust posture journey"
            description="Operational progression across Continuous Verification, Authorization Lineage, Session Integrity, Governance Review and Replay Timeline."
            events={[...journeyEvents, authorizationEvent]}
            finalState={finalJourneyState}
            proofState={{
              currentVerificationState: snapshot.activeTrustLabel,
              riskLevel: snapshot.elevatedRisk.length ? clean(snapshot.elevatedRisk[0].risk_level, "elevated") : "No elevated flag visible",
              lastEvidenceEvent: snapshot.recentEvents[0]
                ? `${clean(snapshot.recentEvents[0].posture_label)} / ${formatDate(snapshot.recentEvents[0].created_at)}`
                : "No recent event recorded",
              trustStateChange: snapshot.posture.label,
              authorizationLineage: snapshot.reviewQueue.length ? "review-gated authorization" : "lineage current",
              evidenceContinuity: `${snapshot.metrics.recentEvents} recent trust event(s)`,
              reviewerAction: snapshot.reviewQueue[0]
                ? clean(snapshot.reviewQueue[0].resolution_notes ?? snapshot.reviewQueue[0].action_status, "Review pending")
                : "No open reviewer action",
              finalOutcome: snapshot.reviewQueue.length ? "Review pending" : snapshot.badge,
            }}
          />
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map(([label, value, Icon]) => (
            <div key={label} className="operational-card p-4">
              <Icon className="h-5 w-5 text-cyan-300" />
              <p className="mt-4 text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Context and Trust Posture Shifts</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            Explainable changes from existing verification, session and governance records.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.contextualSignals.map((signal) => (
              <article key={`${signal.type}-${signal.label}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-zinc-100">{signal.label}</h3>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-300">
                    {signal.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{signal.explanation}</p>
                <p className="mt-3 text-xs text-zinc-600">{formatDate(signal.observedAt)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Posture Summaries</h2>
              <p className="mt-2 text-sm text-zinc-500">Current human, AI-agent, non-human identity, workflow, approval and runtime-session posture in one readable queue.</p>
            </div>
            <BadgeCheck className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="mt-5 grid gap-3">
            {snapshot.summaries.length ? snapshot.summaries.map((item) => (
              <div key={`${item.context}-${item.id}`} className="grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto] md:items-center">
                <div>
                  <p className="font-medium text-zinc-100">{item.subject}</p>
                  <p className="mt-1 text-xs capitalize text-zinc-600">{item.context} / {item.id.slice(0, 8)}</p>
                </div>
                <p className="text-sm capitalize text-zinc-300">{item.level}</p>
                <p className="text-xs text-zinc-500">{formatDate(item.updatedAt)}</p>
                <TrustPostureBadge value={item.badge} />
              </div>
            )) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                No human, agent or workflow posture records are available yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Review Queue</h2>
            <div className="mt-5 grid gap-3">
              {snapshot.reviewQueue.length ? snapshot.reviewQueue.map((row, index) => (
                <div key={`${row.posture_queue_type}-${row.id ?? index}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium capitalize text-zinc-100">
                      {row.posture_queue_type === "session" ? "Session integrity review" : clean(row.action_type, "Governance review")}
                    </p>
                    <TrustPostureBadge value="governance_review" />
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {clean(row.resolution_notes ?? row.review_summary, "Human review remains required before posture is treated as current.")}
                  </p>
                  <p className="mt-3 text-xs text-zinc-600">{formatDate(row.created_at)}</p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No open governance or session reviews.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Elevated Risk And Anomalies</h2>
            <div className="mt-5 grid gap-3">
              {snapshot.elevatedRisk.length ? snapshot.elevatedRisk.map((row, index) => (
                <div key={`${row.id ?? index}`} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium capitalize text-zinc-100">{clean(row.category, "Risk indicator")}</p>
                    <TrustPostureBadge value="elevated_risk" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{clean(row.explanation, "Review the linked evidence and session context.")}</p>
                  <p className="mt-3 text-xs text-zinc-600">
                    Risk {clean(row.risk_level)} / {formatDate(row.created_at)}
                  </p>
                </div>
              )) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No elevated session indicators are visible.</p>
              )}
            </div>
          </div>
        </section>

        {snapshot.sessionAnomalies.length ? (
          <section className="mt-8 rounded-lg border border-amber-900 bg-amber-950/10 p-5">
            <h2 className="text-xl font-semibold text-amber-100">Session Anomaly Visibility</h2>
            <p className="mt-3 text-sm leading-6 text-amber-100/70">
              {snapshot.sessionAnomalies.length} session anomaly indicator{snapshot.sessionAnomalies.length === 1 ? "" : "s"} require evidence-aware review. Anomalies are context, not conclusions.
            </p>
          </section>
        ) : null}

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Recent Trust Events</h2>
              <p className="mt-2 text-sm text-zinc-500">Identity, authorization, session and governance activity ordered for Replay Timeline review.</p>
            </div>
            <Link href="/trust-replay" className="text-sm text-cyan-200 hover:text-white">Open replay</Link>
          </div>
          <div className="mt-5 grid gap-3">
            {snapshot.recentEvents.length ? snapshot.recentEvents.map((row, index) => (
              <div key={`${row.posture_source}-${row.id ?? index}`} className="grid gap-2 rounded-lg border border-zinc-800 bg-black p-4 md:grid-cols-[0.7fr_2fr_auto] md:items-center">
                <span className="text-xs uppercase tracking-[0.14em] text-zinc-600">{clean(row.posture_source)}</span>
                <div>
                  <p className="text-sm font-medium capitalize text-zinc-200">{clean(row.posture_label)}</p>
                  {row.explanation ? <p className="mt-1 text-xs leading-5 text-zinc-500">{clean(row.explanation)}</p> : null}
                </div>
                <p className="text-xs text-zinc-600">{formatDate(row.created_at)}</p>
              </div>
            )) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No recent trust events are available.</p>
            )}
          </div>
        </section>

        <p className="mt-8 text-xs leading-5 text-zinc-600">
          Trust posture is an explainable operational indicator. It does not automate approval, rejection or identity judgment.
        </p>
      </div>
    </main>
  );
}
