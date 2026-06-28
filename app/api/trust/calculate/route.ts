import { NextResponse } from "next/server";
import { clampScore, trustScoreFromFactors, type TrustFactor } from "@/lib/trusted-layer/phase1";
import { trustApiError, validateTrustApiKey } from "@/lib/api/trustResponses";

export async function POST(req: Request) {
  if (!validateTrustApiKey(req).ok) {
    return trustApiError("Unauthorized", 401);
  }
  const body = (await req.json().catch(() => ({}))) as {
    factors?: Array<{ label?: unknown; score?: unknown; detail?: unknown }>;
  };
  const factors: TrustFactor[] = (body.factors ?? []).map((factor, index) => ({
    label: String(factor.label ?? `Factor ${index + 1}`),
    score: clampScore(Number(factor.score ?? 0)),
    detail: String(factor.detail ?? "Submitted trust factor."),
  }));

  return NextResponse.json({
    ok: true,
    trust_score: trustScoreFromFactors(factors),
    factors,
  });
}

