import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SessionSignalCards } from "@/components/session-integrity";
import {
  TrustJourneyVisualization,
  type TrustJourneyEvent,
  type TrustJourneyState,
} from "@/components/trust-journey-visualization";
import type { ExplainableSessionSignal } from "@/lib/session-integrity/model";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function clean(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).replaceAll("_", " ");
}

function sessionState(value: unknown): TrustJourneyState {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("approved") || text.includes("verified") || text.includes("passed")) return "verified";
  if (text.includes("receipt")) return "trusted_workforce";
  if (text.includes("manual")) return "manual_review_required";
  if (text.includes("governance") || text.includes("review") || text.includes("pending")) return "governance_review";
  if (text.includes("integrity") || text.includes("failed") || text.includes("injection")) return "session_integrity_failed";
  if (text.includes("risk") || text.includes("deepfake") || text.includes("high") || text.includes("medium")) return "elevated_risk";
  return "verified";
}

export default async function SessionTrustPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/trust/session/${encodeURIComponent(id)}`);

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id,title,status,session_status,integrity_status,candidate_id,candidate_profile_id,created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();

  const [{ data: check }, { data: signalRows }, { data: governanceActions }, { data: riskEvents }, { data: receipts }] = await Promise.all([
    supabase.from("session_integrity_checks").select("*").eq("interview_session_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("verification_signals").select("*").eq("interview_session_id", id).order("created_at", { ascending: false }),
    supabase.from("governance_actions").select("action_status,resolution_notes,resolved_at,created_at").eq("subject_type", "interview_session").eq("subject_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("interview_risk_events").select("*").eq("interview_session_id", id).order("created_at", { ascending: false }),
    supabase.from("verification_receipts").select("*").eq("subject_type", "interview_session").eq("subject_id", id).order("issued_at", { ascending: false }).limit(1),
  ]);

  const latestCheckId = check?.id ? String(check.id) : null;
  const signals = (signalRows ?? [])
    .filter((row) => !latestCheckId || String(row.session_integrity_check_id) === latestCheckId)
    .map((row) => ({
      category: row.category,
      label: String(row.category ?? "signal").replaceAll("_", " "),
      status: row.signal_status,
      risk_level: row.risk_level,
      confidence_score: row.confidence_score,
      explanation: row.explanation,
      badge: row.badge_label,
      requires_manual_review: Boolean(row.requires_manual_review),
    })) as ExplainableSessionSignal[];
  const humanDecision = governanceActions?.[0];
  const receipt = receipts?.[0];
  const journeyEvents: TrustJourneyEvent[] = [
    {
      id: "verification-initiated",
      title: "Verification initiated",
      description: "Session trust review started for the interview workflow.",
      occurredAt: check?.created_at ?? session.created_at,
      state: "manual_review_required",
      score: 52,
    },
    {
      id: "human-presence",
      title: "Human presence confirmed",
      description: `Identity state: ${clean(check?.identity_verification_state ?? "pending")}.`,
      occurredAt: check?.created_at,
      state: sessionState(check?.identity_verification_state),
      score: 68,
    },
    {
      id: "session-integrity",
      title: "Session integrity checks",
      description: `Overall integrity state: ${clean(check?.overall_status ?? check?.integrity_status ?? session.integrity_status ?? "pending")}.`,
      occurredAt: check?.created_at,
      state: sessionState(check?.overall_status ?? check?.integrity_status ?? session.integrity_status),
      score: check?.manual_review_required ? 44 : 72,
    },
    ...(signalRows ?? []).slice(0, 6).map((signal, index): TrustJourneyEvent => ({
      id: `signal-${signal.id ?? index}`,
      title: clean(signal.category, "Verification signal"),
      description: clean(signal.explanation ?? signal.signal_status, "Signal retained for session review."),
      occurredAt: signal.created_at,
      state: signal.requires_manual_review ? "manual_review_required" : sessionState(signal.risk_level ?? signal.signal_status),
      score: signal.requires_manual_review ? 48 : 64,
    })),
    ...(riskEvents ?? []).slice(0, 4).map((event, index): TrustJourneyEvent => ({
      id: `risk-${event.id ?? index}`,
      title: clean(event.signal_type, "Risk event"),
      description: clean(event.risk_reason, "Risk event retained for human review."),
      occurredAt: event.created_at,
      state: sessionState(`${event.signal_type ?? ""} ${event.risk_reason ?? ""}`),
      score: event.escalation_required ? 42 : 60,
    })),
    ...(governanceActions ?? []).map((action, index): TrustJourneyEvent => ({
      id: `governance-${index}`,
      title: "Governance review action",
      description: clean(action.resolution_notes ?? action.action_status, "Human governance review recorded."),
      occurredAt: action.resolved_at ?? action.created_at,
      state: sessionState(action.action_status),
      score: ["approved", "resolved"].includes(String(action.action_status ?? "")) ? 78 : 56,
    })),
    ...(receipt ? [{
      id: `receipt-${receipt.id}`,
      title: "Receipt issuance",
      description: clean(receipt.receipt_summary, "Verification receipt issued for the session."),
      occurredAt: receipt.issued_at,
      state: "trusted_workforce" as TrustJourneyState,
      score: 88,
    }] : []),
  ];
  const finalJourneyState: TrustJourneyState = receipt
    ? "trusted_workforce"
    : humanDecision
      ? "governance_review"
      : check?.manual_review_required
        ? "manual_review_required"
        : "verified";

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Session Trust Review</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">{session.title ?? `Session ${id}`}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Identity verification, liveness, deepfake risk, injection risk and session integrity are separate review states. A verified candidate can still have channel integrity evidence or verification flags that require manual review.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Identity verification state", check?.identity_verification_state ?? "pending"],
            ["Session integrity state", check?.overall_status ?? "pending"],
            ["Human review decision", humanDecision?.action_status ?? (check?.manual_review_required ? "required" : "pending")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
              <p className="mt-2 text-lg font-semibold text-zinc-100">{String(value).replaceAll("_", " ")}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <TrustJourneyVisualization
            title="Session trust journey"
            description="Chronological view of verification initiation, human presence, session integrity, risk signals, governance review and final session outcome."
            events={journeyEvents}
            finalState={finalJourneyState}
          />
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-2xl font-semibold">Separate verification signals</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Each state is explainable and reviewable. Liveness alone does not establish identity, hiring integrity, continuous trust posture or overall trust.
          </p>
          <div className="mt-5">
            {signals.length ? <SessionSignalCards signals={signals} /> : <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-400">No session integrity review has been recorded yet.</p>}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/verify/session" className="text-cyan-200 underline">Record another review</Link>
          <Link href={`/trust/hiring-report/${id}`} className="text-cyan-200 underline">Open hiring trust report</Link>
        </div>
      </div>
    </main>
  );
}

