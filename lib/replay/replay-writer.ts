import type { SupabaseClient } from "@supabase/supabase-js";
import { publishTrustEvent } from "../events/event-bus.ts";
import { recordRuntimeProfile } from "../performance/runtime-profiler.ts";

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
const failedJobs: Array<{
  job: ReplayWriteJob;
  failedAt: string;
  error: string;
  retryCount: number;
}> = [];
const retryQueue: ReplayWriteJob[] = [];

export async function writeReplayEvent(supabase: SupabaseClient, job: ReplayWriteJob) {
  const started = Date.now();
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
  if (result.error) {
    console.warn("Replay write failed", result.error);
    batch.forEach((failedJob) => {
      failedJobs.unshift({
        job: failedJob,
        failedAt: new Date().toISOString(),
        error: result.error?.message ?? "Replay write failed",
        retryCount: 0,
      });
      retryQueue.push(failedJob);
    });
    failedJobs.splice(50);
    retryQueue.splice(50);
  }
  recordRuntimeProfile({
    stage: "replay_latency",
    latencyMs: Date.now() - started,
    ok: !result.error,
    degraded: Boolean(result.error),
    metadata: {
      batch_size: batch.length,
      persisted: !result.error,
      retry_queued: result.error ? batch.length : 0,
    },
  });
  if (!result.error) {
    publishTrustEvent(
      "replay.created",
      { subject_id: job.subjectId, event_type: job.eventType },
      { replaySafe: true, eventId: `replay:${idempotencyKey}` }
    );
  }
  return result;
}

export function pendingReplayJobs() {
  return queue.length;
}

export function getReplayQueueDiagnostics() {
  return {
    pending: queue.length,
    failed: failedJobs.length,
    retryQueued: retryQueue.length,
    recentFailures: failedJobs.slice(0, 10).map((entry) => ({
      subjectType: entry.job.subjectType,
      eventType: entry.job.eventType,
      failedAt: entry.failedAt,
      error: entry.error,
      retryCount: entry.retryCount,
    })),
    boundary: "Replay diagnostics are in-process only until a durable job queue is configured.",
  };
}
