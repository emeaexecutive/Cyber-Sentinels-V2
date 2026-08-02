import type { FabricReference, ReplayAvailabilityState } from "./types.ts";

export type ReplayEvidenceAvailability = {
  state: ReplayAvailabilityState; evidenceReferences: FabricReference[]; eventCount: number; reasonCode: string;
};

export function resolveReplayAvailability(input: {
  authorized: boolean; generationFailed: boolean; sourceAvailable: boolean; collectionAttempted: boolean;
  evidenceReferences: FabricReference[]; relevantEventCount: number;
}): ReplayEvidenceAvailability {
  if (!input.authorized) return { state: "access_denied", evidenceReferences: [], eventCount: 0, reasonCode: "REPLAY_ACCESS_DENIED" };
  if (input.generationFailed) return { state: "generation_failed", evidenceReferences: [], eventCount: 0, reasonCode: "REPLAY_GENERATION_FAILED" };
  if (!input.sourceAvailable) return { state: "source_unavailable", evidenceReferences: [], eventCount: 0, reasonCode: "REPLAY_SOURCE_UNAVAILABLE" };
  if (!input.collectionAttempted) return { state: "evidence_missing", evidenceReferences: [], eventCount: 0, reasonCode: "REPLAY_EVIDENCE_NOT_COLLECTED" };
  if (!input.evidenceReferences.length && input.relevantEventCount > 0) return { state: "evidence_missing", evidenceReferences: [], eventCount: input.relevantEventCount, reasonCode: "REPLAY_PROVIDER_EVIDENCE_MISSING" };
  if (!input.evidenceReferences.length && input.relevantEventCount === 0) return { state: "empty", evidenceReferences: [], eventCount: 0, reasonCode: "REPLAY_NO_RELEVANT_EVENTS" };
  return { state: "ready", evidenceReferences: input.evidenceReferences, eventCount: input.relevantEventCount, reasonCode: "REPLAY_READY" };
}
