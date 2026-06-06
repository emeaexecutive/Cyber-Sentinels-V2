import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interviewRiskSignalTypes } from "@/lib/trusted-layer/hiring";
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
      recruiter_profile_id: recruiterProfileId || null,
      title,
      status: "pending",
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

  await createAuditLog(supabase, "interview_session_created", user.email ?? user.id, {
    session_id: session.id,
    candidate_profile_id: candidateProfileId || null,
    recruiter_profile_id: recruiterProfileId || null,
  });
  await createSignal(supabase, "Interview session created", {
    session_id: session.id,
  });

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
