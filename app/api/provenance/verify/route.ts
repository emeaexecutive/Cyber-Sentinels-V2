import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provenanceTrustFactors, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const mediaLabel = text(formData, "media_label");
  const factors = provenanceTrustFactors();
  const trustScore = trustScoreFromFactors(factors);
  const reportId = crypto.randomUUID();
  const actor = user.email ?? user.id;
  const metadata = {
    report_id: reportId,
    media_label: mediaLabel,
    source_url: text(formData, "source_url"),
    media_type: text(formData, "media_type") || "image",
    factors,
    source: "api.provenance.verify",
  };

  await createAuditLog(supabase, "provenance_verification_requested", actor, metadata);
  await createSignal(supabase, "Provenance verification requested", metadata);

  return NextResponse.json({
    ok: true,
    report_id: reportId,
    media_url: `/trust/media/${encodeURIComponent(reportId)}`,
    trust_score: trustScore,
    authenticity: trustScore >= 70 ? "likely_authentic" : "needs_review",
    factors,
  });
}

