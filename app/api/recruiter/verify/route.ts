import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const fullName = text(formData, "full_name") || text(formData, "name");
  const workEmail = text(formData, "email") || text(formData, "work_email");
  const company = text(formData, "company_name") || text(formData, "company");
  const roleTitle = text(formData, "role_title") || text(formData, "role");
  const verificationStatus = text(formData, "verification_status") || "pending";
  const notes = text(formData, "notes");

  if (!fullName || !workEmail || !company) {
    return NextResponse.json({ ok: false, error: "Name, work email and company are required" }, { status: 400 });
  }

  const domain = workEmail.split("@")[1] ?? "";
  const domainScore = domain && company ? 82 : 55;
  const actor = user.email ?? user.id;
  const metadata = {
    name: fullName,
    work_email: workEmail,
    company,
    role: roleTitle,
    verification_status: verificationStatus,
    notes,
    domain,
    domain_score: domainScore,
    source: "api.recruiter.verify",
  };

  const { data: recruiterProfile, error: profileError } = await supabase
    .from("recruiter_profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: fullName,
        email: workEmail,
        organization: company,
        company_name: company,
        role_title: roleTitle || null,
        verification_status: verificationStatus,
        notes: notes || null,
        metadata,
      },
      { onConflict: "user_id,email" }
    )
    .select("id")
    .single();

  if (profileError) {
    console.error("recruiter profile upsert failed", profileError);
    return NextResponse.json({ ok: false, error: "recruiter_profile_failed" }, { status: 500 });
  }

  const { error: eventError } = await supabase.from("verification_events").insert({
    user_id: user.id,
    subject_type: "recruiter",
    subject_id: recruiterProfile?.id ?? null,
    status: verificationStatus,
    risk_level: domainScore >= 70 ? "low" : "needs_review",
    notes: notes || null,
    metadata,
  });

  if (eventError) {
    console.error("recruiter verification event insert failed", eventError);
  }

  await createAuditLog(supabase, "recruiter_verification_requested", actor, metadata);
  await createSignal(supabase, "Recruiter verification requested", metadata);

  if (wantsRedirect) {
    return NextResponse.redirect(new URL("/recruiter/dashboard", req.url), {
      status: 303,
    });
  }

  return NextResponse.json({
    ok: true,
    recruiter_profile_id: recruiterProfile?.id ?? null,
    recruiter_verified: domainScore >= 70,
    trust_score: domainScore,
    factors: [
      { label: "Work domain", score: domainScore, detail: "Placeholder domain and organization consistency check." },
      { label: "Role claim", score: 76, detail: "Placeholder recruiter role review for hiring workflow access." },
    ],
  });
}
