import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/evidence-upload", req.url), {
      status: 303,
    });
  }

  const formData = await req.formData();
  const verificationCaseId = getRequiredText(formData, "verification_case_id");
  const evidenceType = getRequiredText(formData, "evidence_type");
  const fileUrl = getRequiredText(formData, "file_url");
  const notes = getRequiredText(formData, "notes");

  if (
    !uuidPattern.test(verificationCaseId) ||
    !evidenceType ||
    !fileUrl
  ) {
    return NextResponse.redirect(new URL("/evidence-upload?error=1", req.url), {
      status: 303,
    });
  }

  const { data: verificationCase, error: caseError } = await supabase
    .from("verification_cases")
    .select("id,passport_id,subject_name,subject_type")
    .eq("id", verificationCaseId)
    .single();

  if (caseError || !verificationCase) {
    return NextResponse.redirect(new URL("/evidence-upload?error=1", req.url), {
      status: 303,
    });
  }

  const actor = user.email ?? user.id;
  const now = new Date().toISOString();
  const { data: evidenceRow, error: evidenceError } = await supabase
    .from("evidence_files")
    .insert({
      verification_case_id: verificationCaseId,
      passport_id: verificationCase.passport_id,
      evidence_type: evidenceType,
      file_url: fileUrl,
      media_type: evidenceType,
      notes,
      uploaded_by: actor,
      status: "pending_review",
      scan_status: "pending_review",
      created_at: now,
    })
    .select("id, verification_case_id, passport_id, evidence_type, file_url, status, created_at")
    .single();

  if (evidenceError || !evidenceRow) {
    console.error("evidence insert failed", evidenceError);

    return NextResponse.json(
      { ok: false, error: "Could not upload evidence" },
      { status: 500 }
    );
  }

  const signalMetadata = {
    verification_case_id: verificationCaseId,
    passport_id: verificationCase.passport_id,
    evidence_type: evidenceType,
  };

  const { data: signalRow, error: signalError } = await supabase
    .from("signals")
    .insert({
      event: "Evidence uploaded",
      metadata: signalMetadata,
      created_at: now,
    })
    .select("id")
    .single();

  if (signalError || !signalRow) {
    console.error("evidence signal insert failed", signalError);

    return NextResponse.json(
      { ok: false, error: "Could not record signal" },
      { status: 500 }
    );
  }

  const auditMetadata = {
    verification_case_id: verificationCaseId,
    passport_id: verificationCase.passport_id,
    evidence_type: evidenceType,
    file_url: fileUrl,
    notes,
  };

  const { data: auditRow, error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      event_type: "evidence_uploaded",
      actor,
      metadata: auditMetadata,
      created_at: now,
    })
    .select("id")
    .single();

  if (auditError || !auditRow) {
    console.error("evidence audit insert failed", auditError);

    return NextResponse.json(
      { ok: false, error: "Could not record audit event" },
      { status: 500 }
    );
  }

  console.log("evidence uploaded", {
    evidence_id: evidenceRow.id,
    signal_id: signalRow.id,
    audit_id: auditRow.id,
  });

  return NextResponse.json({
    ok: true,
    evidence_id: evidenceRow.id,
    signal_id: signalRow.id,
    audit_id: auditRow.id,
  });
}
