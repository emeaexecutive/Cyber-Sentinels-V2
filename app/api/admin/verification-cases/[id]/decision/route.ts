import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-auth";
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
import { calculateTrustScore } from "@/lib/trust-engine/calculateTrustScore";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

type DecisionPayload = {
  decision?: unknown;
  status?: unknown;
  notes?: unknown;
};

type PassportForDecision = {
  id: string;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  liveness_score: number | null;
  image_authenticity_score: number | null;
  synthetic_risk: number | null;
  voice_clone_risk: number | null;
  video_deepfake_risk: number | null;
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
    const adminAccess = await requireAdminAccess(supabase);

    if (!adminAccess.ok) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: adminAccess.status }
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

    const actor = adminAccess.user.email ?? adminAccess.user.id;
    const requestRisk = getRequestRiskFields(req);

    const { data: verificationCase, error: updateError } = await supabase
      .from("verification_cases")
      .update({
        status: parsed.status,
        verification_status: parsed.status,
        decision_type: parsed.decision,
        reviewed_by: adminAccess.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,passport_id,subject_name,subject_type,status")
      .single();

    if (updateError || !verificationCase) {
      return NextResponse.json(
        { ok: false, error: "Could not update verification case" },
        { status: 500 }
      );
    }

    if (parsed.status === "in_review") {
      const reviewStartedInsert = await createAuditLog(
        supabase,
        "verification_review_started",
        actor,
        {
          verification_case_id: id,
          subject_name: verificationCase.subject_name,
          subject_type: verificationCase.subject_type,
          decision: parsed.decision,
          status: parsed.status,
          ...requestRisk,
        }
      );

      if (reviewStartedInsert.error) {
        return NextResponse.json(
          { ok: false, error: "Could not record audit event" },
          { status: 500 }
        );
      }
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

    if (verificationCase.passport_id) {
      const { data: passport } = await supabase
        .from("passports")
        .select(
          "id,human_presence_index,origin_trace_score,liveness_score,image_authenticity_score,synthetic_risk,voice_clone_risk,video_deepfake_risk"
        )
        .eq("id", verificationCase.passport_id)
        .single()
        .returns<PassportForDecision>();
      const reviewOutcome =
        parsed.decision === "allow"
          ? "allow"
          : parsed.decision === "deny"
            ? "deny"
            : "manual_review";
      const trustScore = calculateTrustScore({
        humanPresenceIndex: passport?.human_presence_index ?? 50,
        originTraceScore: passport?.origin_trace_score ?? 50,
        livenessScore: passport?.liveness_score ?? 50,
        imageAuthenticityScore: passport?.image_authenticity_score ?? 50,
        syntheticRisk: passport?.synthetic_risk ?? 0,
        voiceCloneRisk: passport?.voice_clone_risk ?? 0,
        videoDeepfakeRisk: passport?.video_deepfake_risk ?? 0,
        reviewOutcome,
      });

      const clearance =
        parsed.status === "verified"
          ? "approved"
          : parsed.status === "rejected"
            ? "rejected"
            : parsed.status;

      const passportUpdate = await supabase
        .from("passports")
        .update({
          review_status: parsed.status,
          verification_status: parsed.status,
          reality_passport_status: parsed.status,
          clearance,
          verified: parsed.status === "verified",
          trust_score: trustScore,
        })
        .eq("id", verificationCase.passport_id);

      if (passportUpdate.error) {
        return NextResponse.json(
          { ok: false, error: "Could not update passport" },
          { status: 500 }
        );
      }
    }

    const statusAuditInsert = await createAuditLog(
      supabase,
      "admin_case_status_updated",
      actor,
      {
        verification_case_id: id,
        subject_name: verificationCase.subject_name,
        subject_type: verificationCase.subject_type,
        status: parsed.status,
        ...requestRisk,
      }
    );

    if (statusAuditInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record audit event" },
        { status: 500 }
      );
    }

    const auditInsert = await createAuditLog(
      supabase,
      "admin_decision_created",
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

    const signalInsert = await createSignal(
      supabase,
      "Verification case decision created"
    );

    if (signalInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record signal" },
        { status: 500 }
      );
    }

    if (
      parsed.status === "verified" ||
      parsed.status === "rejected" ||
      parsed.status === "escalated"
    ) {
      const workflowAuditInsert = await createAuditLog(
        supabase,
        "verification_completed",
        actor,
        {
          verification_case_id: id,
          passport_id: verificationCase.passport_id,
          subject_name: verificationCase.subject_name,
          subject_type: verificationCase.subject_type,
          decision: parsed.decision,
          status: parsed.status,
          ...requestRisk,
        }
      );

      if (workflowAuditInsert.error) {
        return NextResponse.json(
          { ok: false, error: "Could not record audit event" },
          { status: 500 }
        );
      }

      const completedSignalInsert = await createSignal(
        supabase,
        "Decision completed"
      );

      if (completedSignalInsert.error) {
        return NextResponse.json(
          { ok: false, error: "Could not record signal" },
          { status: 500 }
        );
      }
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
