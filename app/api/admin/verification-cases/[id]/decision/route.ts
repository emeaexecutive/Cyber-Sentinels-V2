import { NextResponse } from "next/server";
import {
  adminVerifiedCookieName,
  getAdminCookieOptions,
} from "@/lib/admin-auth";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import {
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
import {
  decisionEngineAuditEvent,
  evaluateDecisionEngine,
} from "@/lib/trust-engine/decisionEngine";
import {
  evaluatePolicyEngine,
  policyEngineAuditEvent,
} from "@/lib/trust-engine/policyEngine";

type DecisionPayload = {
  decision?: unknown;
  status?: unknown;
};

type PassportForDecision = {
  id: string;
  media_type: string | null;
  trust_score: number | null;
  human_presence_index: number | null;
  origin_trace_score: number | null;
  liveness_score: number | null;
  image_authenticity_score: number | null;
  synthetic_risk: number | null;
  voice_clone_risk: number | null;
  video_deepfake_risk: number | null;
  linkedin_profile_consistency: number | null;
  provenance_status: string | null;
  review_status: string | null;
  suspicious_activity: boolean | null;
  abuse_risk: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePayload(payload: DecisionPayload) {
  const decision = String(payload.decision ?? "");
  const status = String(payload.status ?? "");

  if (!decisionActions.includes(decision as DecisionAction)) {
    return { error: "Invalid decision" };
  }

  if (status && !(decision === "manual_review" && status === "escalated")) {
    return { error: "Invalid status" };
  }

  return {
    decision: decision as DecisionAction,
    requestedStatus: status as "escalated" | "",
  };
}

async function readDecisionPayload(req: Request): Promise<DecisionPayload> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await req.json()) as DecisionPayload;
  }

  const formData = await req.formData();

  return {
    decision: formData.get("decision"),
    status: formData.get("status"),
  };
}

function getDecisionStatus(
  decision: DecisionAction,
  requestedStatus?: "escalated" | ""
): BackOfficeStatus {
  if (requestedStatus === "escalated") {
    return "escalated";
  }

  if (decision === "allow") {
    return "verified";
  }

  if (decision === "deny") {
    return "rejected";
  }

  if (decision === "needs_more_evidence") {
    return "escalated";
  }

  return "in_review";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    if (!uuidPattern.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid verification case" },
        { status: 400 }
      );
    }

    const parsed = parsePayload(await readDecisionPayload(req));
    const access = await requireAdminApiAccess(req, supabase);

    if (!access.ok) {
      return access.response;
    }

    if ("error" in parsed) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: 400 }
      );
    }

    const user = access.user;
    const actor = user.email ?? user.id;
    const requestRisk = getRequestRiskFields(req);
    const status = getDecisionStatus(
      parsed.decision,
      parsed.requestedStatus
    );

    const { data: verificationCase, error: verificationCaseError } = await supabase
      .from("verification_cases")
      .select(
        "id,passport_id,subject_name,subject_type,status,human_presence_index,origin_trace_score,trust_score,linkedin_url,linkedin_verification_status,linkedin_profile_consistency,linkedin_claimed_company,linkedin_claimed_role"
      )
      .eq("id", id)
      .single();

    if (verificationCaseError || !verificationCase) {
      return NextResponse.json(
        { ok: false, error: "Could not load verification case" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const { data: decisionRow, error: decisionInsertError } = await supabase
      .from("decisions")
      .insert({
        verification_case_id: id,
        case_id: id,
        passport_id: verificationCase.passport_id,
        decision: parsed.decision,
        status,
        actor,
        decided_by: actor,
        created_at: now,
        updated_at: now,
      })
      .select("id, verification_case_id, case_id, decision, status, actor, decided_by, created_at")
      .single();

    if (decisionInsertError || !decisionRow) {
      console.error("decision insert failed", decisionInsertError);
      return NextResponse.json(
        { ok: false, error: "Could not record decision" },
        { status: 500 }
      );
    }

    const updateResult = await supabase
      .from("verification_cases")
      .update({
        status,
        verification_status: status,
        decision_type: parsed.decision,
        reviewed_by: user.id,
        reviewed_at: now,
      })
      .eq("id", id);

    if (updateResult.error) {
      return NextResponse.json(
        { ok: false, error: "Could not update verification case" },
        { status: 500 }
      );
    }

    if (status === "in_review") {
      const reviewStartedInsert = await createAuditLog(
        supabase,
        "verification_review_started",
        actor,
        {
          verification_case_id: id,
          subject_name: verificationCase.subject_name,
          subject_type: verificationCase.subject_type,
          decision: parsed.decision,
          status,
          ...requestRisk,
        }
      );

      if (reviewStartedInsert.error) {
        return NextResponse.json(
          { ok: false, error: "Could not record audit event" },
          { status: 500 }
        );
      }

      const reviewStartedSignal = await createSignal(
        supabase,
        "review_started"
      );

      if (reviewStartedSignal.error) {
        return NextResponse.json(
          { ok: false, error: "Could not record signal" },
          { status: 500 }
        );
      }
    }

    if (verificationCase.linkedin_url) {
      const reviewedStatus =
        parsed.decision === "allow"
          ? "verified_external"
          : parsed.decision === "deny"
            ? "mismatch"
            : "manual_review";

      await supabase
        .from("verification_cases")
        .update({
          linkedin_verification_status: reviewedStatus,
          linkedin_review_required: parsed.decision === "manual_review",
        })
        .eq("id", id);

      if (parsed.decision === "allow") {
        await createSignal(supabase, "LinkedIn profile manually approved");
      }

      if (parsed.decision === "deny") {
        await createSignal(supabase, "LinkedIn profile mismatch detected");
        await createAuditLog(supabase, "linkedin_profile_mismatch", actor, {
          verification_case_id: id,
          linkedin_url: verificationCase.linkedin_url,
          linkedin_claimed_company: verificationCase.linkedin_claimed_company,
          linkedin_claimed_role: verificationCase.linkedin_claimed_role,
          ...requestRisk,
        });
      }

      await createAuditLog(supabase, "linkedin_profile_reviewed", actor, {
        verification_case_id: id,
        linkedin_url: verificationCase.linkedin_url,
        linkedin_verification_status: reviewedStatus,
        decision: parsed.decision,
        status,
        ...requestRisk,
      });
    }

    if (verificationCase.passport_id) {
      const { data: passport } = await supabase
        .from("passports")
        .select(
          "id,media_type,trust_score,human_presence_index,origin_trace_score,synthetic_risk,liveness_score,linkedin_profile_consistency,video_deepfake_risk,voice_clone_risk,image_authenticity_score,provenance_status,review_status,suspicious_activity,abuse_risk"
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
        status === "verified"
          ? "approved"
          : status === "rejected"
            ? "rejected"
            : status;
      const passportUpdateFields: Record<string, unknown> = {
        review_status: status,
        verification_status: status,
        reality_passport_status: status,
        clearance,
        trust_score: trustScore,
      };

      if (parsed.decision === "allow") {
        passportUpdateFields.verified = true;
      }

      if (parsed.decision === "deny") {
        passportUpdateFields.verified = false;
      }

      if (verificationCase.linkedin_url) {
        passportUpdateFields.linkedin_verification_status =
          parsed.decision === "allow"
            ? "verified_external"
            : parsed.decision === "deny"
              ? "mismatch"
              : "manual_review";
        passportUpdateFields.linkedin_review_required =
          parsed.decision === "manual_review";
      }

      const passportUpdate = await supabase
        .from("passports")
        .update(passportUpdateFields)
        .eq("id", verificationCase.passport_id);

      if (passportUpdate.error) {
        return NextResponse.json(
          { ok: false, error: "Could not update passport" },
          { status: 500 }
        );
      }
    }

    const signalInsert = await createSignal(
      supabase,
      `Admin decision created for ${
        verificationCase.subject_name ?? "Unnamed subject"
      }: ${parsed.decision}`
    );

    if (signalInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record signal" },
        { status: 500 }
      );
    }

    const auditInsert = await createAuditLog(
      supabase,
      "admin_decision_created",
      actor,
      {
        verification_case_id: id,
        passport_id: verificationCase.passport_id,
        subject_name: verificationCase.subject_name,
        decision: parsed.decision,
        status,
      }
    );

    if (auditInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record audit event" },
        { status: 500 }
      );
    }

    const { data: decisionPassport } = verificationCase.passport_id
      ? await supabase
          .from("passports")
          .select(
            "id,media_type,trust_score,human_presence_index,origin_trace_score,synthetic_risk,liveness_score,linkedin_profile_consistency,video_deepfake_risk,voice_clone_risk,image_authenticity_score,provenance_status,review_status,suspicious_activity,abuse_risk"
          )
          .eq("id", verificationCase.passport_id)
          .single()
          .returns<PassportForDecision>()
      : { data: null };
    const engineResult = evaluateDecisionEngine({
      trust_score:
        decisionPassport?.trust_score ?? verificationCase.trust_score ?? null,
      human_presence_index:
        decisionPassport?.human_presence_index ??
        verificationCase.human_presence_index ??
        null,
      origin_trace_score:
        decisionPassport?.origin_trace_score ??
        verificationCase.origin_trace_score ??
        null,
      synthetic_risk: decisionPassport?.synthetic_risk ?? null,
      liveness_score: decisionPassport?.liveness_score ?? null,
      linkedin_profile_consistency:
        decisionPassport?.linkedin_profile_consistency ??
        verificationCase.linkedin_profile_consistency ??
        null,
      video_deepfake_risk: decisionPassport?.video_deepfake_risk ?? null,
      voice_clone_risk: decisionPassport?.voice_clone_risk ?? null,
      image_authenticity_score:
        decisionPassport?.image_authenticity_score ?? null,
      provenance_status: decisionPassport?.provenance_status ?? null,
      review_status: decisionPassport?.review_status ?? status,
      suspicious_activity: decisionPassport?.suspicious_activity ?? false,
      abuse_risk: decisionPassport?.abuse_risk ?? null,
    });

    const engineAuditInsert = await createAuditLog(
      supabase,
      decisionEngineAuditEvent,
      actor,
      {
        verification_case_id: id,
        passport_id: verificationCase.passport_id,
        subject_name: verificationCase.subject_name,
        subject_type: verificationCase.subject_type,
        decision_recommended: engineResult.decision,
        risk_level: engineResult.riskLevel,
        reason_codes: engineResult.reasonCodes,
        signals: engineResult.signals,
        human_decision: parsed.decision,
        status,
        ...requestRisk,
      }
    );

    if (engineAuditInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record decision engine audit event" },
        { status: 500 }
      );
    }

    for (const signal of engineResult.signals) {
      const engineSignalInsert = await createSignal(supabase, signal);

      if (engineSignalInsert.error) {
        return NextResponse.json(
          { ok: false, error: "Could not record decision engine signal" },
          { status: 500 }
        );
      }
    }

    const policyResult = evaluatePolicyEngine({
      requested_action: parsed.decision,
      subject_type: verificationCase.subject_type,
      media_type: decisionPassport?.media_type ?? null,
      has_trust_passport: Boolean(verificationCase.passport_id),
      has_human_presence_index:
        typeof decisionPassport?.human_presence_index === "number" ||
        typeof verificationCase.human_presence_index === "number",
      has_origin_trace:
        typeof decisionPassport?.origin_trace_score === "number" ||
        typeof verificationCase.origin_trace_score === "number",
      has_audit_log: true,
      has_signal: true,
      has_media_evidence: decisionPassport?.media_type
        ? !["video", "audio"].includes(decisionPassport.media_type)
        : true,
      is_admin: true,
      trust_score:
        decisionPassport?.trust_score ?? verificationCase.trust_score ?? null,
      human_presence_index:
        decisionPassport?.human_presence_index ??
        verificationCase.human_presence_index ??
        null,
      origin_trace_score:
        decisionPassport?.origin_trace_score ??
        verificationCase.origin_trace_score ??
        null,
      synthetic_risk: decisionPassport?.synthetic_risk ?? null,
      liveness_score: decisionPassport?.liveness_score ?? null,
      provenance_status: decisionPassport?.provenance_status ?? null,
      linkedin_url: verificationCase.linkedin_url,
      linkedin_verification_status: verificationCase.linkedin_verification_status,
      suspicious_activity: decisionPassport?.suspicious_activity ?? false,
    });

    const policyAuditInsert = await createAuditLog(
      supabase,
      policyEngineAuditEvent,
      actor,
      {
        verification_case_id: id,
        passport_id: verificationCase.passport_id,
        subject_name: verificationCase.subject_name,
        subject_type: verificationCase.subject_type,
        policy_result: policyResult.policy_result,
        policy_action: policyResult.policy_action,
        reason_codes: policyResult.reason_codes,
        signals: policyResult.signals,
        human_decision: parsed.decision,
        status,
        ...requestRisk,
      }
    );

    if (policyAuditInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record policy engine audit event" },
        { status: 500 }
      );
    }

    for (const signal of policyResult.signals) {
      const policySignalInsert = await createSignal(supabase, signal);

      if (policySignalInsert.error) {
        return NextResponse.json(
          { ok: false, error: "Could not record policy engine signal" },
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
        status,
        ...requestRisk,
      }
    );

    if (statusAuditInsert.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record audit event" },
        { status: 500 }
      );
    }

    const reviewActionAudit = await createAuditLog(
      supabase,
      "review_action_created",
      actor,
      {
        verification_case_id: id,
        subject_name: verificationCase.subject_name,
        subject_type: verificationCase.subject_type,
        decision: parsed.decision,
        status,
        ...requestRisk,
      }
    );

    if (reviewActionAudit.error) {
      return NextResponse.json(
        { ok: false, error: "Could not record audit event" },
        { status: 500 }
      );
    }

    if (
      status === "verified" ||
      status === "rejected" ||
      status === "escalated"
    ) {
      const reviewSignal = await createSignal(
        supabase,
        status === "escalated" ? "review_escalated" : "review_completed"
      );

      if (reviewSignal.error) {
        return NextResponse.json(
          { ok: false, error: "Could not record signal" },
          { status: 500 }
        );
      }

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
          status,
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

    const response = NextResponse.redirect(new URL("/back-office", req.url), {
      status: 303,
    });

    response.cookies.set(
      adminVerifiedCookieName,
      "true",
      getAdminCookieOptions()
    );

    return response;
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
