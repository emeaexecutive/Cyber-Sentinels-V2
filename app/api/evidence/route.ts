import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

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
  const evidenceUrl = getRequiredText(formData, "evidence_url");
  const notes = getRequiredText(formData, "notes");

  if (
    !uuidPattern.test(verificationCaseId) ||
    !evidenceType ||
    !evidenceUrl
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
      evidence_url: evidenceUrl,
      file_url: evidenceUrl,
      media_type: evidenceType,
      notes,
      uploaded_by: actor,
      status: "pending_review",
      scan_status: "pending_review",
      created_at: now,
    })
    .select("id, verification_case_id, passport_id, evidence_type, evidence_url, status, created_at")
    .single();

  if (evidenceError || !evidenceRow) {
    console.error("evidence insert failed", evidenceError);

    return NextResponse.json(
      { ok: false, error: "Could not upload evidence" },
      { status: 500 }
    );
  }

  const signalInsert = await createSignal(supabase, "Evidence uploaded");

  if (signalInsert.error) {
    console.error("evidence signal insert failed", signalInsert.error);

    return NextResponse.json(
      { ok: false, error: "Could not record signal" },
      { status: 500 }
    );
  }

  const auditInsert = await createAuditLog(supabase, "evidence_uploaded", actor, {
    evidence_file_id: evidenceRow.id,
    verification_case_id: verificationCaseId,
    passport_id: verificationCase.passport_id,
    subject_name: verificationCase.subject_name,
    subject_type: verificationCase.subject_type,
    evidence_type: evidenceType,
    evidence_url: evidenceUrl,
    status: "pending_review",
  });

  if (auditInsert.error) {
    console.error("evidence audit insert failed", auditInsert.error);

    return NextResponse.json(
      { ok: false, error: "Could not record audit event" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(new URL("/evidence-upload?uploaded=1", req.url), {
    status: 303,
  });
}
