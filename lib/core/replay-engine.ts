import { writeReplayEvent, type ReplayWriteJob } from "../replay/replay-writer.ts";
import { entityDecisionSurface, normalizeEntityIdentity, type EntityIdentityInput } from "./entity-identity.ts";
import { buildReplaySnapshot, type ReplaySnapshot, type ReplayRow } from "../trust-replay/replay.ts";
import { buildTrustTransparencyReport } from "../trust-transparency.ts";
import type { TrustTimelineEvent } from "../trust-timeline/provenance.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordRuntimeProfile } from "../performance/runtime-profiler.ts";

export type ReplayEngineSnapshotInput = {
  subjectType: string;
  subjectId: string | null;
  asOf: string;
  evidence: ReplayRow[];
  signals: ReplayRow[];
  decisions: ReplayRow[];
  auditLogs: ReplayRow[];
  relationships: ReplayRow[];
  aiSummaries: ReplayRow[];
  timelineEvents: TrustTimelineEvent[];
};

export function buildOperationalReplay(input: ReplayEngineSnapshotInput): ReplaySnapshot {
  const startedAt = performance.now();
  const replay = buildReplaySnapshot(input);
  recordRuntimeProfile({
    stage: "replay_latency",
    latencyMs: performance.now() - startedAt,
    ok: true,
    degraded: false,
    metadata: { label: "operational replay generation", subjectType: input.subjectType },
  });
  return replay;
}

export function writeOperationalReplayEvent(
  supabase: SupabaseClient,
  input: ReplayWriteJob
) {
  return writeReplayEvent(supabase, input);
}

export function buildReplayEvidenceMemory(workflowTrust: Parameters<typeof buildTrustTransparencyReport>[0]) {
  const transparency = buildTrustTransparencyReport(workflowTrust);
  const entity = normalizeEntityIdentity({
    id: workflowTrust.workflow.subjectId,
    type:
      workflowTrust.workflow.subjectType === "agent"
        ? "ai_agent"
        : workflowTrust.workflow.subjectType === "machine_identity"
          ? "machine_identity"
          : workflowTrust.workflow.subjectType === "human"
            ? "human"
            : "regulated_workflow",
    owner: workflowTrust.governanceLineage[0]?.assigned_to ?? workflowTrust.governanceLineage[0]?.owner_name ?? null,
    authority: transparency.auditability.authorizationLineage[0] ?? "Authorization lineage not recorded",
    verification_status: workflowTrust.posture?.state === "fresh" ? "verified" : "manual_review",
    trust_posture:
      workflowTrust.posture?.state === "fresh"
        ? "trusted"
        : workflowTrust.posture?.state === "governance_review"
          ? "escalated"
          : "review",
    evidence_refs: transparency.decisionExplanation.evidenceContributed,
    replay_refs: transparency.auditability.replayReference ? [transparency.auditability.replayReference] : [],
    governance_status: workflowTrust.governanceLineage.length ? "review_required" : "clear",
    risk_level: workflowTrust.posture?.state === "governance_review" ? "high" : "unknown",
  });
  return {
    engine: "replay_engine" as const,
    entity_identity: entity,
    entity_decision_surface: entityDecisionSurface(entity),
    chronology: workflowTrust.chronology,
    evidenceContinuity: workflowTrust.evidenceContinuity,
    governanceLineage: workflowTrust.governanceLineage,
    trustPosture: workflowTrust.posture,
    providerEvidence: workflowTrust.providerEvidence,
    receipts: workflowTrust.receipts,
    explainability: transparency.decisionExplanation,
    auditability: transparency.auditability,
    auditBoundary: transparency.boundary,
  };
}

export function buildReplayTransparencyReport(workflowTrust: Parameters<typeof buildTrustTransparencyReport>[0]) {
  return {
    engine: "replay_engine" as const,
    report: buildTrustTransparencyReport(workflowTrust),
  };
}

export function buildEntityReplaySurface(input: EntityIdentityInput) {
  const entity = normalizeEntityIdentity(input);
  return {
    engine: "replay_engine" as const,
    entity_identity: entity,
    ...entityDecisionSurface(entity),
  };
}

export const replayEngine = {
  buildOperationalReplay,
  writeOperationalReplayEvent,
  buildReplayEvidenceMemory,
  buildReplayTransparencyReport,
  buildEntityReplaySurface,
};
