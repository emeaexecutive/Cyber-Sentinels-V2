import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

  if (error || (validationError && validationError.code !== "42P01")) {
    console.error("admin review queue fetch failed", error);
    return NextResponse.json({ ok: false, error: "admin_reviews_fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reviews: data ?? [], validation_cases: validationCases ?? [] });
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
  const status = stringValue(body.status);
  const notes = stringValue(body.notes);

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
