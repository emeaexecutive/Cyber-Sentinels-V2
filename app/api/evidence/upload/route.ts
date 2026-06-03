import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

const bucketName = "evidence-files";
const maxFileSize = 10 * 1024 * 1024;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedMimeTypes = new Map([
  ["application/pdf", "PDF"],
  ["image/png", "PNG"],
  ["image/jpeg", "JPG"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "DOCX",
  ],
]);

const allowedExtensions = new Map([
  ["pdf", "PDF"],
  ["png", "PNG"],
  ["jpg", "JPG"],
  ["jpeg", "JPEG"],
  ["docx", "DOCX"],
]);

function getText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function sanitizeName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function getFileType(file: File) {
  const mimeType = allowedMimeTypes.get(file.type);

  if (mimeType) {
    return mimeType;
  }

  return allowedExtensions.get(getExtension(file.name)) ?? null;
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
  const verificationCaseId = getText(formData.get("verification_case_id"));
  const notes = getText(formData.get("notes"));
  const optionalEvidenceUrl = getText(formData.get("evidence_url"));
  const file = formData.get("file");

  if (!uuidPattern.test(verificationCaseId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid verification case" },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json(
      { ok: false, error: "Evidence file is required" },
      { status: 400 }
    );
  }

  if (file.size > maxFileSize) {
    return NextResponse.json(
      { ok: false, error: "Evidence file must be 10MB or smaller" },
      { status: 400 }
    );
  }

  const fileType = getFileType(file);

  if (!fileType) {
    return NextResponse.json(
      { ok: false, error: "Supported files: PDF, PNG, JPG, JPEG, DOCX" },
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

  const { data: passport } = verificationCase.passport_id
    ? await supabase
        .from("passports")
        .select("id,user_email")
        .eq("id", verificationCase.passport_id)
        .maybeSingle()
    : { data: null };

  if (
    passport?.user_email &&
    user.email !== passport.user_email &&
    !isAdminAllowlisted(user.email)
  ) {
    return NextResponse.json(
      { ok: false, error: "You can only upload evidence for your own verification." },
      { status: 403 }
    );
  }

  const actor = user.email ?? user.id;
  const now = new Date().toISOString();
  const safeName = sanitizeName(file.name) || `evidence.${getExtension(file.name)}`;
  const storagePath = `${verificationCaseId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    console.error("evidence storage upload failed", uploadError);

    return NextResponse.json(
      { ok: false, error: "Could not store evidence file" },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(storagePath);
  const fileUrl = publicUrlData.publicUrl;

  const { data: evidenceRow, error: evidenceError } = await supabase
    .from("evidence_files")
    .insert({
      verification_case_id: verificationCaseId,
      passport_id: verificationCase.passport_id,
      evidence_type: fileType,
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
      storage_path: storagePath,
      public_url: fileUrl,
      file_url: fileUrl,
      media_type: fileType,
      notes,
      uploaded_by: actor,
      status: "pending_review",
      scan_status: "pending_review",
      created_at: now,
    })
    .select("id, verification_case_id, passport_id, evidence_type, file_name, file_type, file_size, storage_path, file_url, status, created_at")
    .single();

  if (evidenceError || !evidenceRow) {
    console.error("evidence insert failed", evidenceError);

    return NextResponse.json(
      { ok: false, error: "Could not record evidence" },
      { status: 500 }
    );
  }

  const signalMetadata = {
    evidence_id: evidenceRow.id,
    verification_case_id: verificationCaseId,
    passport_id: verificationCase.passport_id,
    evidence_type: fileType,
    actor,
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
    evidence_id: evidenceRow.id,
    verification_case_id: verificationCaseId,
    passport_id: verificationCase.passport_id,
    evidence_type: fileType,
    file_name: file.name,
    file_type: fileType,
    file_size: file.size,
    storage_path: storagePath,
    file_url: fileUrl,
    evidence_url: optionalEvidenceUrl || null,
    notes,
    actor,
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

  return NextResponse.json({
    ok: true,
    evidence_id: evidenceRow.id,
    signal_id: signalRow.id,
    audit_id: auditRow.id,
  });
}
