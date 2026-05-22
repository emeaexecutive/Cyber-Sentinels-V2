import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import type { TrustUpdate } from "@/types/trust";

type TrustEventInput = {
  signal: string;
  audit: {
    eventType: string;
    actor: string;
    metadata?: Record<string, unknown>;
  };
  trustUpdate: TrustUpdate;
};

export async function recordTrustEvent(
  supabase: SupabaseClient,
  input: TrustEventInput
) {
  await createSignal(supabase, input.signal);

  await createAuditLog(
    supabase,
    input.audit.eventType,
    input.audit.actor,
    input.audit.metadata
  );

  await createAuditLog(supabase, "trust.update", input.trustUpdate.actor, {
    action: input.trustUpdate.action,
    subject: input.trustUpdate.subject,
    score: input.trustUpdate.score,
    ...(input.trustUpdate.metadata ?? {}),
  });
}
