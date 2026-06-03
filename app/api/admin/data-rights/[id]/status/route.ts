import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedStatuses = new Set(["in_progress", "completed"]);

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await req.json()) as { status?: unknown };
    return String(payload.status ?? "").trim();
  }

  const formData = await req.formData();
  return String(formData.get("status") ?? "").trim();
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await context.params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid data rights request id" },
      { status: 400 }
    );
  }

  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const status = await readPayload(req);

  if (!allowedStatuses.has(status)) {
    return NextResponse.json(
      { ok: false, error: "Invalid data rights status" },
      { status: 400 }
    );
  }

  const actor = access.user.email ?? access.user.id;
  const now = new Date().toISOString();
  const updateValues =
    status === "completed"
      ? {
          status,
          handled_by: actor,
          handled_at: now,
          updated_at: now,
        }
      : {
          status,
          handled_by: actor,
          updated_at: now,
        };

  const { data: request, error } = await supabase
    .from("data_rights_requests")
    .update(updateValues)
    .eq("id", id)
    .select(
      "id, request_type, requester_email, requester_user_id, status, handled_by, handled_at"
    )
    .single();

  if (error || !request) {
    console.error("data rights request status update failed", error);

    return NextResponse.json(
      { ok: false, error: "Could not update data rights request" },
      { status: 500 }
    );
  }

  const metadata = {
    data_rights_request_id: id,
    request_type: request.request_type,
    requester_email: request.requester_email,
    requester_user_id: request.requester_user_id,
    status,
    actor,
  };
  const eventType =
    status === "completed"
      ? "data_rights_request_completed"
      : "data_rights_request_in_progress";
  const event =
    status === "completed"
      ? "Data rights request completed"
      : "Data rights request in progress";

  await createAuditLog(supabase, eventType, actor, metadata);
  await createSignal(supabase, event, metadata);

  return NextResponse.redirect(new URL("/back-office#data-rights", req.url), {
    status: 303,
  });
}
