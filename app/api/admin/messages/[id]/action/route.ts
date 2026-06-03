import { NextResponse } from "next/server";
import { createNotification } from "@/lib/communications/createNotification";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

const allowedActions = new Set(["reply", "escalate", "close"]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) return access.response;

  const { id } = await context.params;
  const formData = await req.formData();
  const action = String(formData.get("action") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!allowedActions.has(action)) {
    return NextResponse.json(
      { ok: false, error: "Invalid message action" },
      { status: 400 }
    );
  }

  const { data: thread, error: threadError } = await supabase
    .from("message_threads")
    .select("*")
    .eq("id", id)
    .single();

  if (threadError || !thread) {
    return NextResponse.json(
      { ok: false, error: "Message thread not found" },
      { status: 404 }
    );
  }

  const actor = access.user.email ?? access.user.id;
  const metadata = {
    thread_id: id,
    action,
    actor,
  };

  if (action === "reply") {
    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Reply message is required" },
        { status: 400 }
      );
    }

    await supabase.from("message_events").insert({
      thread_id: id,
      sender_type: "admin",
      sender_email: actor,
      message,
      metadata,
    });
    await supabase
      .from("message_threads")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", id);
    await createNotification(supabase, {
      userId: thread.created_by_user_id,
      title: "Message received",
      body: "An admin replied to your message thread.",
      notificationType: "message_received",
      actor,
      metadata,
    });
  }

  if (action === "escalate" || action === "close") {
    await supabase
      .from("message_threads")
      .update({
        status: action === "escalate" ? "escalated" : "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  await createAuditLog(supabase, "message_received", actor, metadata);
  await createSignal(supabase, "Message received", metadata);

  return NextResponse.redirect(new URL("/back-office#help", req.url), {
    status: 303,
  });
}
