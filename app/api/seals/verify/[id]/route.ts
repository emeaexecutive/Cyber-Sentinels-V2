import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  getPublicTrustSeal,
  toPublicTrustSealJson,
} from "@/lib/public-verification/trustSeals";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const seal = getPublicTrustSeal(id);
  const publicSeal = toPublicTrustSealJson(seal);

  try {
    const supabase = await createClient();
    await createSignal(supabase, "trust_seal_verified");
    await createSignal(supabase, "trust_seal_viewed");
    await createAuditLog(supabase, "trust_seal_verified", "public_seal", {
      seal_id: publicSeal.seal_id,
      seal_type: publicSeal.seal_type,
      status: publicSeal.status,
    });
  } catch {
    // Keep public seal verification available before signal/audit tables exist.
  }

  return NextResponse.json(publicSeal);
}
