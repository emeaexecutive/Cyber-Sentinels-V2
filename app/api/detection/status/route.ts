import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { getDetectionEngineStatus } from "@/lib/detection/detection-engine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    ...getDetectionEngineStatus(),
  }, {
    headers: { "cache-control": "no-store" },
  });
}
