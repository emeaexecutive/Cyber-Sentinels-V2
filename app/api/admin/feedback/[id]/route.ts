import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedTargets = new Set(["feedback_reports", "interest_signals"]);
const allowedStatuses = new Set(["reviewed", "resolved", "high_signal"]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await context.params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid feedback id" },
      { status: 400 }
    );
  }

  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const formData = await req.formData();
  const target = String(formData.get("target") ?? "feedback_reports");
  const status = String(formData.get("status") ?? "").trim();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  if (!allowedTargets.has(target) || !allowedStatuses.has(status)) {
    return NextResponse.json(
      { ok: false, error: "Invalid feedback update" },
      { status: 400 }
    );
  }

  const actor = access.user.email ?? access.user.id;
  const { error } = await supabase
    .from(target)
    .update({
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not update feedback" },
      { status: 500 }
    );
  }

  const metadata = {
    feedback_id: id,
    target,
    status,
    actor,
  };

  await createAuditLog(supabase, "feedback_status_updated", actor, metadata);
  await createSignal(
    supabase,
    status === "high_signal" ? "feedback_high_signal_marked" : "feedback_reviewed",
    metadata
  );

  return NextResponse.redirect(new URL("/back-office#feedback-signals", req.url), {
    status: 303,
  });
}
