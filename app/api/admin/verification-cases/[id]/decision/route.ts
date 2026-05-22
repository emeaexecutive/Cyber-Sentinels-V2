import { NextResponse } from "next/server";
import {
  backOfficeStatuses,
  decisionActions,
  type BackOfficeStatus,
  type DecisionAction,
} from "@/lib/back-office";
import {
  configurationError,
  getRequestRiskFields,
} from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

type DecisionPayload = {
  decision?: unknown;
  status?: unknown;
  notes?: unknown;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePayload(payload: DecisionPayload) {
  const decision = String(payload.decision ?? "");
  const status = String(payload.status ?? "");
  const notes = String(payload.notes ?? "").trim();

  if (!decisionActions.includes(decision as DecisionAction)) {
    return { error: "Invalid decision" };
  }

  if (!backOfficeStatuses.includes(status as BackOfficeStatus)) {
    return { error: "Invalid status" };
  }

  if (notes.length > 1000) {
    return { error: "Notes are too long" };
  }

  return {
    decision: decision as DecisionAction,
    status: status as BackOfficeStatus,
    notes,
  };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!uuidPattern.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid verification case" },
        { status: 400 }
      );
    }

    const parsed = parsePayload((await req.json()) as DecisionPayload);

    if ("error" in parsed) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: 400 }
      );
    }

    const actor = user.email ?? user.id;
    const requestRisk = getRequestRiskFields(req);

    const { data: verificationCase, error: updateError } = await supabase
      .from("verification_cases")
      .update({
        status: parsed.status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,subject_name,subject_type,status")
      .single();

    if (updateError || !verificationCase) {
      return NextResponse.json(
        { ok: false, error: "Could not update verification case" },
        { status: 500 }
      );
    }

    const decisionInsert = await supabase.from("decisions").insert({
      verification_case_id: id,
      decision: parsed.decision,
      status: parsed.status,
      notes: parsed.notes || null,
      actor,
    });

    if (decisionInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record decision" },
        { status: 500 }
      );
    }

    const subjectName =
      typeof verificationCase.subject_name === "string" &&
      verificationCase.subject_name
        ? verificationCase.subject_name
        : "verification case";
    const signal = `Verification case ${parsed.status}: ${subjectName}`;

    const auditInsert = await createAuditLog(
      supabase,
      "verification_case.decision_created",
      actor,
      {
        verification_case_id: id,
        subject_name: verificationCase.subject_name,
        subject_type: verificationCase.subject_type,
        decision: parsed.decision,
        status: parsed.status,
        notes: parsed.notes || null,
        ...requestRisk,
      }
    );

    if (auditInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record audit event" },
        { status: 500 }
      );
    }

    const signalInsert = await createSignal(supabase, signal);

    if (signalInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record signal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      verification_case: {
        id,
        status: parsed.status,
      },
      decision: parsed.decision,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Server configuration is incomplete."
    ) {
      return configurationError();
    }

    return NextResponse.json(
      { ok: false, error: "Could not record verification decision" },
      { status: 500 }
    );
  }
}
