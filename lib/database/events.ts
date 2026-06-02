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

async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed`, error);
  }
}

export async function recordTrustEvent(
  supabase: SupabaseClient,
  input: TrustEventInput
) {
  const auditMetadata = {
    ...(input.audit.metadata ?? {}),
    actor: input.audit.actor,
  };

  await bestEffort("Trust event signal write", async () => {
    const { error } = await createSignal(supabase, input.signal, auditMetadata);

    if (error) throw error;
  });

  await bestEffort("Trust event audit write", async () => {
    const { error } = await createAuditLog(
      supabase,
      input.audit.eventType,
      input.audit.actor,
      auditMetadata
    );

    if (error) throw error;
  });

  await bestEffort("Trust update audit write", async () => {
    const { error } = await createAuditLog(
      supabase,
      "trust.update",
      input.trustUpdate.actor,
      {
        action: input.trustUpdate.action,
        subject: input.trustUpdate.subject,
        score: input.trustUpdate.score,
        ...(input.trustUpdate.metadata ?? {}),
      }
    );

    if (error) throw error;
  });
}
