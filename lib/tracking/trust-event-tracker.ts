import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetectionSource } from "@/lib/detection/detection-engine";
import type { TrustAlgorithmDecision } from "@/lib/trust/trust-algorithm";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export type TrustTrackingEventType =
  | "actor_detected"
  | "session_started"
  | "provider_signal_received"
  | "trust_score_changed"
  | "step_up_required"
  | "workflow_allowed"
  | "workflow_paused"
  | "workflow_escalated"
  | "actor_blocked"
  | "governance_review_created"
  | "reviewer_decision_recorded"
  | "receipt_generated"
  | "replay_event_written";

export type TrustTrackingEvent = {
  event_type: TrustTrackingEventType;
  actor_id: string;
  actor_type: "human" | "agent" | "NHI" | "workflow";
  workflow_id: string;
  decision: TrustAlgorithmDecision;
  source: DetectionSource | "Governance Review";
  evidence_refs: string[];
  created_at?: string;
  metadata?: Record<string, unknown>;
};

export function normalizeTrustTrackingEvent(event: TrustTrackingEvent) {
  return {
    ...event,
    evidence_refs: [...event.evidence_refs],
    created_at: event.created_at ?? new Date().toISOString(),
  };
}

export async function trackTrustEvent(
  supabase: SupabaseClient,
  event: TrustTrackingEvent,
  actor = "trust-event-tracker"
) {
  const normalized = normalizeTrustTrackingEvent(event);
  const metadata = {
    ...normalized.metadata,
    actor_id: normalized.actor_id,
    actor_type: normalized.actor_type,
    workflow_id: normalized.workflow_id,
    decision: normalized.decision,
    source: normalized.source,
    evidence_refs: normalized.evidence_refs,
    created_at: normalized.created_at,
  };
  await createSignal(supabase, normalized.event_type, metadata);
  await createAuditLog(supabase, normalized.event_type, actor, metadata);
  return normalized;
}
