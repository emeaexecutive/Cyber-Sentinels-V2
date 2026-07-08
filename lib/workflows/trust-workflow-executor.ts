import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createReceiptBundle } from "@/lib/trust-receipts/receipts";
import { trackTrustEvent } from "@/lib/tracking/trust-event-tracker";
import type { TrustAlgorithmDecision } from "@/lib/trust/trust-algorithm";
import { writeReplayEvent } from "@/lib/replay/replay-writer";
import { enqueueGovernanceJob } from "@/lib/governance/governance-queue";

export type TrustWorkflowExecutionInput = {
  actorId: string;
  actorType: "human" | "agent" | "NHI" | "workflow";
  workflowId: string;
  subjectType?: string;
  evidenceRefs?: string[];
  algorithm: {
    trust_score: number;
    decision: TrustAlgorithmDecision;
    confidence_band: string;
    reasons: string[];
    source_labels: string[];
    limitations?: string[];
    signal_weights?: Record<string, number>;
    trust_decay?: Record<string, unknown>;
    runtime_posture_shift?: string;
    governance_weighting?: Record<string, unknown>;
    reviewer_override_applied?: boolean;
    next_action: string;
  };
  reviewerActor?: string | null;
  asyncSideEffects?: boolean;
  agenticRuntime?: {
    permission_boundary?: string | null;
    credential_exposure_risk?: string | null;
    suspicious_behavior_events?: string[];
    kill_switch_status?: "not_recommended" | "review_kill_switch" | "kill_switch_recommended" | "kill_switch_activated_placeholder";
    accessed_resources?: string[];
    human_owner?: string | null;
    delegated_authority?: string | null;
  };
};

const actionByDecision: Record<TrustAlgorithmDecision, string> = {
  allow: "continue_workflow",
  step_up: "require_stronger_verification",
  review: "create_governance_review",
  escalate: "create_high_risk_governance_event",
  block: "block_actor_action_or_workflow",
  insufficient_evidence: "pause_workflow_request_more_evidence",
  "insufficient evidence": "pause_workflow_request_more_evidence",
};

export async function executeTrustWorkflow(
  supabase: SupabaseClient,
  input: TrustWorkflowExecutionInput
) {
  const decision = input.algorithm.decision;
  const actor = input.reviewerActor ?? "trust-workflow-executor";
  const subjectType = input.subjectType ?? "workflow";
  const evidenceRefs = [...(input.evidenceRefs ?? [])];
  const killSwitchStatus =
    input.agenticRuntime?.kill_switch_status ??
    (decision === "block"
      ? "kill_switch_recommended"
      : decision === "escalate"
        ? "review_kill_switch"
        : "not_recommended");
  const metadata = {
    actor_id: input.actorId,
    actor_type: input.actorType,
    authority_actor: actor,
    human_authority: input.reviewerActor ? "named_reviewer" : input.actorType === "human" ? "self_asserted_user" : "workflow_policy",
    workflow_id: input.workflowId,
    subject_type: subjectType,
    touched_resource: `${subjectType}:${input.workflowId}`,
    accessed_resources: input.agenticRuntime?.accessed_resources ?? [`${subjectType}:${input.workflowId}`],
    human_owner: input.agenticRuntime?.human_owner ?? null,
    delegated_authority: input.agenticRuntime?.delegated_authority ?? null,
    permission_boundary: input.agenticRuntime?.permission_boundary ?? null,
    credential_exposure_risk: input.agenticRuntime?.credential_exposure_risk ?? null,
    suspicious_behavior_events: input.agenticRuntime?.suspicious_behavior_events ?? [],
    decision,
    action_executed: actionByDecision[decision],
    action_reason: input.algorithm.next_action,
    evidence_refs: evidenceRefs,
    evidence_chain: evidenceRefs.map((ref) => ({
      ref,
      retained: true,
      source: input.algorithm.source_labels,
    })),
    trust_score: input.algorithm.trust_score,
    trust_score_source: input.algorithm.source_labels,
    confidence_band: input.algorithm.confidence_band,
    source_labels: input.algorithm.source_labels,
    reasons: input.algorithm.reasons,
    limitations: [...(input.algorithm.limitations ?? [])],
    signal_weights: input.algorithm.signal_weights ?? null,
    trust_decay: input.algorithm.trust_decay ?? null,
    runtime_posture_shift: input.algorithm.runtime_posture_shift ?? null,
    governance_weighting: input.algorithm.governance_weighting ?? null,
    reviewer_override_applied: input.algorithm.reviewer_override_applied === true,
    why_allowed_reviewed_or_blocked: input.algorithm.reasons.join(" "),
    evidence_preserved: true,
    silent_delete_performed: false,
    replay_record_required: true,
    governance_review_required: ["review", "step_up", "escalate", "block", "insufficient_evidence", "insufficient evidence"].includes(decision),
    kill_switch_status: killSwitchStatus,
    kill_switch_recommended: killSwitchStatus === "kill_switch_recommended" || killSwitchStatus === "review_kill_switch",
    kill_switch_activated_placeholder: killSwitchStatus === "kill_switch_activated_placeholder",
    kill_switch_boundary: "No destructive action is performed by this executor. Blocks and kill-switch recommendations preserve evidence, audit, replay and governance state.",
    final_outcome: actionByDecision[decision],
  };

  const sideEffects = async () => {
    await createAuditLog(supabase, `trust_workflow_${decision.replaceAll(" ", "_")}`, actor, metadata);
    await writeReplayEvent(supabase, {
      subjectType,
      subjectId: input.workflowId,
      eventType: `trust_workflow_${decision.replaceAll(" ", "_")}`,
      eventTitle: `Trust workflow ${decision}`,
      eventSummary: input.algorithm.next_action,
      actorType: input.actorType,
      actorId: input.actorId,
      severity: decision === "block" ? "critical" : decision === "escalate" || decision === "step_up" ? "warning" : "info",
      metadata,
    });
    await trackTrustEvent(supabase, {
    event_type:
      decision === "allow"
        ? "workflow_allowed"
        : decision === "step_up"
          ? "step_up_required"
          : decision === "escalate"
            ? "workflow_escalated"
            : decision === "block"
              ? "actor_blocked"
              : decision === "review"
                ? "governance_review_created"
                : "workflow_paused",
      actor_id: input.actorId,
      actor_type: input.actorType,
      workflow_id: input.workflowId,
      decision,
      source: "Runtime Intelligence",
      evidence_refs: evidenceRefs,
      metadata,
    }, actor);

    if (metadata.governance_review_required) {
      enqueueGovernanceJob({
        queue: decision === "block" || decision === "escalate" ? "escalation" : "review",
        subject_id: input.workflowId,
        decision,
        reason: input.algorithm.next_action,
        evidence_refs: evidenceRefs,
        idempotency_key: `workflow:${input.workflowId}:${decision}:${metadata.kill_switch_status}`,
      });
    }

    if (decision === "allow" || decision === "block") {
      await createReceiptBundle(supabase, {
        subjectType,
        subjectId: input.workflowId,
        receiptType: decision === "allow" ? "trust_workflow_allowed" : "trust_workflow_blocked",
        verificationStatus: decision,
        confidenceLevel: input.algorithm.confidence_band,
        issuedBy: actor,
        receiptSummary: input.algorithm.next_action,
        chainSummary: "Trust workflow execution retained algorithm, decision, evidence, audit and replay context.",
        evidenceSnapshot: metadata,
        evidence: evidenceRefs.map((ref) => ({ ref })),
      });
    }
  };

  if (input.asyncSideEffects) {
    sideEffects().catch((error) => console.warn("Trust workflow side effect failed", error));
  } else {
    await sideEffects();
  }

  return {
    ok: true,
    decision,
    action_executed: actionByDecision[decision],
    kill_switch_status: killSwitchStatus,
    evidence_preserved: true,
    replay_event_written: !input.asyncSideEffects,
    replay_write_scheduled: Boolean(input.asyncSideEffects),
    next_action: input.algorithm.next_action,
  };
}
