import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type HelpQuestionAction = "answer" | "close";

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await req.json()) as {
      action?: unknown;
      answer?: unknown;
    };

    return {
      action: String(payload.action ?? "").trim(),
      answer: String(payload.answer ?? "").trim(),
    };
  }

  const formData = await req.formData();

  return {
    action: String(formData.get("action") ?? "").trim(),
    answer: String(formData.get("answer") ?? "").trim(),
  };
}

function normalizeAction(action: string): HelpQuestionAction | null {
  if (action === "answer") {
    return "answer";
  }

  if (action === "close" || action === "closed") {
    return "close";
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
      { ok: false, error: "Invalid help question id" },
      { status: 400 }
    );
  }

  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const payload = await readPayload(req);
  const action = normalizeAction(payload.action);

  if (!action) {
    return NextResponse.json(
      { ok: false, error: "Invalid help question action" },
      { status: 400 }
    );
  }

  if (action === "answer" && !payload.answer) {
    return NextResponse.json(
      { ok: false, error: "Answer is required" },
      { status: 400 }
    );
  }

  const actor = access.user.email ?? access.user.id;
  const now = new Date().toISOString();
  const updateValues =
    action === "answer"
      ? {
          answer: payload.answer,
          status: "answered",
          admin_answered_by: actor,
          answered_at: now,
          updated_at: now,
        }
      : { status: "closed", updated_at: now };

  const { data: helpQuestion, error } = await supabase
    .from("help_questions")
    .update(updateValues)
    .eq("id", id)
    .select(
      "id, question, status, answer, created_by_user_id, created_by_email, created_by_name, reply_channel, admin_answered_by, answered_at, created_at, updated_at"
    )
    .single();

  if (error || !helpQuestion) {
    console.error("help question update failed", error);

    return NextResponse.json(
      { ok: false, error: "Could not update help question" },
      { status: 500 }
    );
  }

  const metadata = {
    help_question_id: id,
    created_by_user_id: helpQuestion.created_by_user_id,
    created_by_email: helpQuestion.created_by_email,
    admin_answered_by: action === "answer" ? actor : null,
    actor,
  };
  const eventType =
    action === "answer" ? "help_question_answered" : "help_question_closed";
  const event =
    action === "answer" ? "Help question answered" : "Help question closed";

  const auditInsert = await createAuditLog(supabase, eventType, actor, metadata);

  if (auditInsert.error) {
    console.error("help question audit insert failed", auditInsert.error);
  }

  const signalInsert = await createSignal(supabase, event, metadata);

  if (signalInsert.error) {
    console.error("help question signal insert failed", signalInsert.error);
  }

  return NextResponse.redirect(new URL("/back-office#activity", req.url), {
    status: 303,
  });
}
