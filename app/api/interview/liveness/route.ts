import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placeholderLivenessCheck, placeholderVoiceMismatchCheck, placeholderWebcamIntegrityCheck, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const factors = [
    placeholderLivenessCheck(86),
    placeholderVoiceMismatchCheck(77),
    placeholderWebcamIntegrityCheck(83),
  ];
  const metadata = {
    source: "api.interview.liveness",
    detection_accuracy_claimed: false,
    liveness_is_one_signal: true,
    automated_trust_decision: false,
  };

  await createAuditLog(supabase, "interview_liveness_placeholder_checked", user.email ?? user.id, metadata);
  await createSignal(supabase, "Interview liveness placeholder checked", metadata);

  return NextResponse.json({
    ok: true,
    trust_score: trustScoreFromFactors(factors),
    checks: factors,
    session_integrity_review:
      "Liveness is one signal. Review deepfake risk, injection risk, channel integrity evidence and session anomalies separately before a human decision.",
    manual_review_required: true,
  });
}
