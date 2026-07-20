import type { ConsensusPolicy, ProviderObservation } from "./types.ts";

export function freshnessMultiplier(observation: ProviderObservation, windowSeconds: number, policy: ConsensusPolicy, evaluatedAt: string) {
  const now = Date.parse(evaluatedAt); const occurred = Date.parse(observation.occurredAt);
  if (!Number.isFinite(now) || !Number.isFinite(occurred) || occurred > now + 300_000) return 0;
  if (observation.expiresAt && Date.parse(observation.expiresAt) <= now) return 0;
  if (windowSeconds <= 0) return 0;
  const ageSeconds = Math.max(0, (now - occurred) / 1000);
  if (ageSeconds <= windowSeconds) return 1;
  if (policy.staleEvidenceMode === "ZERO" || ageSeconds >= windowSeconds * 2) return 0;
  return Number(Math.max(0, 1 - (ageSeconds - windowSeconds) / windowSeconds).toFixed(6));
}

export function delayedDelivery(observation: ProviderObservation) {
  return Date.parse(observation.receivedAt) - Date.parse(observation.occurredAt) > 300_000;
}
