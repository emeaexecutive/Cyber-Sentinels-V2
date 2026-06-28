import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { loadFakeActor, safeEvidenceExport } from "@/lib/admin/fake-actors";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = await requireAdminApiAccess(request, supabase);
  if (!admin.ok) return admin.response;
  const adminSupabase = createServiceRoleClient();

  const actor = await loadFakeActor(adminSupabase, id);
  if (!actor) {
    return NextResponse.json({ error: "Actor evidence is unavailable." }, { status: 404 });
  }

  const adminActor = admin.user.email ?? admin.user.id;
  const exportedAt = new Date().toISOString();
  const audit = await adminSupabase.from("audit_logs").insert({
    event_type: "fake_actor_evidence_exported",
    actor: adminActor,
    metadata: {
      actor_id: actor.id,
      subject_type: actor.subjectType,
      workflow_id: actor.workflowId,
      replay_id: actor.replay?.id ?? null,
      receipt_id: actor.receipt?.id ?? null,
      evidence_preserved: true,
      raw_provider_outputs_excluded: true,
      admin_actor: adminActor,
      action_timestamp: exportedAt,
    },
    created_at: exportedAt,
  });

  if (audit.error) {
    return NextResponse.json(
      { error: "The evidence export audit event could not be written." },
      { status: 500 }
    );
  }

  return new NextResponse(JSON.stringify(safeEvidenceExport(actor), null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="actor-evidence-${actor.id}.json"`,
      "cache-control": "no-store",
    },
  });
}
