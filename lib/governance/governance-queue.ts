import { publishTrustEvent } from "@/lib/events/event-bus";
import type { TrustAlgorithmDecision } from "@/lib/trust/trust-algorithm";

export type GovernanceQueueName = "review" | "escalation" | "evidence_export" | "replay_export" | "notification";

export type GovernanceQueueJob = {
  id: string;
  queue: GovernanceQueueName;
  subject_id: string;
  decision: TrustAlgorithmDecision;
  reason: string;
  evidence_refs: string[];
  created_at: string;
  status: "pending" | "queued";
};

const jobs: GovernanceQueueJob[] = [];

export function enqueueGovernanceJob(input: Omit<GovernanceQueueJob, "id" | "created_at" | "status">) {
  const job: GovernanceQueueJob = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: "queued",
  };
  jobs.unshift(job);
  jobs.splice(100);
  publishTrustEvent("governance.created", { subject_id: job.subject_id, queue: job.queue, decision: job.decision }, { replaySafe: true });
  return job;
}

export function getGovernanceQueueSnapshot(limit = 20) {
  return jobs.slice(0, limit);
}
