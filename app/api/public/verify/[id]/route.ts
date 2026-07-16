import { createPublicApiContext, publicApiError, publicApiSuccess } from "@/lib/api/public-contracts";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { getPublicVerification } from "@/lib/public-verification/verify";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = getPublicVerification(id);
  const context = createPublicApiContext(request, "public_verification");
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

  if (result.verification_status === "not_found") return publicApiError("verification_not_found", "Verification record was not found.", 404, context);
  return publicApiSuccess({ verification: result }, context);
}
