import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { loadFakeActorQueue } from "@/lib/admin/fake-actors";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;

  const actors = await loadFakeActorQueue(createServiceRoleClient());
  return NextResponse.json({
    data: actors,
    safeguards: {
      adminOnly: true,
      evidencePreserved: true,
      humanReviewRemainsAuthoritative: true,
      rawProviderOutputsExcluded: true,
    },
  });
}
