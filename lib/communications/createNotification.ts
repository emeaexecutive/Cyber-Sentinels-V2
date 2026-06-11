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
    severity?: "info" | "review" | "warning" | "critical";
    metadata?: Record<string, unknown>;
  }
) {
  const metadata: Record<string, unknown> = {
    ...(values.metadata ?? {}),
    actor: values.actor,
    email_ready: false,
  };
  const subjectId = typeof metadata.subject_id === "string" ? metadata.subject_id : null;
  let existingQuery = supabase
    .from("notifications")
    .select("id")
    .eq("notification_type", values.notificationType)
    .eq("title", values.title)
    .eq("is_read", false)
    .eq("metadata->>subject_id", subjectId ?? "");

  existingQuery = values.userId
    ? existingQuery.eq("user_id", values.userId)
    : existingQuery.is("user_id", null);

  const existing = await existingQuery
    .maybeSingle<{ id: string }>();

  if (existing.data?.id) {
    return existing;
  }

  const result = await supabase
    .from("notifications")
    .insert({
      user_id: values.userId ?? null,
      title: values.title,
      body: values.body,
      message: values.body,
      notification_type: values.notificationType,
      severity: values.severity ?? "info",
      is_read: false,
      read: false,
      metadata,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (result.error) {
    console.warn("Notification insert failed", {
      code: result.error.code,
    });
  }

  const notificationId = result.data?.id ?? null;
  await createAuditLog(supabase, "notification_created", values.actor, {
    ...metadata,
    notification_id: notificationId,
    notification_type: values.notificationType,
    title: values.title,
  });
  await createSignal(supabase, "Notification created", {
    ...metadata,
    notification_id: notificationId,
    notification_type: values.notificationType,
    title: values.title,
  });

  const subjectType = typeof metadata.subject_type === "string" ? metadata.subject_type : "notification";
  const timelineSubjectId = subjectId ?? notificationId;

  if (timelineSubjectId) {
    await supabase.from("trust_timeline_events").insert({
      subject_type: subjectType,
      subject_id: timelineSubjectId,
      event_type: "notification_created",
      event_title: values.title,
      event_summary: values.body,
      actor_type: "system",
      actor_id: values.userId ?? null,
      metadata: {
        ...metadata,
        notification_id: notificationId,
        notification_type: values.notificationType,
      },
      severity: values.severity ?? "info",
    });

    if (notificationId && subjectType !== "notification") {
      await supabase.from("trust_relationships").insert({
        source_type: "notification",
        source_id: notificationId,
        relationship_type: "notifies_about",
        target_type: subjectType,
        target_id: timelineSubjectId,
        confidence_level: "high",
        explanation:
          "Notification was created to coordinate human review for the linked operational trust record.",
      });
    }
  }

  return result;
}
