import { sha256Hex } from "../trust-events/hash.ts";
import type { ConsensusConflict, ProviderObservation } from "./types.ts";

export function detectConsensusConflicts(observations: ProviderObservation[]): ConsensusConflict[] {
  const active = observations.filter((item) => !item.supersedesObservationId);
  const conflicts: ConsensusConflict[] = [];
  for (const signal of new Set(active.map((item) => item.signalType))) {
    const rows = active.filter((item) => item.signalType === signal);
    const positive = rows.filter((item) => item.result === "PASS");
    const negative = rows.filter((item) => item.result === "FAIL" || item.result === "REVOKED" || item.result === "BLOCKED");
    if (!positive.length || !negative.length) continue;
    const authoritativeRevocation = negative.some((item) => item.result === "REVOKED" && item.authoritative);
    const highNegative = negative.some((item) => item.authoritative && item.assurance >= 0.8);
    const severity = authoritativeRevocation ? "CRITICAL" : highNegative ? "MATERIAL" : "LOW";
    const ids = [...positive, ...negative].map((item) => item.observationId).sort();
    conflicts.push({ conflictId: sha256Hex(`consensus-conflict-v1:${signal}:${ids.join(":")}`), severity, type: authoritativeRevocation ? "VERIFIED_REVOKED" : "PASS_FAIL", observationIds: ids, reasonCode: authoritativeRevocation ? "AUTHORITATIVE_REVOCATION_CONFLICT" : highNegative ? "HIGH_ASSURANCE_NEGATIVE_CONFLICT" : "PROVIDER_OBSERVATION_CONFLICT", explanation: `${signal} has contradictory positive and negative evidence.` });
  }
  return conflicts;
}
