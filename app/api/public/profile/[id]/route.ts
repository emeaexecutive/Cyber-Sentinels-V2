import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { getPublicTrustProfile } from "@/lib/public-profile/profile";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = getPublicTrustProfile(id);
  const supabase = await createClient();

  // Future: resolve only signed public profile IDs and enforce public visibility flags.
  await createSignal(supabase, "public_profile_viewed");
  await createAuditLog(supabase, "public_profile_viewed", "public", {
    verification_id: id,
    trust_status: profile.trust_status,
  });

  return NextResponse.json({
    ok: profile.trust_status !== "not_found",
    profile,
  });
}
