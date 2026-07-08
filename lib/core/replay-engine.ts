import { writeReplayEvent, type ReplayWriteJob } from "@/lib/replay/replay-writer";
import { buildReplaySnapshot, type ReplaySnapshot, type ReplayRow } from "@/lib/trust-replay/replay";
import { buildTrustTransparencyReport } from "@/lib/trust-transparency";
import type { TrustTimelineEvent } from "@/lib/trust-timeline/provenance";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  return buildReplaySnapshot(input);
}

export function writeOperationalReplayEvent(
  supabase: SupabaseClient,
  input: ReplayWriteJob
) {
  return writeReplayEvent(supabase, input);
}

export function buildReplayEvidenceMemory(workflowTrust: Parameters<typeof buildTrustTransparencyReport>[0]) {
  const transparency = buildTrustTransparencyReport(workflowTrust);
  return {
    engine: "replay_engine" as const,
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

export const replayEngine = {
  buildOperationalReplay,
  writeOperationalReplayEvent,
  buildReplayEvidenceMemory,
  buildReplayTransparencyReport,
};
