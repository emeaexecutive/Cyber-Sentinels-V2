import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createReceiptBundle } from "@/lib/trust-receipts/receipts";
import { trackTrustEvent } from "@/lib/tracking/trust-event-tracker";
import type { TrustAlgorithmDecision } from "@/lib/trust/trust-algorithm";

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
    next_action: string;
  };
  reviewerActor?: string | null;
};

const actionByDecision: Record<TrustAlgorithmDecision, string> = {
  allow: "continue_workflow",
  step_up: "require_stronger_verification",
  review: "create_governance_review",
  escalate: "create_high_risk_governance_event",
  block: "block_actor_action_or_workflow",
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
  const metadata = {
    actor_id: input.actorId,
    actor_type: input.actorType,
    workflow_id: input.workflowId,
    decision,
    action_executed: actionByDecision[decision],
    evidence_refs: evidenceRefs,
    trust_score: input.algorithm.trust_score,
    confidence_band: input.algorithm.confidence_band,
    source_labels: input.algorithm.source_labels,
    reasons: input.algorithm.reasons,
    evidence_preserved: true,
    silent_delete_performed: false,
  };

  await createAuditLog(supabase, `trust_workflow_${decision.replaceAll(" ", "_")}`, actor, metadata);
  await supabase.from("trust_timeline_events").insert({
    subject_type: subjectType,
    subject_id: input.workflowId,
    event_type: `trust_workflow_${decision.replaceAll(" ", "_")}`,
    event_title: `Trust workflow ${decision}`,
    event_summary: input.algorithm.next_action,
    actor_type: input.actorType,
    actor_id: input.actorId,
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

  return {
    ok: true,
    decision,
    action_executed: actionByDecision[decision],
    evidence_preserved: true,
    replay_event_written: true,
    next_action: input.algorithm.next_action,
  };
}
