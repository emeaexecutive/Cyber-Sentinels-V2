import type { SupabaseClient } from "@supabase/supabase-js";

export async function createAuditLog(
  supabase: SupabaseClient,
  eventType: string,
  actor: string,
  metadata: Record<string, unknown> = {}
) {
  const sourceIpHash =
    typeof metadata.source_ip_hash === "string" ? metadata.source_ip_hash : null;
  const userAgentHash =
    typeof metadata.user_agent_hash === "string"
      ? metadata.user_agent_hash
      : null;
  const abuseRisk =
    typeof metadata.abuse_risk === "string" ? metadata.abuse_risk : "low";
  const suspiciousActivity =
    typeof metadata.suspicious_activity === "boolean"
      ? metadata.suspicious_activity
      : false;

  // Security: audit logs are append-only in application logic. Do not update or
  // delete existing audit rows from server routes.
  return supabase.from("audit_logs").insert({
    event_type: eventType,
    actor,
    metadata,
    abuse_risk: abuseRisk,
    suspicious_activity: suspiciousActivity,
    source_ip_hash: sourceIpHash,
    user_agent_hash: userAgentHash,
  });
}
