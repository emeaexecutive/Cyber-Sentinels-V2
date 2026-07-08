import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { mlValidationEngine } from "@/lib/core/ml-validation-engine";
import { createClient } from "@/lib/supabase/server";
import { detectionProviders } from "@/lib/detection/providers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;
  const validation = await mlValidationEngine.runMlValidationEngine({ providers: detectionProviders });
  return NextResponse.json(validation.benchmark, { headers: { "cache-control": "no-store" } });
}

export const GET = POST;
