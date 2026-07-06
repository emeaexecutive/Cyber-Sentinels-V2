import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { detectionProviders } from "@/lib/detection/providers";
import { runValidationBenchmark } from "@/lib/validation/benchmark-harness";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;
  const benchmark = await runValidationBenchmark({ providers: detectionProviders });
  return NextResponse.json(benchmark, { headers: { "cache-control": "no-store" } });
}

export const GET = POST;
