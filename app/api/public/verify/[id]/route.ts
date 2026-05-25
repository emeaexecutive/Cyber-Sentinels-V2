import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { getPublicVerification } from "@/lib/public-verification/verify";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = getPublicVerification(id);
  const supabase = await createClient();

  // Future: verify signed public verification IDs before resolving records.
  await createSignal(
    supabase,
    result.verification_status === "revoked"
      ? "revoked_badge_checked"
      : result.verification_object.includes("badge")
        ? "public_badge_viewed"
        : "public_verification_checked"
  );
  await createAuditLog(supabase, "public_verification_checked", "public", {
    verification_id: id,
    verification_status: result.verification_status,
  });

  return NextResponse.json({
    ok: result.verification_status !== "not_found",
    verification: result,
  });
}
