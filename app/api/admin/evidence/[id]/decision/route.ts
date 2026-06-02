import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type EvidenceDecision = "accepted" | "rejected" | "needs_more_evidence";

async function readDecision(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await req.json()) as { decision?: unknown };
    return String(payload.decision ?? "");
  }

  const formData = await req.formData();

  return String(formData.get("decision") ?? "");
}

function normalizeDecision(decision: string): EvidenceDecision | null {
  if (decision === "accept" || decision === "accepted") {
    return "accepted";
  }

  if (decision === "reject" || decision === "rejected") {
    return "rejected";
  }

  if (
    decision === "request_more_evidence" ||
    decision === "needs_more_evidence"
  ) {
    return "needs_more_evidence";
  }

  return null;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await context.params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid evidence id" },
      { status: 400 }
    );
  }

  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const decision = normalizeDecision(await readDecision(req));

  if (!decision) {
    return NextResponse.json(
      { ok: false, error: "Invalid evidence decision" },
      { status: 400 }
    );
  }

  const { data: evidenceRow, error: evidenceFetchError } = await supabase
    .from("evidence_files")
    .select("id, verification_case_id, passport_id, evidence_type, file_type, file_url, public_url")
    .eq("id", id)
    .single();

  if (evidenceFetchError || !evidenceRow) {
    return NextResponse.json(
      { ok: false, error: "Evidence not found" },
      { status: 404 }
    );
  }

  const { error: evidenceUpdateError } = await supabase
    .from("evidence_files")
    .update({ status: decision })
    .eq("id", id);

  if (evidenceUpdateError) {
    console.error("evidence decision update failed", evidenceUpdateError);

    return NextResponse.json(
      { ok: false, error: "Could not update evidence" },
      { status: 500 }
    );
  }

  const actor = access.user.email ?? access.user.id;
  const now = new Date().toISOString();
  const accepted = decision === "accepted";
  const rejected = decision === "rejected";
  const event = accepted
    ? "Evidence accepted"
    : rejected
      ? "Evidence rejected"
      : "More evidence requested";
  const eventType = accepted
    ? "evidence_accepted"
    : rejected
      ? "evidence_rejected"
      : "evidence_more_evidence_requested";
  const metadata = {
    evidence_id: id,
    verification_case_id: evidenceRow.verification_case_id,
    passport_id: evidenceRow.passport_id,
    evidence_type: evidenceRow.evidence_type ?? evidenceRow.file_type,
    file_url: evidenceRow.public_url ?? evidenceRow.file_url,
  };

  const { error: signalError } = await supabase.from("signals").insert({
    event,
    metadata,
    created_at: now,
  });

  if (signalError) {
    console.error("evidence review signal insert failed", signalError);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    event_type: eventType,
    actor,
    metadata,
    created_at: now,
  });

  if (auditError) {
    console.error("evidence review audit insert failed", auditError);
  }

  return NextResponse.redirect(new URL("/back-office", req.url), {
    status: 303,
  });
}
