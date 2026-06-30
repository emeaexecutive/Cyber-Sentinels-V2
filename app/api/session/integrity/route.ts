import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  evaluateSessionIntegrity,
  normalizeSessionIntegrityInput,
} from "@/lib/session-integrity/model";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_integrity_input" }, { status: 400 });
  }

  const input = normalizeSessionIntegrityInput(body);
  if (!input.session_id || !uuidPattern.test(input.session_id)) {
    return NextResponse.json({ ok: false, error: "valid_session_id_required" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("interview_sessions")
    .select("id")
    .eq("id", input.session_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  }

  const result = evaluateSessionIntegrity(input);
  const { data: check, error: checkError } = await supabase
    .from("session_integrity_checks")
    .insert({
      interview_session_id: input.session_id,
      user_id: user.id,
      identity_verification_state: input.identity_verification_state ?? "pending",
      overall_status: result.overall_status,
      manual_review_required: result.manual_review_required,
      evidence_source: input.evidence_source ?? "operator_input",
      evidence: input.evidence_metadata ?? {},
      review_summary: result.summary,
    })
    .select("id,created_at")
    .single();

  if (checkError || !check) {
    console.error("session integrity check insert failed", checkError);
    return NextResponse.json({ ok: false, error: "integrity_check_failed" }, { status: 500 });
  }

  const signalRows = result.signals.map((signal) => ({
    session_integrity_check_id: check.id,
    interview_session_id: input.session_id,
    category: signal.category,
    signal_status: signal.status,
    risk_level: signal.risk_level,
    confidence_score: signal.confidence_score,
    explanation: signal.explanation,
    badge_label: signal.badge,
    requires_manual_review: signal.requires_manual_review,
    evidence: {},
  }));
  const injectionSignal = result.signals.find((signal) => signal.category === "injection_risk");
  const channelSignal = result.signals.find(
    (signal) => signal.category === "device_channel_integrity"
  );

  const [signalsWrite, injectionWrite, channelWrite] = await Promise.all([
    supabase.from("verification_signals").insert(signalRows),
    supabase.from("injection_risk_events").insert({
      session_integrity_check_id: check.id,
      interview_session_id: input.session_id,
      risk_level: injectionSignal?.risk_level ?? "unknown",
      risk_score: injectionSignal?.confidence_score ?? null,
      explanation: injectionSignal?.explanation ?? "Injection risk was not assessed.",
      evidence: input.evidence_metadata ?? {},
    }),
    supabase.from("device_channel_evidence").insert({
      session_integrity_check_id: check.id,
      interview_session_id: input.session_id,
      integrity_state: channelSignal?.status ?? "pending",
      evidence_source: input.evidence_source ?? "operator_input",
      evidence: input.evidence_metadata ?? {},
    }),
  ]);

  const persistenceError = signalsWrite.error || injectionWrite.error || channelWrite.error;
  if (persistenceError) {
    console.error("session integrity signal persistence failed", persistenceError);
    return NextResponse.json(
      { ok: false, error: "integrity_signal_persistence_failed", check_id: check.id },
      { status: 500 }
    );
  }

  const [auditWrite, timelineWrite] = await Promise.all([
    createAuditLog(
      supabase,
      "session_integrity_reviewed",
      user.email ?? user.id,
      {
        session_id: input.session_id,
        session_integrity_check_id: check.id,
        overall_status: result.overall_status,
        manual_review_required: result.manual_review_required,
      }
    ),
    supabase.from("trust_timeline_events").insert({
      subject_type: "interview_session",
      subject_id: input.session_id,
      event_type: "session_integrity_reviewed",
      event_title: "Session Integrity reviewed",
      event_summary: result.summary,
      actor_type: "user",
      actor_id: user.id,
      severity: result.manual_review_required ? "warning" : "info",
      metadata: {
        session_integrity_check_id: check.id,
        overall_status: result.overall_status,
        manual_review_required: result.manual_review_required,
        evidence_source: input.evidence_source ?? "operator_input",
      },
    }),
  ]);
  if (auditWrite.error || timelineWrite.error) {
    console.error(
      "session integrity continuity persistence failed",
      auditWrite.error ?? timelineWrite.error
    );
    return NextResponse.json(
      {
        ok: false,
        error: "integrity_continuity_persistence_failed",
        check_id: check.id,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      check_id: check.id,
      session_id: input.session_id,
      identity_verification_state: input.identity_verification_state ?? "pending",
      ...result,
      audit_and_timeline_recorded: true,
      automated_trust_decision: false,
    },
    { status: 201 }
  );
}

