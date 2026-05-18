import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateTrustScore } from "@/lib/trust-score";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const supabase = await createClient();

    const candidateName = String(formData.get("candidate_name") || "Candidate");
    const profileConsistency = Number(formData.get("profile_consistency") || 80);
    const syntheticRisk = Number(formData.get("synthetic_risk") || 20);
    const confidence = Number(formData.get("confidence") || 85);

const trustScore = calculateTrustScore(
  profileConsistency,
  syntheticRisk,
  confidence
); 

    const { error } = await supabase.from("trust_reports").insert({
  profile_consistency: profileConsistency,
  synthetic_risk: syntheticRisk,
  confidence,
  trust_score: trustScore,
  report_type: "hiring_shield",
    });

    if (error) throw error;

    await supabase.from("signals").insert({
      event: `Hiring Shield report generated for ${candidateName}`,
    });

    return NextResponse.redirect(new URL("/hiring-shield", req.url));
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not create trust report" },
      { status: 500 }
    );
  }
}