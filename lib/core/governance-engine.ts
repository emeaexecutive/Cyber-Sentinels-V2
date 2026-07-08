import { enqueueGovernanceJob, getGovernanceQueueSnapshot, type GovernanceQueueJob } from "@/lib/governance/governance-queue";
import { normalizeEntityIdentity, type EntityIdentityInput } from "@/lib/core/entity-identity";
import { defaultTrustPolicies, evaluateTrustPolicy, type PolicyEvaluationInput, type TrustPolicy } from "@/lib/policy-engine";
import type { TrustAlgorithmDecision } from "@/lib/trust/trust-algorithm";

export type GovernanceDecisionInput = {
  subjectId: string;
  decision: TrustAlgorithmDecision;
  reason: string;
  evidenceRefs?: string[];
  queue?: GovernanceQueueJob["queue"];
  idempotencyKey?: string;
  killSwitchStatus?: "not_recommended" | "review_kill_switch" | "kill_switch_recommended" | "kill_switch_activated_placeholder";
  reviewer?: string | null;
  entity?: EntityIdentityInput;
};

export function routeGovernanceDecision(input: GovernanceDecisionInput) {
  const entity = input.entity ? normalizeEntityIdentity(input.entity) : null;
  const reviewRequired = ["review", "step_up", "escalate", "block", "insufficient_evidence", "insufficient evidence"].includes(input.decision);
  const queue =
    input.queue ??
    (input.decision === "block" || input.decision === "escalate" ? "escalation" : "review");
  const job = reviewRequired
    ? enqueueGovernanceJob({
        queue,
        subject_id: input.subjectId,
        decision: input.decision,
        reason: input.reason,
        evidence_refs: [...(input.evidenceRefs ?? [])],
        idempotency_key: input.idempotencyKey,
      })
    : null;

  return {
    engine: "governance_engine" as const,
    reviewRequired,
    job,
    entity_identity: entity,
    reviewer: input.reviewer ?? null,
    killSwitchStatus: input.killSwitchStatus ?? "not_recommended",
    overrideLoggingRequired: Boolean(input.reviewer),
    traceability: "Every manual decision must retain reviewer, reason, evidence references and replay linkage.",
  };
}

export function evaluateGovernancePolicy(policy: TrustPolicy, input: PolicyEvaluationInput, context?: { entity?: EntityIdentityInput }) {
  return {
    engine: "governance_engine" as const,
    entity_identity: context?.entity ? normalizeEntityIdentity(context.entity) : null,
    ...evaluateTrustPolicy(policy, input),
  };
}

export function listGovernancePolicies() {
  return defaultTrustPolicies;
}

export function governanceQueueSnapshot(limit?: number) {
  return getGovernanceQueueSnapshot(limit);
}

export const governanceEngine = {
  routeGovernanceDecision,
  evaluateGovernancePolicy,
  listGovernancePolicies,
  governanceQueueSnapshot,
};
