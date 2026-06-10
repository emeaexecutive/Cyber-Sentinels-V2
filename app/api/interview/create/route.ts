import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hiringSignalExplanation,
  interviewRiskSignalTypes,
} from "@/lib/trusted-layer/hiring";
import { createReceiptBundle } from "@/lib/trust-receipts/receipts";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readRequestValues(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }

  const formData = await req.formData();

  return Object.fromEntries(formData.entries());
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const wantsRedirect = !contentType.includes("application/json");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await readRequestValues(req);
  const candidateProfileId = stringValue(body.candidate_profile_id);
  const recruiterProfileId = stringValue(body.recruiter_profile_id);
  const title = stringValue(body.title) || "Trusted hiring interview";

  const { data: session, error } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      candidate_profile_id: candidateProfileId || null,
      candidate_id: candidateProfileId || null,
      recruiter_profile_id: recruiterProfileId || null,
      title,
      status: "pending",
      session_status: "scheduled",
      integrity_status: "pending",
      risk_level: "unknown",
      metadata: {
        source: "api.interview.create",
      },
    })
    .select("id")
    .single();

  if (error || !session) {
    console.error("interview session create failed", error);
    return NextResponse.json({ ok: false, error: "interview_session_failed" }, { status: 500 });
  }

  const signalRows = interviewRiskSignalTypes.map((signalType) => ({
    user_id: user.id,
    session_id: session.id,
    signal_type: signalType,
    status: "pending",
    risk_level: "pending",
    metadata: {
      provider: "placeholder",
    },
  }));

  const { error: signalsError } = await supabase
    .from("interview_risk_signals")
    .insert(signalRows);

  if (signalsError) {
    console.error("interview risk signal placeholders failed", signalsError);
  }

  const riskEventRows = interviewRiskSignalTypes.map((signalType) => ({
    interview_session_id: session.id,
    signal_type: signalType,
    signal_source: "placeholder_interface",
    confidence_score: 0,
    risk_reason: hiringSignalExplanation(signalType),
    escalation_required: false,
  }));

  const { error: riskEventsError } = await supabase
    .from("interview_risk_events")
    .insert(riskEventRows);

  if (riskEventsError) {
    console.error("interview risk event placeholders failed", riskEventsError);
  }

  await createAuditLog(supabase, "interview_session_created", user.email ?? user.id, {
    session_id: session.id,
    candidate_profile_id: candidateProfileId || null,
    recruiter_profile_id: recruiterProfileId || null,
    explanation:
      "Interview session created for hiring integrity review. Placeholder risk events do not claim detection accuracy.",
  });
  await createSignal(supabase, "Interview session created", {
    session_id: session.id,
  });

  await createReceiptBundle(supabase, {
    subjectType: "interview_session",
    subjectId: session.id,
    receiptType: "interview_integrity_review_started",
    verificationStatus: "pending",
    confidenceLevel: "In Review",
    issuedBy: user.id,
    receiptSummary:
      "Interview integrity review was opened with placeholder risk interfaces and human governance context. This receipt does not claim detection accuracy.",
    chainSummary:
      "Interview evidence chain records candidate linkage, recruiter linkage, placeholder risk interfaces, audit activity and review context.",
    evidenceSnapshot: {
      interview_session_id: session.id,
      candidate_profile_id: candidateProfileId || null,
      recruiter_profile_id: recruiterProfileId || null,
      session_status: "scheduled",
      integrity_status: "pending",
      human_review: true,
      operational_context:
        "Hiring integrity receipt generated when the interview review workflow was created.",
    },
    evidence: [
      { type: "interview_session", id: session.id, status: "scheduled" },
      { type: "candidate_profile", id: candidateProfileId || null },
      { type: "recruiter_profile", id: recruiterProfileId || null },
      {
        type: "risk_event_placeholders",
        signal_types: interviewRiskSignalTypes,
        detection_accuracy_claimed: false,
      },
      { type: "audit_log", event_type: "interview_session_created" },
      { type: "signal", event: "Interview session created" },
    ],
  });

  const { error: replayError } = await supabase.from("trust_replay_sessions").insert({
    subject_type: "interview_session",
    subject_id: session.id,
    replay_summary:
      "Initial hiring replay captures interview session creation, placeholder risk interfaces, audit logging, signal generation and receipt context.",
    generated_by: "api.interview.create",
  });

  if (replayError) {
    console.error("interview replay insert failed", replayError);
  }

  if (wantsRedirect) {
    return NextResponse.redirect(new URL(`/interview/session/${session.id}`, req.url), {
      status: 303,
    });
  }

  return NextResponse.json({
    ok: true,
    session_id: session.id,
    session_url: `/interview/session/${session.id}`,
    report_url: `/trust/hiring-report/${session.id}`,
  });
}
