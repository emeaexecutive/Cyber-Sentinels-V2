import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { recordOriTelemetry } from "@/lib/operational-risk";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readRequestValues(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }

  const formData = await req.formData();

  return Object.fromEntries(formData.entries());
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const adminSupabase = createServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("verification_events")
    .select("*")
    .in("status", ["pending", "needs_manual_review"])
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: validationCases, error: validationError } = await adminSupabase
    .from("release_validation_cases")
    .select("case_id,dataset_version,entity_type,workflow,input_evidence,expected_outcome,actual_outcome,ground_truth_label,review_status,review_confidence,source_provenance,usage_boundary,limitations,evidence_references,uncertainty,disagreement")
    .in("review_status", ["pending", "reviewed", "disputed"])
    .order("created_at", { ascending: true })
    .limit(100);

  const { data: oriInferences, error: oriError } = await adminSupabase
    .from("ori_inference_records")
    .select("inference_id,tenant_id,trust_session_id,model_version,score,risk_band,recommendation,abstain,confidence_band,comparison_category,missing_feature_ids,explanation_summary,inferred_at")
    .is("latest_reviewer_outcome_id", null)
    .order("inferred_at", { ascending: false })
    .limit(100);

  if (error || (validationError && validationError.code !== "42P01") || (oriError && oriError.code !== "42P01")) {
    console.error("admin review queue fetch failed", error);
    return NextResponse.json({ ok: false, error: "admin_reviews_fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reviews: data ?? [], validation_cases: validationCases ?? [], ori_inferences: oriInferences ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const body = await readRequestValues(req);
  const verificationEventId = stringValue(body.verification_event_id);
  const validationCaseId = stringValue(body.validation_case_id);
  const oriInferenceId = stringValue(body.ori_inference_id);
  const status = stringValue(body.status);
  const notes = stringValue(body.notes);

  if (oriInferenceId) {
    const outcome = stringValue(body.ori_outcome);
    const usefulness = stringValue(body.usefulness);
    const explanationSufficiency = stringValue(body.explanation_sufficiency);
    const cautionAlignment = stringValue(body.caution_alignment);
    const expectedClass = stringValue(body.expected_class);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(oriInferenceId) ||
      !["CORRECT", "TOO_CAUTIOUS", "NOT_CAUTIOUS_ENOUGH", "NOT_USEFUL"].includes(outcome) ||
      !["USEFUL", "PARTIALLY_USEFUL", "NOT_USEFUL"].includes(usefulness) ||
      !["SUFFICIENT", "PARTIAL", "INSUFFICIENT"].includes(explanationSufficiency) ||
      !["APPROPRIATE", "TOO_CAUTIOUS", "NOT_CAUTIOUS_ENOUGH", "NOT_COMPARABLE"].includes(cautionAlignment) ||
      (expectedClass && !["CAUTION", "NO_CAUTION"].includes(expectedClass)) ||
      notes.length > 2000
    ) {
      return NextResponse.json({ ok: false, error: "invalid_ori_review" }, { status: 400 });
    }
    const adminSupabase = createServiceRoleClient();
    const { data: outcomeId, error: reviewError } = await adminSupabase.rpc("record_ori_reviewer_outcome", {
      target_inference_id: oriInferenceId,
      target_reviewer_id: access.user.id,
      target_outcome: outcome,
      target_usefulness: usefulness,
      target_explanation_sufficiency: explanationSufficiency,
      target_caution_alignment: cautionAlignment,
      target_notes: notes || null,
      target_expected_class: expectedClass || null,
    });
    if (reviewError) {
      console.error("ORI reviewer outcome failed", reviewError);
      return NextResponse.json({ ok: false, error: "ori_review_failed" }, { status: 500 });
    }
    recordOriTelemetry({
      event: "reviewer_complete",
      correlationId: `ori-review:${oriInferenceId}`,
      mode: "shadow",
      modelVersion: "server-selected",
      recordedAt: new Date().toISOString(),
    });
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
      return NextResponse.redirect(new URL("/admin/reviews?updated=ori", req.url), { status: 303 });
    }
    return NextResponse.json({ ok: true, outcome_id: outcomeId });
  }

  if (validationCaseId) {
    const confidence = Number(body.review_confidence);
    const allowed = ["pending", "reviewed", "disputed", "excluded", "approved"];
    if (!allowed.includes(status) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || !notes) {
      return NextResponse.json({ ok: false, error: "invalid_validation_review" }, { status: 400 });
    }
    const adminSupabase = createServiceRoleClient();
    const { data: reviewId, error: reviewError } = await adminSupabase.rpc("review_release_validation_case", {
      target_case_id: validationCaseId,
      target_status: status,
      target_ground_truth_label: stringValue(body.ground_truth_label),
      target_reviewer_id: access.user.id,
      target_reviewer_role: "admin_reviewer",
      target_confidence: confidence,
      target_rationale: notes,
      target_uncertainty: stringValue(body.uncertainty) || null,
      target_disagreement: stringValue(body.disagreement) || null,
    });
    if (reviewError) {
      console.error("validation case review failed", reviewError);
      return NextResponse.json({ ok: false, error: "validation_review_failed" }, { status: 500 });
    }
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
      return NextResponse.redirect(new URL("/admin/reviews?updated=validation", req.url), { status: 303 });
    }
    return NextResponse.json({ ok: true, review_id: reviewId });
  }

  if (
    !verificationEventId ||
    !["approved", "rejected", "needs_manual_review"].includes(status)
  ) {
    return NextResponse.json({ ok: false, error: "invalid_review" }, { status: 400 });
  }

  const adminSupabase = createServiceRoleClient();
  const { data: review, error } = await adminSupabase
    .from("admin_reviews")
    .insert({
      verification_event_id: verificationEventId,
      status,
      reviewer_user_id: access.user.id,
      reviewer_email: access.user.email,
      notes: notes || null,
      metadata: {
        source: "api.admin.reviews",
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("admin review insert failed", error);
    return NextResponse.json({ ok: false, error: "admin_review_failed" }, { status: 500 });
  }

  const { error: eventUpdateError } = await adminSupabase
    .from("verification_events")
    .update({ status, notes: notes || null })
    .eq("id", verificationEventId);
  if (eventUpdateError) {
    console.error("verification event review status update failed", eventUpdateError);
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
      return NextResponse.redirect(
        new URL("/admin/reviews?error=event_update_failed", req.url),
        { status: 303 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "verification_event_update_failed", review_id: review.id },
      { status: 500 }
    );
  }

  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.redirect(new URL("/admin/reviews", req.url), {
      status: 303,
    });
  }

  return NextResponse.json({ ok: true, review_id: review.id });
}
