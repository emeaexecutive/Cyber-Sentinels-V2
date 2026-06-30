import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OnboardingHint } from "@/components/onboarding-walkthrough";
import { StatusBadge } from "@/components/phase-one-trust";
import { PrintReceiptButton } from "@/components/print-receipt-button";
import { ProviderEvidencePanel } from "@/components/provider-evidence-panel";
import { DetectionEvidenceNote } from "@/components/session-integrity";
import {
  TrustJourneyVisualization,
  type TrustJourneyEvent,
  type TrustJourneyState,
} from "@/components/trust-journey-visualization";
import { createClient } from "@/lib/supabase/server";
import {
  buildTrustPosture,
  latestCreatedAt,
  trustPostureClass,
} from "@/lib/trust-posture/posture";
import { buildWorkflowProviderSignals } from "@/lib/providers";
import {
  buildPortableTrustEvidence,
  verifyReceiptContinuity,
} from "@/lib/trust-receipts/verification";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function label(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function evidenceItems(value: unknown) {
  return Array.isArray(value) ? (value as JsonRecord[]) : [];
}

function DetailRow({ label: rowLabel, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{rowLabel}</p>
      <p className="mt-2 text-sm text-zinc-300">{label(value)}</p>
    </div>
  );
}

function stateFromText(value: unknown): TrustJourneyState {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("approved") || text.includes("verified") || text.includes("complete")) return "verified";
  if (text.includes("receipt") || text.includes("issued")) return "trusted_workforce";
  if (text.includes("replay")) return "replay_available";
  if (text.includes("integrity") && (text.includes("fail") || text.includes("risk"))) return "session_integrity_failed";
  if (text.includes("manual")) return "manual_review_required";
  if (text.includes("governance") || text.includes("review") || text.includes("pending")) return "governance_review";
  if (text.includes("risk") || text.includes("deepfake") || text.includes("injection")) return "elevated_risk";
  return "verified";
}

function DemoReceipt() {
  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white sm:px-6 md:px-8">
      <div className="mx-auto max-w-5xl">
        <nav className="flex flex-wrap gap-3 text-sm print:hidden">
          <Link href="/demo" className="text-zinc-300 hover:text-white">Demo overview</Link>
          <Link href="/replay/demo" className="text-cyan-200">Open Replay Timeline</Link>
          <Link href="/enterprise/hiring-security" className="text-zinc-300 hover:text-white">Hiring Security</Link>
        </nav>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Controlled demonstration · simulated evidence
              </p>
              <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Verification Receipt</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
                A portable summary of the evidence, governance action and workflow
                state retained for this synthetic hiring scenario.
              </p>
            </div>
            <StatusBadge status="restricted" />
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Receipt ID", "DEMO-RECEIPT-001"],
            ["Issued", "30 Jun 2026 · 10:10"],
            ["Trust Posture", "Restricted"],
            ["Evidence Source", "Simulated"],
          ].map(([title, value]) => (
            <DetailRow key={title} label={title} value={value} />
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Chain</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-zinc-200">
              <li className="rounded-lg border border-zinc-800 bg-black p-4">Synthetic candidate profile and consented workflow record.</li>
              <li className="rounded-lg border border-zinc-800 bg-black p-4">Simulated provider-response fixture, explicitly not live.</li>
              <li className="rounded-lg border border-zinc-800 bg-black p-4">Controlled Session Integrity anomaly and Replay Timeline.</li>
            </ul>
          </article>
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Governance Review</h2>
            <dl className="mt-4 grid gap-3">
              <DetailRow label="Reviewer" value="Morgan Lee · Trust Operations" />
              <DetailRow label="Decision" value="Restrict workflow progression" />
              <DetailRow label="Rationale" value="Session continuity changed after intake; stronger evidence is required before progression." />
            </dl>
          </article>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <h2 className="text-xl font-semibold">Receipt boundary</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            This demonstration receipt proves that a controlled workflow record was
            retained and reviewed. It does not prove identity, guarantee authenticity,
            establish biometric certainty or report live provider performance.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 print:hidden">
            <Link href="/replay/demo" className="brand-primary-action">Review Replay Timeline</Link>
            <Link href="/enterprise-access" className="brand-secondary-action">Request Enterprise Access</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function TrustReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "demo") {
    return <DemoReceipt />;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/trust/receipt/${encodeURIComponent(id)}`);
  }

  const { data: receipt } = await supabase
    .from("verification_receipts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!receipt) {
    notFound();
  }

  const [
    { data: evidenceChains },
    { data: timeline },
    { data: governanceActions },
    { data: receiptRelationships },
    { data: subjectRelationships },
    { data: auditLogs },
    { data: sessionIntegrity },
    { data: riskEvents },
    { data: replaySessions },
  ] = await Promise.all([
    supabase
      .from("evidence_chains")
      .select("*")
      .eq("subject_type", receipt.subject_type)
      .eq("subject_id", receipt.subject_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trust_timeline_events")
      .select("*")
      .eq("subject_type", receipt.subject_type)
      .eq("subject_id", receipt.subject_id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("governance_actions")
      .select("*")
      .eq("subject_type", receipt.subject_type)
      .eq("subject_id", receipt.subject_id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("trust_relationships")
      .select("*")
      .eq("source_type", "verification_receipt")
      .eq("source_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("trust_relationships")
      .select("*")
      .eq("target_type", receipt.subject_type)
      .eq("target_id", receipt.subject_id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("event_type", "verification_receipt_issued")
      .order("created_at", { ascending: false })
      .limit(6),
    receipt.subject_type === "interview_session"
      ? supabase
          .from("session_integrity_checks")
          .select("*")
          .eq("interview_session_id", receipt.subject_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    receipt.subject_type === "interview_session"
      ? supabase
          .from("interview_risk_events")
          .select("*")
          .eq("interview_session_id", receipt.subject_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("trust_replay_sessions")
      .select("id,subject_type,subject_id,generated_by,created_at")
      .eq("subject_type", receipt.subject_type)
      .eq("subject_id", receipt.subject_id)
      .order("created_at", { ascending: false }),
  ]);

  const snapshot = (receipt.evidence_snapshot ?? {}) as JsonRecord;
  const relationships = [...(receiptRelationships ?? []), ...(subjectRelationships ?? [])];
  const openGovernance = (governanceActions ?? []).filter((action) =>
    ["pending", "in_review", "escalated"].includes(String(action.action_status ?? "pending"))
  );
  const posture = buildTrustPosture({
    lastVerifiedAt: receipt.issued_at,
    lastGovernanceAt: latestCreatedAt(governanceActions ?? []),
    lastEvidenceAt: latestCreatedAt(evidenceChains ?? []),
    lastSignalAt: latestCreatedAt(timeline ?? []),
    evidenceCount: (evidenceChains ?? []).length,
    signalCount: (timeline ?? []).length,
    unresolvedGovernanceCount: openGovernance.length,
    confidenceLabel: receipt.confidence_level,
  });
  const nextReceiptAction = openGovernance.length
    ? "Governance review is still pending. Check the open action before sharing a final outcome."
    : "No active governance escalations. Share the receipt or replay the workflow if more context is needed.";
  const injectionEvent = (riskEvents ?? []).find((event) =>
    /injection/i.test(String(event.signal_type ?? ""))
  );
  const deepfakeEvent = (riskEvents ?? []).find((event) =>
    /deepfake|synthetic_media/i.test(String(event.signal_type ?? ""))
  );
  const latestGovernance = governanceActions?.[0];
  const identityState =
    snapshot.identity_verification_state ??
    sessionIntegrity?.identity_verification_state ??
    receipt.verification_status ??
    "pending";
  const sessionIntegrityState =
    snapshot.session_integrity_state ??
    sessionIntegrity?.overall_status ??
    sessionIntegrity?.integrity_status ??
    "pending";
  const injectionRiskState =
    snapshot.injection_risk_state ??
    injectionEvent?.risk_reason ??
    (injectionEvent ? "review required" : "no recorded injection flag");
  const deepfakeRiskState =
    snapshot.deepfake_risk_state ??
    deepfakeEvent?.risk_reason ??
    (deepfakeEvent ? "review required" : "no recorded deepfake flag");
  const governanceOutcome =
    snapshot.governance_review_outcome ??
    latestGovernance?.action_status ??
    "pending human review";
  const providerSignals = buildWorkflowProviderSignals({
    evidenceSnapshot: snapshot,
    providerVerificationState: receipt.verification_status,
    identityConfidence: snapshot.identity_confidence ?? snapshot.identityConfidence,
    sessionIntegrity: sessionIntegrityState,
    riskFlags: injectionEvent ? ["injection_risk", "session_integrity_anomaly"] : [],
    evidenceReferences: [
      "Verification receipt",
      "Evidence chain",
      "Replay chronology",
      "Governance review",
    ],
  });
  const receiptVerification = verifyReceiptContinuity({
    receipt,
    timeline: timeline ?? [],
    evidenceChains: evidenceChains ?? [],
    governanceActions: governanceActions ?? [],
    replaySessions: replaySessions ?? [],
  });
  const replayHref = replaySessions?.[0]?.id
    ? `/replay/${replaySessions[0].id}`
    : null;
  const portableEvidence = buildPortableTrustEvidence({
    receiptId: receipt.id,
    subjectType: label(receipt.subject_type),
    subjectId: String(receipt.subject_id),
    providerSignalCount: providerSignals.length,
    trustPosture: `${label(posture.state)} / ${posture.label}`,
    governanceOutcome: label(governanceOutcome ?? receipt.verification_status, "Reviewable"),
    authorizationRelationshipCount: relationships.length,
    issuedAt: receipt.issued_at,
    replayReference: replaySessions?.[0]?.id
      ? `/api/replay/${replaySessions[0].id}`
      : null,
  });
  const trustJourneyEvents: TrustJourneyEvent[] = [
    {
      id: "verification-initiated",
      title: "Identity submitted",
      description: `Workflow subject recorded as ${label(receipt.subject_type, "workflow subject")} with receipt context and timestamp.`,
      occurredAt: receipt.created_at ?? receipt.issued_at,
      state: "manual_review_required",
      stage: "identity_submitted",
      evidenceLabel: "subject record",
      flag: label(receipt.subject_type, "workflow subject"),
      reviewer: "Workflow owner",
      escalationReason: "Receipt subject linked to verification workflow",
      workflowReference: `${receipt.subject_type}/${receipt.subject_id}`,
      analystNote: "Subject and receipt context retained for audit review.",
    },
    {
      id: "human-presence",
      title: "Human presence checked",
      description: `Identity verification state: ${label(identityState, "pending")}.`,
      occurredAt: sessionIntegrity?.created_at ?? receipt.created_at ?? receipt.issued_at,
      state: stateFromText(identityState),
      stage: "human_presence_checked",
      evidenceLabel: "identity evidence",
      flag: label(identityState, "pending"),
      reviewer: "Identity verification reviewer",
      escalationReason: "Identity evidence reviewed before receipt issuance",
      workflowReference: `${receipt.subject_type}/${receipt.subject_id}`,
      analystNote: `Identity verification state recorded as ${label(identityState, "pending")}.`,
    },
    {
      id: "session-integrity",
      title: "Session integrity checked",
      description: `Session integrity state: ${label(sessionIntegrityState, "pending")}.`,
      occurredAt: sessionIntegrity?.created_at ?? receipt.issued_at,
      state: stateFromText(sessionIntegrityState),
      stage: "session_integrity_checked",
      evidenceLabel: "session integrity",
      flag: label(sessionIntegrityState, "pending"),
      reviewer: "Session integrity reviewer",
      escalationReason: "Session evidence checked for workflow trust changes",
      workflowReference: `${receipt.subject_type}/${receipt.subject_id}`,
      analystNote: `Session integrity state recorded as ${label(sessionIntegrityState, "pending")}.`,
    },
    {
      id: "deepfake-analysis",
      title: "Deepfake analysis",
      description: `Deepfake risk state: ${label(deepfakeRiskState)}.`,
      occurredAt: deepfakeEvent?.created_at ?? receipt.issued_at,
      state: stateFromText(deepfakeRiskState),
      evidenceLabel: "media-risk evidence",
      flag: label(deepfakeRiskState),
      reviewer: "Media risk reviewer",
      escalationReason: deepfakeEvent ? "Media risk event attached to receipt" : "No media risk escalation recorded",
      workflowReference: `${receipt.subject_type}/${receipt.subject_id}`,
      analystNote: `Deepfake risk state recorded as ${label(deepfakeRiskState)}.`,
    },
    {
      id: "injection-risk",
      title: "Injection risk reviewed",
      description: `Injection risk state: ${label(injectionRiskState)}.`,
      occurredAt: injectionEvent?.created_at ?? receipt.issued_at,
      state: stateFromText(injectionRiskState),
      stage: "injection_risk_reviewed",
      evidenceLabel: "injection-risk flag",
      flag: label(injectionRiskState),
      reviewer: "Session integrity reviewer",
      escalationReason: injectionEvent ? "Injection risk reviewed before outcome" : "No injection escalation recorded",
      workflowReference: `${receipt.subject_type}/${receipt.subject_id}`,
      analystNote: `Injection risk state recorded as ${label(injectionRiskState)}.`,
    },
    ...(governanceActions ?? []).map((action, index): TrustJourneyEvent => ({
      id: `governance-${action.id ?? index}`,
      title: ["approved", "rejected", "resolved"].includes(String(action.action_status ?? ""))
        ? "Manual review completed"
        : "Governance review opened",
      description: label(action.resolution_notes ?? action.action_type ?? action.action_status, "Human governance review recorded."),
      occurredAt: action.resolved_at ?? action.created_at,
      state: stateFromText(action.action_status),
      stage: ["approved", "rejected", "resolved"].includes(String(action.action_status ?? ""))
        ? "manual_review_completed"
        : "governance_review_opened",
      evidenceLabel: "reviewer action",
      flag: label(action.action_status, "pending"),
      reviewerAction: label(action.resolution_notes ?? action.action_status, "Human review recorded"),
      reviewer: action.resolved_by ?? action.assigned_to ?? action.created_by ?? "Governance reviewer",
      escalationReason: action.escalation_reason ?? action.action_type ?? "Governance review opened",
      workflowReference: `${action.subject_type ?? receipt.subject_type}/${action.subject_id ?? receipt.subject_id}`,
      analystNote: action.resolution_notes ?? "Reviewer action pending.",
    })),
    {
      id: "receipt-issued",
      title: "Receipt issued",
      description: "Verification receipt preserves the outcome, evidence summary, reviewer attribution and replay path.",
      occurredAt: receipt.issued_at,
      state: "trusted_workforce",
      stage: "receipt_issued",
      evidenceLabel: "verification receipt",
      flag: label(receipt.verification_status, "issued"),
      reviewer: receipt.issued_by ?? "Receipt issuer",
      escalationReason: "Workflow outcome preserved in portable receipt",
      workflowReference: `${receipt.subject_type}/${receipt.subject_id}`,
      analystNote: receipt.receipt_summary ?? "Receipt issued for enterprise audit review.",
    },
  ];
  const finalJourneyState: TrustJourneyState = openGovernance.length
    ? "governance_review"
    : injectionEvent
      ? "replay_available"
      : "trusted_workforce";
  const orderedTimeline = [...(timeline ?? [])].sort((left, right) =>
    new Date(String(left.created_at ?? "")).getTime() - new Date(String(right.created_at ?? "")).getTime()
  );

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white print:bg-white print:px-0 print:py-0 print:text-black md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Verification Receipt
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">
                {label(receipt.receipt_type, "Trust receipt")}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                {receipt.receipt_summary ??
                  "Audit-ready verification receipt recorded for operational governance review."}
              </p>
              <p className="mt-3 max-w-3xl rounded-lg border border-emerald-900 bg-black p-3 text-sm leading-6 text-emerald-100">
                Verification receipt available. {nextReceiptAction}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
                This printable receipt explains what happened, what was reviewed,
                what reviewer decision occurred, which replay chronology is available, who reviewed
                the case and what evidence was retained. It is portable,
                enterprise-safe and linked to the workflow it summarizes. It is
                an audit-ready report, not a blockchain record or an automatic trust decision.
              </p>
              <p className="mt-3 max-w-3xl rounded-lg border border-zinc-800 bg-black p-3 text-sm leading-6 text-zinc-300">
                Detection is one signal. Session integrity, evidence and governance determine the final review state. This is not a standalone deepfake verdict.
              </p>
              <div className="mt-5 max-w-3xl">
                <OnboardingHint area="receipt" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={receipt.verification_status ?? "pending"} />
              <StatusBadge status={receipt.confidence_level ?? "In Review"} />
              <PrintReceiptButton />
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 print:hidden">Save as PDF from print</span>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Verification completed", receipt.verification_status ? "Recorded" : "Pending"],
            ["Reviewer decision", latestGovernance ? "Recorded" : "Pending"],
            ["Replay available", (replaySessions ?? []).length ? "Available" : "Pending"],
            ["Receipt generated", "Generated"],
            ["Evidence retained", (evidenceChains ?? []).length ? "Retained" : "Pending"],
          ].map(([title, state]) => (
            <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{title}</p>
              <p className={`mt-2 text-sm font-semibold ${state === "Pending" ? "text-amber-200 print:text-amber-700" : "text-emerald-200 print:text-emerald-700"}`}>{state}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5 print:border-zinc-300 print:bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300 print:text-zinc-600">
                Receipt verification
              </p>
              <h2 className="mt-2 text-xl font-semibold">Operational continuity checks</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400 print:text-zinc-700">
                Deterministic checks confirm required receipt fields and linked workflow records.
                They do not claim cryptographic immutability or perfect authenticity.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              receiptVerification.state === "verified"
                ? "border-emerald-800 text-emerald-200 print:text-emerald-700"
                : "border-amber-800 text-amber-200 print:text-amber-700"
            }`}>
              {receiptVerification.state === "verified" ? "Continuity verified" : "Review required"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {receiptVerification.checks.map((check) => (
              <div key={check.id} className="rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white">
                <p className="text-sm font-semibold text-zinc-100 print:text-zinc-800">{check.label}</p>
                <p className={`mt-2 text-xs font-semibold ${
                  check.state === "verified"
                    ? "text-emerald-200 print:text-emerald-700"
                    : "text-amber-200 print:text-amber-700"
                }`}>
                  {check.state === "verified" ? "Verified" : "Review required"}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400 print:text-zinc-700">{check.explanation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-zinc-950 p-5 print:border-zinc-300 print:bg-white">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-300 print:text-zinc-600">
            Workflow continuity map
          </p>
          <h2 className="mt-2 text-xl font-semibold">Receipt links replay, evidence and governance outcome</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400 print:text-zinc-700">
            This receipt is the portable endpoint of the workflow chronology. It ties verification evidence,
            session integrity, governance review, replay chronology and reviewer action to one workflow subject.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ["Workflow subject", `${label(receipt.subject_type, "workflow")} / ${receipt.subject_id}`, receipt.subject_type === "interview_session" ? `/trust/session/${receipt.subject_id}` : `/verify/${receipt.subject_id}`],
              ["Operational evidence", `${(evidenceChains ?? []).length} chain(s)`, "/evidence-vault"],
              ["Governance review", label(governanceOutcome, "pending"), "/dashboard/governance"],
              ["Replay chronology", replayHref ?? "Not available", replayHref],
              ["Verification outcome", label(receipt.verification_status, "pending"), `/verification/receipt/${id}`],
            ].map(([title, value, href]) => {
              const content = (
                <>
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{title}</p>
                  <p className="mt-2 break-words text-sm font-semibold text-zinc-100 print:text-zinc-800">{value}</p>
                </>
              );
              return href ? (
                <Link key={title} href={String(href)} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-700 print:border-zinc-300 print:bg-white">
                  {content}
                </Link>
              ) : (
                <div key={title} className="rounded-lg border border-zinc-800 bg-black p-4 print:border-zinc-300 print:bg-white">
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailRow label="Subject" value={`${label(receipt.subject_type)} / ${receipt.subject_id}`} />
          <DetailRow label="Issued" value={formatDate(receipt.issued_at)} />
          <DetailRow label="Expires" value={formatDate(receipt.expires_at)} />
          <DetailRow label="Reviewer State" value={receipt.issued_by ? `Recorded by ${label(receipt.issued_by)}` : "Reviewer attribution pending"} />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <DetailRow label="Trust State" value={label(receipt.verification_status ?? governanceOutcome, "reviewable")} />
          <DetailRow label="Reviewer Decision" value={latestGovernance ? label(latestGovernance.resolution_notes ?? latestGovernance.action_status) : "No reviewer decision attached yet"} />
          <DetailRow label="Evidence Chain" value={(evidenceChains ?? []).length ? `${(evidenceChains ?? []).length} evidence chain(s)` : "No replay evidence available yet"} />
          <DetailRow label="Replay Link" value={replayHref ?? "Not available"} />
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5 print:border-zinc-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300 print:text-zinc-600">
            Portable trust evidence
          </p>
          <h2 className="mt-2 text-xl font-semibold">Reusable workflow trust summary</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Workflow reference" value={portableEvidence.workflowReference} />
            <DetailRow label="Replay reference" value={portableEvidence.replayReference} />
            <DetailRow label="Provider evidence summary" value={portableEvidence.providerEvidenceSummary} />
            <DetailRow label="Trust posture snapshot" value={portableEvidence.trustPostureSnapshot} />
            <DetailRow label="Governance outcome" value={portableEvidence.governanceOutcome} />
            <DetailRow label="Authorization lineage" value={portableEvidence.authorizationLineageSummary} />
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <DetailRow label="What was verified" value={label(receipt.subject_type, "Workflow subject")} />
          <DetailRow label="Evidence exists" value={(evidenceChains ?? []).length ? `${(evidenceChains ?? []).length} evidence chain(s)` : "No linked evidence chain yet"} />
          <DetailRow label="What is pending" value={openGovernance.length ? `${openGovernance.length} governance action(s)` : "No active governance escalations"} />
          <DetailRow label="Requires action" value={openGovernance.length ? "Reviewer decision required" : "No action required"} />
        </section>

        <section className="mt-8 rounded-lg border border-cyan-950 bg-zinc-950 p-5 print:border-zinc-300 print:bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300 print:text-zinc-600">
                Enterprise verification outcome
              </p>
              <h2 className="mt-2 text-xl font-semibold">Workflow-linked verification record</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400 print:text-zinc-700">
                Enterprise proof stays readable: what was checked, where the workflow or session changed, which evidence is attached, who reviewed the case, what authorization concern was raised and what remains pending.
              </p>
            </div>
            {replayHref ? (
              <Link href={replayHref} className="text-sm text-cyan-200 underline print:hidden">
                Open verification replay
              </Link>
            ) : (
              <span className="text-sm text-zinc-500 print:hidden">Replay pending</span>
            )}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <DetailRow label="Identity verification state" value={identityState} />
            <DetailRow label="Session integrity state" value={sessionIntegrityState} />
            <DetailRow label="Deepfake risk state" value={deepfakeRiskState} />
            <DetailRow label="Injection risk state" value={injectionRiskState} />
            <DetailRow label="Governance review outcome" value={governanceOutcome} />
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-400 print:text-zinc-700">
            Evidence summary: {(evidenceChains ?? []).length} retained chain(s), {(timeline ?? []).length} timeline event(s), and {(auditLogs ?? []).length} audit reference(s). Reviewer actions remain visible below.
          </p>
        </section>

        <div className="mt-8">
          <ProviderEvidencePanel
            signals={providerSignals}
            title="Provider-backed verification signals attached to this receipt"
            description="External verification evidence supports reviewer context. Governance review determines the final workflow state."
          />
        </div>

        <section className="mt-8">
          <DetectionEvidenceNote
            title="Investigation-style detection evidence"
            markers={[
              `Why flagged: ${label(deepfakeEvent?.risk_reason ?? injectionEvent?.risk_reason ?? sessionIntegrityState, "No unresolved media or session integrity event is attached to this receipt.")}`,
              `Confidence explanation: ${label(receipt.confidence_level, "In Review")} describes the receipt review state and evidence completeness, not certainty.`,
              `Evidence markers: identity state ${label(identityState)}, session integrity ${label(sessionIntegrityState)}, media risk ${label(deepfakeRiskState)}, injection risk ${label(injectionRiskState)}.`,
              `Metadata/channel integrity summary: ${label(snapshot.metadata_channel_integrity ?? sessionIntegrity?.metadata_channel_integrity ?? sessionIntegrityState, "No separate metadata/channel integrity summary recorded.")}`,
            ]}
            reportLanguage="Exportable report language: observed flag, confidence context, evidence markers, metadata or channel state, reviewer attribution, governance outcome and pending action."
          />
        </section>

        <div className="mt-8">
          <TrustJourneyVisualization
            title="Receipt trust progression"
            description="Chronological verification story from initiation through presence, integrity checks, deepfake and injection review, reviewer action and receipt issuance."
            events={trustJourneyEvents}
            finalState={finalJourneyState}
            proofState={{
              currentVerificationState: label(receipt.verification_status ?? identityState, "pending"),
              riskLevel: injectionEvent
                ? label(injectionEvent.risk_level ?? injectionRiskState, "elevated")
                : label(receipt.confidence_level, "reviewable"),
              lastEvidenceEvent: (timeline ?? [])[0]
                ? `${label((timeline ?? [])[0].event_title ?? (timeline ?? [])[0].event_type)} / ${formatDate((timeline ?? [])[0].created_at)}`
                : `Receipt issued / ${formatDate(receipt.issued_at)}`,
              reviewerAction: latestGovernance ? label(latestGovernance.resolution_notes ?? latestGovernance.action_status) : "No reviewer action attached yet",
              finalOutcome: label(governanceOutcome ?? receipt.verification_status, "Receipt issued"),
            }}
          />
        </div>


        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5 print:border-zinc-300 print:bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300 print:text-zinc-600">
                Enterprise export checklist
              </p>
              <h2 className="mt-2 text-xl font-semibold">Portable audit-grade receipt package</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400 print:text-zinc-700">
                Before sharing this receipt, confirm the workflow link, reviewer action, evidence summary, replay reference and pending governance state are clear enough for security, talent and compliance stakeholders.
              </p>
            </div>
            <PrintReceiptButton />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Printable", "Use print or save as PDF for the pilot record"],
              ["Workflow-linked", `${label(receipt.subject_type, "workflow subject")} / ${receipt.subject_id}`],
              ["Governance-focused", latestGovernance ? "Reviewer action recorded" : "Reviewer action pending"],
              ["Replay-linked", replayHref ? `Replay route: ${replayHref}` : "Replay pending"],
              ["Evidence summary", `${(evidenceChains ?? []).length} evidence chain(s), ${(timeline ?? []).length} timeline event(s)`],
              ["Audit references", `${(auditLogs ?? []).length} receipt audit log(s)`],
            ].map(([title, value]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 print:border-zinc-300 print:bg-white">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300 print:text-zinc-700">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-8 rounded-lg border border-zinc-800 bg-black p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                Trust Freshness
              </p>
              <h2 className="mt-2 text-xl font-semibold">{posture.label}</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">
                {posture.explanation}. {posture.nextReview}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${trustPostureClass(posture.state)}`}>
              {posture.reverificationRecommended ? "Reverification recommended" : "Reviewable posture"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {posture.continuityChecks.map((check) => (
              <div key={check} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
                {check}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Explanation</h2>
            <div className="mt-5 grid gap-3">
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-400">
                Verification occurred because an operational workflow recorded
                evidence, status and governance context for this subject. Human
                review remains authoritative where the workflow requires a
                decision.
              </p>
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-400">
                Confidence: {label(receipt.confidence_level, "In Review")}.
                Status: {label(receipt.verification_status, "pending")}.
                Operational context: {label(snapshot.operational_context, "Receipt generated from existing trust workflow activity.")}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Snapshot</h2>
            <div className="mt-5 grid gap-3">
              {Object.entries(snapshot).length ? (
                Object.entries(snapshot).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                      {label(key)}
                    </p>
                    <p className="mt-2 break-words text-sm text-zinc-300">
                      {typeof value === "object" ? JSON.stringify(value) : label(value)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No evidence snapshot was attached to this receipt yet.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Chains</h2>
            <div className="mt-5 grid gap-3">
              {(evidenceChains ?? []).length ? (
                (evidenceChains ?? []).map((chain) => (
                  <article key={String(chain.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="font-medium text-zinc-100">{chain.chain_summary ?? "Evidence chain"}</p>
                    <div className="mt-3 grid gap-2">
                      {evidenceItems(chain.evidence).map((item, index) => (
                        <p key={`${chain.id}-${index}`} className="text-sm leading-6 text-zinc-500">
                          {label(item.type, "evidence")} {item.id ? `- ${String(item.id)}` : ""}
                        </p>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-zinc-600">
                      Continuity: this operational evidence supports the receipt outcome and replay chronology.
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No replay evidence available yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Chronology</h2>
            <div className="mt-5 grid gap-3">
              {orderedTimeline.length ? (
                orderedTimeline.map((event, index) => (
                  <article key={String(event.id)} className="grid gap-3 rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-zinc-600">Step {index + 1}</p>
                        <p className="mt-2 font-medium text-zinc-100">{event.event_title ?? event.event_type}</p>
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs capitalize text-zinc-300">
                        {label(event.severity ?? event.event_type, "recorded")}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-zinc-500">{event.event_summary ?? "Timeline event recorded."}</p>
                    <p className="text-xs text-zinc-600">{formatDate(event.created_at)}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No replay evidence available yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Reviewer Actions</h2>
            <div className="mt-5 grid gap-3">
              {(governanceActions ?? []).length ? (
                (governanceActions ?? []).map((action) => (
                  <article key={String(action.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-zinc-100">{label(action.action_status, "pending")}</p>
                      <StatusBadge status={action.action_status ?? "pending"} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {action.resolution_notes ?? action.action_type ?? "Reviewer action remains reviewable."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No active governance escalations.
                </p>
              )}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Relationships</h2>
            <div className="mt-5 grid gap-3">
              {relationships.length ? (
                relationships.map((relationship) => (
                  <article key={String(relationship.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="font-medium text-zinc-100">{label(relationship.relationship_type, "linked to")}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {relationship.explanation ?? "Relationship preserved for explainable verification chronology."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No linked operational relationships yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Audit References</h2>
            <div className="mt-5 grid gap-3">
              {(auditLogs ?? []).length ? (
                (auditLogs ?? []).map((audit) => (
                  <article key={String(audit.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <p className="font-medium text-zinc-100">{audit.event_type ?? "audit_event"}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Actor: {label(audit.actor, "receipt registry")}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">{formatDate(audit.created_at)}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No audit references are attached yet.
                </p>
              )}
            </div>
          </section>
        </section>

        <div className="mt-8 flex flex-wrap gap-4">
          {receipt.subject_type === "interview_session" ? (
            <Link href={`/trust/hiring-report/${receipt.subject_id}`} className="text-sm text-cyan-200 underline">
              Open hiring report
            </Link>
          ) : null}
          <Link href="/trust-graph" className="text-sm text-cyan-200 underline">
            Open trust graph
          </Link>
          {replayHref ? (
            <Link href={replayHref} className="text-sm text-cyan-200 underline">
              Open verification replay
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
