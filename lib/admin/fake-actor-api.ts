import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  enforceFakeActorAction,
  loadFakeActor,
  type FakeActorAction,
} from "@/lib/admin/fake-actors";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requestPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      reviewerNote:
        typeof body.reviewerNote === "string" ? body.reviewerNote.slice(0, 2000) : "",
      redirectTo: typeof body.redirectTo === "string" ? body.redirectTo : "",
    };
  }

  const formData = await request.formData();
  return {
    reviewerNote: String(formData.get("reviewer_note") ?? "").slice(0, 2000),
    redirectTo: String(formData.get("redirect_to") ?? ""),
  };
}

export async function handleFakeActorActionRequest(
  request: Request,
  id: string,
  action: FakeActorAction
) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;
  const adminSupabase = createServiceRoleClient();

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "A valid actor reference is required." }, { status: 400 });
  }

  const payload = await requestPayload(request);
  const actor = await loadFakeActor(adminSupabase, id);
  if (!actor) {
    return NextResponse.json(
      { error: "The flagged actor record is unavailable or no longer requires review." },
      { status: 404 }
    );
  }

  try {
    const result = await enforceFakeActorAction(
      adminSupabase,
      admin.user,
      actor,
      action,
      payload.reviewerNote
    );

    if (payload.redirectTo.startsWith("/admin/fake-actors")) {
      const redirectUrl = new URL(payload.redirectTo, request.url);
      redirectUrl.searchParams.set("action", action);
      redirectUrl.searchParams.set("status", "recorded");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.json({
      data: result,
      safeguards: {
        evidencePreserved: true,
        humanReviewRemainsAuthoritative: true,
        rawProviderOutputsExcluded: true,
        recordsDeleted: false,
      },
    });
  } catch (error) {
    console.error("Fake actor enforcement action failed.", error);
    if (payload.redirectTo.startsWith("/admin/fake-actors")) {
      const redirectUrl = new URL(payload.redirectTo, request.url);
      redirectUrl.searchParams.set("action", action);
      redirectUrl.searchParams.set("status", "failed");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }
    return NextResponse.json(
      {
        error: "The enforcement action could not be completed safely.",
      },
      { status: 500 }
    );
  }
}
