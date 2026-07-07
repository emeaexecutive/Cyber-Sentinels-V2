import { publishTrustEvent } from "../events/event-bus.ts";
import type { TrustAlgorithmDecision } from "@/lib/trust/trust-algorithm";

export type GovernanceQueueName = "review" | "escalation" | "evidence_export" | "replay_export" | "notification";

export type GovernanceQueueJob = {
  id: string;
  idempotency_key: string;
  queue: GovernanceQueueName;
  subject_id: string;
  decision: TrustAlgorithmDecision;
  reason: string;
  evidence_refs: string[];
  created_at: string;
  status: "pending" | "queued";
};

const jobs: GovernanceQueueJob[] = [];

export function enqueueGovernanceJob(input: Omit<GovernanceQueueJob, "id" | "idempotency_key" | "created_at" | "status"> & { idempotency_key?: string }) {
  const idempotencyKey =
    input.idempotency_key ??
    `${input.queue}:${input.subject_id}:${input.decision}:${input.evidence_refs.join("|")}`;
  const existing = jobs.find((job) => job.idempotency_key === idempotencyKey);
  if (existing) return existing;
  const job: GovernanceQueueJob = {
    ...input,
    id: idempotencyKey,
    idempotency_key: idempotencyKey,
    created_at: new Date().toISOString(),
    status: "queued",
  };
  jobs.unshift(job);
  jobs.splice(100);
  publishTrustEvent(
    "governance.created",
    { subject_id: job.subject_id, queue: job.queue, decision: job.decision },
    { replaySafe: true, eventId: `governance:${idempotencyKey}` }
  );
  return job;
}

export function getGovernanceQueueSnapshot(limit = 20) {
  return jobs.slice(0, limit);
}
