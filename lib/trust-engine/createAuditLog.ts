import type { SupabaseClient } from "@supabase/supabase-js";

export async function createAuditLog(
  supabase: SupabaseClient,
  eventType: string,
  actor: string,
  metadata: Record<string, unknown> = {}
) {
  // Security: audit logs are append-only in application logic. Do not update or
  // delete existing audit rows from server routes.
  const result = await supabase.from("audit_logs").insert({
    event_type: eventType,
    actor,
    owner_email: actor.includes("@") ? actor : null,
    metadata: {
      ...metadata,
      actor,
    },
    created_at: new Date().toISOString(),
  });

  if (result.error) {
    console.warn("Audit log insert failed", result.error);
  }

  return result;
}
