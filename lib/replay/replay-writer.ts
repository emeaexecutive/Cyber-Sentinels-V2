import type { SupabaseClient } from "@supabase/supabase-js";
import { publishTrustEvent } from "../events/event-bus.ts";

export type ReplayWriteJob = {
  subjectType: string;
  subjectId: string;
  eventType: string;
  eventTitle: string;
  eventSummary: string;
  actorType: string;
  actorId: string;
  severity: "info" | "warning" | "critical";
  metadata: Record<string, unknown>;
};

const queue: ReplayWriteJob[] = [];

export async function writeReplayEvent(supabase: SupabaseClient, job: ReplayWriteJob) {
  const idempotencyKey = `${job.subjectType}:${job.subjectId}:${job.eventType}:${job.actorId}`;
  queue.push(job);
  const batch = queue.splice(0, 10);
  const result = await supabase.from("trust_timeline_events").insert(
    batch.map((item) => ({
      subject_type: item.subjectType,
      subject_id: item.subjectId,
      event_type: item.eventType,
      event_title: item.eventTitle,
      event_summary: item.eventSummary,
      actor_type: item.actorType,
      actor_id: item.actorId,
      severity: item.severity,
      metadata: {
        ...item.metadata,
        replay_event_id: `${item.subjectType}:${item.subjectId}:${item.eventType}:${item.actorId}`,
        replay_writer: "append_only",
        evidence_integrity_preserved: true,
      },
    }))
  );
  if (result.error) console.warn("Replay write failed", result.error);
  publishTrustEvent(
    "replay.created",
    { subject_id: job.subjectId, event_type: job.eventType },
    { replaySafe: true, eventId: `replay:${idempotencyKey}` }
  );
  return result;
}

export function pendingReplayJobs() {
  return queue.length;
}
