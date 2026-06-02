import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AssistantAction = "answer" | "reviewed" | "escalated";

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await req.json()) as {
      action?: unknown;
      answer?: unknown;
      answer_source?: unknown;
    };

    return {
      action: String(payload.action ?? "").trim(),
      answer: String(payload.answer ?? "").trim(),
      answerSource: String(payload.answer_source ?? "").trim(),
    };
  }

  const formData = await req.formData();

  return {
    action: String(formData.get("action") ?? "").trim(),
    answer: String(formData.get("answer") ?? "").trim(),
    answerSource: String(formData.get("answer_source") ?? "").trim(),
  };
}

function normalizeAction(action: string): AssistantAction | null {
  if (action === "answer") {
    return "answer";
  }

  if (action === "reviewed" || action === "mark_reviewed") {
    return "reviewed";
  }

  if (action === "escalated" || action === "mark_escalated") {
    return "escalated";
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
      { ok: false, error: "Invalid assistant question id" },
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
      { ok: false, error: "Invalid assistant action" },
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
          answer_source: payload.answerSource || "admin_review",
          status: "answered",
          answered_by: actor,
          updated_at: now,
        }
      : {
          status: action,
          answered_by: actor,
          updated_at: now,
        };

  const { data: assistantQuestion, error } = await supabase
    .from("trust_assistant_questions")
    .update(updateValues)
    .eq("id", id)
    .select("id, question, status, asked_by_user_id, asked_by_email, metadata")
    .single();

  if (error || !assistantQuestion) {
    console.error("trust assistant question update failed", error);

    return NextResponse.json(
      { ok: false, error: "Could not update assistant question" },
      { status: 500 }
    );
  }

  const rowMetadata =
    assistantQuestion.metadata &&
    typeof assistantQuestion.metadata === "object" &&
    !Array.isArray(assistantQuestion.metadata)
      ? (assistantQuestion.metadata as Record<string, unknown>)
      : {};
  const metadata = {
    ...rowMetadata,
    trust_assistant_question_id: id,
    asked_by_user_id: assistantQuestion.asked_by_user_id,
    asked_by_email: assistantQuestion.asked_by_email,
    answered_by: actor,
    actor,
  };
  const eventType =
    action === "answer"
      ? "trust_assistant_question_answered"
      : `trust_assistant_question_${action}`;
  const event =
    action === "answer"
      ? "Trust assistant question answered"
      : action === "reviewed"
        ? "Trust assistant question reviewed"
        : "Trust assistant question escalated";

  const auditInsert = await createAuditLog(supabase, eventType, actor, metadata);

  if (auditInsert.error) {
    console.error("trust assistant audit insert failed", auditInsert.error);
  }

  const signalInsert = await createSignal(supabase, event, metadata);

  if (signalInsert.error) {
    console.error("trust assistant signal insert failed", signalInsert.error);
  }

  if (
    action === "answer" &&
    payload.answerSource === "ai_draft_from_knowledge_base"
  ) {
    const aiAuditInsert = await createAuditLog(
      supabase,
      "ai_answer_approved",
      actor,
      metadata
    );

    if (aiAuditInsert.error) {
      console.error("AI answer approval audit insert failed", aiAuditInsert.error);
    }

    const aiSignalInsert = await createSignal(
      supabase,
      "AI answer approved",
      metadata
    );

    if (aiSignalInsert.error) {
      console.error("AI answer approval signal insert failed", aiSignalInsert.error);
    }
  }

  return NextResponse.redirect(new URL("/back-office#trust-assistant", req.url), {
    status: 303,
  });
}
