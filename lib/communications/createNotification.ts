import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export async function createNotification(
  supabase: SupabaseClient,
  values: {
    userId?: string | null;
    title: string;
    body: string;
    notificationType: string;
    actor: string;
    metadata?: Record<string, unknown>;
  }
) {
  const metadata = {
    ...(values.metadata ?? {}),
    actor: values.actor,
  };
  const result = await supabase.from("notifications").insert({
    user_id: values.userId ?? null,
    title: values.title,
    body: values.body,
    notification_type: values.notificationType,
    metadata,
  });

  if (result.error) {
    console.warn("Notification insert failed", result.error);
  }

  await createAuditLog(supabase, "notification_created", values.actor, {
    ...metadata,
    notification_type: values.notificationType,
    title: values.title,
  });
  await createSignal(supabase, "Notification created", {
    ...metadata,
    notification_type: values.notificationType,
    title: values.title,
  });

  return result;
}
