import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateHiringTrustScore } from "@/lib/trusted-layer/hiring";

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === "on";
}

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
  const wantsRedirect = !(req.headers.get("content-type") ?? "").includes("application/json");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await readRequestValues(req);
  const sessionId = stringValue(body.session_id);

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "session_id_required" }, { status: 400 });
  }

  const score = calculateHiringTrustScore({
    highRiskIdentity: booleanValue(body.high_risk_identity),
    livenessUnresolved: booleanValue(body.liveness_unresolved),
    voiceMismatch: booleanValue(body.voice_mismatch),
    webcamAnomaly: booleanValue(body.webcam_anomaly),
    suspiciousDeviceOrLocation:
      booleanValue(body.suspicious_device_location) ||
      booleanValue(body.suspicious_device_or_location),
  });

  const { data, error } = await supabase
    .from("trust_scores")
    .insert({
      user_id: user.id,
      session_id: sessionId,
      score: score.score,
      risk_level: score.risk_level,
      reasons: score.reasons,
      metadata: {
        source: "api.trust.hiring-score",
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("hiring trust score insert failed", error);
    return NextResponse.json({ ok: false, error: "hiring_score_failed" }, { status: 500 });
  }

  if (wantsRedirect) {
    return NextResponse.redirect(new URL(`/trust/hiring-report/${sessionId}`, req.url), {
      status: 303,
    });
  }

  return NextResponse.json({
    ok: true,
    trust_score_id: data.id,
    session_id: sessionId,
    ...score,
  });
}
