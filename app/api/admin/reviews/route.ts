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

  if (error) {
    console.error("admin review queue fetch failed", error);
    return NextResponse.json({ ok: false, error: "admin_reviews_fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reviews: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(req, supabase);

  if (!access.ok) {
    return access.response;
  }

  const body = await readRequestValues(req);
  const verificationEventId = stringValue(body.verification_event_id);
  const status = stringValue(body.status);
  const notes = stringValue(body.notes);

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

  await adminSupabase
    .from("verification_events")
    .update({ status, notes: notes || null })
    .eq("id", verificationEventId);

  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.redirect(new URL("/admin/reviews", req.url), {
      status: 303,
    });
  }

  return NextResponse.json({ ok: true, review_id: review.id });
}
