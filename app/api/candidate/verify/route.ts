import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { candidateTrustFactors, trustScoreFromFactors } from "@/lib/trusted-layer/phase1";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function POST(req: Request) {
  const wantsRedirect = !(req.headers.get("content-type") ?? "").includes("application/json");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const candidateName = text(formData, "full_name") || text(formData, "candidate_name");
  const email = text(formData, "email") || text(formData, "candidate_email");
  const roleAppliedFor = text(formData, "role_applied_for") || text(formData, "role");
  const companyName = text(formData, "company_name");
  const verificationStatus = text(formData, "verification_status") || "pending";
  const riskLevel = text(formData, "risk_level") || "pending";
  const notes = text(formData, "notes");

  if (!candidateName || !email) {
    return NextResponse.json({ ok: false, error: "Candidate name and email are required" }, { status: 400 });
  }

  const factors = candidateTrustFactors();
  const trustScore = trustScoreFromFactors(factors);
  const actor = user.email ?? user.id;
  const metadata = {
    candidate_email: email,
    role: roleAppliedFor,
    company_name: companyName,
    linkedin_url: text(formData, "linkedin_url"),
    notes,
    factors,
    source: "api.candidate.verify",
  };

  const { data: candidateProfile, error: profileError } = await supabase
    .from("candidate_profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: candidateName,
        email,
        role_applied_for: roleAppliedFor || null,
        company_name: companyName || null,
        verification_status: verificationStatus,
        risk_level: riskLevel,
        notes: notes || null,
        metadata,
      },
      { onConflict: "user_id,email" }
    )
    .select("id")
    .single();

  if (profileError) {
    console.error("candidate profile upsert failed", profileError);
    return NextResponse.json({ ok: false, error: "candidate_profile_failed" }, { status: 500 });
  }

  const { data: report, error } = await supabase
    .from("trust_reports")
    .insert({
      candidate_name: candidateName,
      report_type: "candidate",
      media_type: "video",
      trust_score: trustScore,
      confidence: trustScore,
      human_presence_index: factors[0].score,
      profile_consistency: 80,
      synthetic_risk: Math.max(0, 100 - trustScore),
      review_status: trustScore >= 70 ? "ready" : "manual_review",
      linkedin_url: metadata.linkedin_url || null,
      linkedin_claimed_role: metadata.role || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("candidate verification report insert failed", error);
  }

  const { error: eventError } = await supabase.from("verification_events").insert({
    user_id: user.id,
    subject_type: "candidate",
    subject_id: candidateProfile?.id ?? null,
    status: verificationStatus,
    risk_level: riskLevel,
    notes: notes || null,
    metadata: {
      ...metadata,
      trust_report_id: report?.id ?? null,
    },
  });

  if (eventError) {
    console.error("candidate verification event insert failed", eventError);
  }

  await createAuditLog(supabase, "candidate_verification_requested", actor, metadata);
  await createSignal(supabase, "Candidate verification requested", metadata);

  if (wantsRedirect) {
    return NextResponse.redirect(
      new URL(report?.id ? `/trust/interview-report/${report.id}` : "/verify/candidate", req.url),
      { status: 303 }
    );
  }

  return NextResponse.json({
    ok: true,
    candidate_profile_id: candidateProfile?.id ?? null,
    report_id: report?.id ?? null,
    trust_score: trustScore,
    factors,
  });
}
