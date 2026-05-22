import type { SupabaseClient } from "@supabase/supabase-js";

export async function createAuditLog(
  supabase: SupabaseClient,
  eventType: string,
  actor: string,
  metadata: Record<string, unknown> = {}
) {
  return supabase.from("audit_logs").insert({
    event_type: eventType,
    actor,
    metadata,
  });
}
