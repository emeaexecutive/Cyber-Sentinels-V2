import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedFileTypes = new Set(["PDF", "PNG", "JPG", "JPEG", "DOCX"]);

type EvidencePayload = {
  verification_case_id?: unknown;
  file_name?: unknown;
  file_type?: unknown;
  file_size?: unknown;
  storage_path?: unknown;
  public_url?: unknown;
  notes?: unknown;
};

async function readPayload(req: Request): Promise<EvidencePayload> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await req.json()) as EvidencePayload;
  }

  const formData = await req.formData();

  return {
    verification_case_id: formData.get("verification_case_id"),
    file_name: formData.get("file_name"),
    file_type: formData.get("file_type"),
    file_size: formData.get("file_size"),
    storage_path: formData.get("storage_path"),
    public_url: formData.get("public_url"),
    notes: formData.get("notes"),
  };
}

function getText(value: unknown) {
  return String(value ?? "").trim();
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

  const payload = await readPayload(req);
  const verificationCaseId = getText(payload.verification_case_id);
  const fileName = getText(payload.file_name);
  const fileType = getText(payload.file_type).toUpperCase();
  const fileSize = Number(payload.file_size ?? 0);
  const storagePath = getText(payload.storage_path);
  const publicUrl = getText(payload.public_url);
  const notes = getText(payload.notes);

  if (
    !uuidPattern.test(verificationCaseId) ||
    !fileName ||
    !allowedFileTypes.has(fileType) ||
    !Number.isFinite(fileSize) ||
    fileSize <= 0 ||
    !storagePath ||
    !publicUrl
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid evidence upload" },
      { status: 400 }
    );
  }

  const { data: verificationCase, error: caseError } = await supabase
    .from("verification_cases")
    .select("id,passport_id,subject_name,subject_type")
    .eq("id", verificationCaseId)
    .single();

  if (caseError || !verificationCase) {
    return NextResponse.json(
      { ok: false, error: "Verification case not found" },
      { status: 404 }
    );
  }

  const actor = user.email ?? user.id;
  const now = new Date().toISOString();
  const { data: evidenceRow, error: evidenceError } = await supabase
    .from("evidence_files")
    .insert({
      verification_case_id: verificationCaseId,
      passport_id: verificationCase.passport_id,
      evidence_type: fileType,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      storage_path: storagePath,
      public_url: publicUrl,
      file_url: publicUrl,
      media_type: fileType,
      notes,
      uploaded_by: actor,
      status: "pending_review",
      scan_status: "pending_review",
      created_at: now,
    })
    .select("id, verification_case_id, passport_id, evidence_type, file_name, file_type, file_size, storage_path, public_url, status, created_at")
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
    evidence_type: fileType,
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
    evidence_type: fileType,
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize,
    storage_path: storagePath,
    public_url: publicUrl,
    file_url: publicUrl,
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
