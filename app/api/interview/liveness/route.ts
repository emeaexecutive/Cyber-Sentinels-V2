import { NextResponse } from "next/server";
import { placeholderLivenessCheck, placeholderVoiceMismatchCheck, placeholderWebcamIntegrityCheck, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";

export async function POST() {
  const factors = [
    placeholderLivenessCheck(86),
    placeholderVoiceMismatchCheck(77),
    placeholderWebcamIntegrityCheck(83),
  ];

  return NextResponse.json({
    ok: true,
    trust_score: trustScoreFromFactors(factors),
    checks: factors,
  });
}

