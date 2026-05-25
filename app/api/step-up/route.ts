import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  evaluateStepUpVerification,
  stepUpAuditEvents,
  stepUpMethods,
  stepUpSignals,
  stepUpTriggerReasons,
  type StepUpMethod,
  type StepUpSubjectType,
  type StepUpTriggerReason,
} from "@/lib/trust-engine/stepUpVerification";

const subjectTypes = [
  "human",
  "candidate",
  "admin",
  "api_key",
  "agent",
  "system",
] as const;

function getRequiredText(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (typeof value !== "string" || !value.trim() || value.length > 160) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

function getAllowed<T extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  allowed: T
) {
  const value = body[field];

  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error("Invalid input");
  }

  return value as T[number];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid step-up request" },
        { status: 400 }
      );
    }

    const subjectType = getAllowed(
      body,
      "subject_type",
      subjectTypes
    ) as StepUpSubjectType;
    const subjectId = getRequiredText(body, "subject_id");
    const triggerReason = getAllowed(
      body,
      "trigger_reason",
      stepUpTriggerReasons
    ) as StepUpTriggerReason;
    const method = getAllowed(body, "method", stepUpMethods) as StepUpMethod;
    const result = evaluateStepUpVerification({
      subject_type: subjectType,
      subject_id: subjectId,
      trigger_reason: triggerReason,
      method,
    });

    const supabase = await createClient();

    // Production should enforce rate limiting and store one-time challenge state.
    await createSignal(
      supabase,
      result.step_up_status === "manual_review"
        ? "step_up_manual_review"
        : "step_up_required"
    );
    await createAuditLog(supabase, "step_up_requested", "step_up_api", {
      subject_type: subjectType,
      subject_id: subjectId,
      trigger_reason: triggerReason,
      method,
    });

    return NextResponse.json({
      ok: true,
      step_up_status: result.step_up_status,
      required_methods: result.required_methods,
      expires_at: result.expires_at,
      recommended_next_step: result.recommended_next_step,
      signals: stepUpSignals,
      audit_events: stepUpAuditEvents,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid step-up request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not create step-up request" },
      { status: 500 }
    );
  }
}
