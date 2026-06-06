import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placeholderLivenessCheck, placeholderVoiceMismatchCheck, placeholderWebcamIntegrityCheck, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";
import { calculateHiringTrustScore } from "@/lib/trusted-layer/hiring";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sessionId = String(body.session_id ?? crypto.randomUUID());
  const factors = [placeholderLivenessCheck(88), placeholderVoiceMismatchCheck(79), placeholderWebcamIntegrityCheck(85)];
  const trustScore = trustScoreFromFactors(factors);
  const actor = user.email ?? user.id;
  const metadata = { session_id: sessionId, factors, source: "api.interview.report" };
  const hiringScore = calculateHiringTrustScore({
    livenessUnresolved: true,
  });

  const { error: scoreError } = await supabase.from("trust_scores").insert({
    user_id: user.id,
    session_id: sessionId,
    score: hiringScore.score,
    risk_level: hiringScore.risk_level,
    reasons: hiringScore.reasons,
    metadata,
  });

  if (scoreError) {
    console.error("interview report trust score insert failed", scoreError);
  }

  await createAuditLog(supabase, "interview_report_created", actor, metadata);
  await createSignal(supabase, "Interview report created", metadata);

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    report_url: `/trust/interview-report/${encodeURIComponent(sessionId)}`,
    trust_score: trustScore,
    hiring_score: hiringScore.score,
    factors,
  });
}
