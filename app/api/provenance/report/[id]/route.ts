import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provenanceTrustFactors, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const factors = provenanceTrustFactors();
  const [{ data: receipt }, { data: replay }] = await Promise.all([
    supabase
      .from("verification_receipts")
      .select("id,receipt_type,verification_status,confidence_level,receipt_summary,issued_at")
      .eq("subject_type", "media")
      .eq("subject_id", id)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("trust_replay_sessions")
      .select("id,replay_summary,created_at")
      .eq("subject_type", "media")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    ok: true,
    report_id: id,
    trust_score: trustScoreFromFactors(factors),
    factors,
    receipt: receipt ?? null,
    replay: replay ?? null,
  });
}
