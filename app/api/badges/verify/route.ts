import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { verifyTrustBadge } from "@/lib/marketplace/trustLayer";

function getRequiredText(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (typeof value !== "string" || !value.trim() || value.length > 160) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid badge request" },
        { status: 400 }
      );
    }

    const badgeId = getRequiredText(body, "badge_id");
    const subjectId = getRequiredText(body, "subject_id");
    const result = verifyTrustBadge(badgeId, subjectId);
    const supabase = await createClient();

    // Public badge verification must not expose sensitive evidence or raw audit metadata.
    await createSignal(supabase, "trust_badge_verified");
    await createAuditLog(supabase, "trust_badge_verified", "badge_verify_api", {
      badge_id: badgeId,
      subject_id: subjectId,
      badge_status: result.badge_status,
    });

    return NextResponse.json({
      ok: true,
      badge_status: result.badge_status,
      trust_score: result.trust_score,
      verification_summary: result.verification_summary,
      expires_at: result.expires_at,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid input") {
      return NextResponse.json(
        { ok: false, error: "Invalid badge request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Could not verify badge" },
      { status: 500 }
    );
  }
}
