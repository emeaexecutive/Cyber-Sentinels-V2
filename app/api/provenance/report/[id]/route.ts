import { NextResponse } from "next/server";
import { provenanceTrustFactors, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const factors = provenanceTrustFactors();

  return NextResponse.json({
    ok: true,
    report_id: id,
    trust_score: trustScoreFromFactors(factors),
    factors,
  });
}

