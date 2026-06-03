import { NextResponse } from "next/server";
import { createNotification } from "@/lib/communications/createNotification";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

const allowedStatuses = new Set([
  "under_review",
  "upheld",
  "reversed",
  "escalated",
  "closed",
]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) return access.response;

  const { id } = await context.params;
  const formData = await req.formData();
  const status = String(formData.get("status") ?? "").trim();
  const resolutionNotes = String(formData.get("resolution_notes") ?? "").trim();

  if (!allowedStatuses.has(status)) {
    return NextResponse.json(
      { ok: false, error: "Invalid appeal status" },
      { status: 400 }
    );
  }

  const { data: appeal, error: appealError } = await supabase
    .from("appeals")
    .select("*")
    .eq("id", id)
    .single();

  if (appealError || !appeal) {
    return NextResponse.json(
      { ok: false, error: "Appeal not found" },
      { status: 404 }
    );
  }

  const actor = access.user.email ?? access.user.id;
  const metadata = {
    appeal_id: id,
    passport_id: appeal.passport_id,
    verification_case_id: appeal.verification_case_id,
    status,
    actor,
  };

  const update: Record<string, unknown> = {
    status,
    reviewed_by: actor,
    reviewed_at: new Date().toISOString(),
  };

  if (resolutionNotes) {
    update.resolution_notes = resolutionNotes;
  }

  await supabase.from("appeals").update(update).eq("id", id);
  await createAuditLog(supabase, "appeal_reviewed", actor, metadata);
  await createSignal(supabase, "Appeal reviewed", metadata);
  await createNotification(supabase, {
    userId: appeal.submitted_by_user_id,
    title: "Appeal reviewed",
    body: `Your appeal status is now ${status}.`,
    notificationType: "appeal_reviewed",
    actor,
    metadata,
  });

  return NextResponse.redirect(new URL("/back-office#help", req.url), {
    status: 303,
  });
}
