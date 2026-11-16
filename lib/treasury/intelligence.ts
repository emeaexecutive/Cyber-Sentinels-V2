import type { SwarmEvent } from "../swarm/containment.ts";

const categories: Record<string, string> = {
  TRANSACTION_LIMIT: "UNEXPECTED_AMOUNT", DAILY_LIMIT: "SHARED_EXPOSURE", ROLLING_LIMIT: "SHARED_EXPOSURE",
  PAYMENT_VELOCITY: "UNUSUAL_VELOCITY", DESTINATION_OR_ASSET_DENIED: "DESTINATION_CHANGE",
  PROOF_OF_POSSESSION_INVALID: "IDENTITY_SUBSTITUTION", AGENT_INACTIVE: "COMPROMISED_OR_REVOKED_AGENT",
  MANDATE_INVALID_OR_USED: "MANDATE_REPLAY_OR_SUBSTITUTION", REQUEST_REPLAY: "REQUEST_REPLAY",
  AUTHORITY_INVALID: "UNAUTHORISED_DELEGATION", POLICY_CHANGED: "POLICY_INCONSISTENCY", EMERGENCY_STOP: "CONTAINMENT",
};
/** Advisory detection from existing append-only Replay; never grants authority,
 * changes policy, freezes funds or performs autonomous containment.
 */
export function financialSignals(events: SwarmEvent[], tenantId: string, now = Date.now()) {
  if (!Number.isFinite(now)) return [];
  const denials = events.filter(e => e.tenantId === tenantId && Number.isFinite(e.at) && e.at >= now - 60000 && e.at <= now && e.kind === "FINANCIAL_DENY");
  const signals = denials.flatMap(event => (Array.isArray(event.details.reasons) ? event.details.reasons : [])
    .filter((r): r is string => typeof r === "string" && !!categories[r])
    .map(reason => ({ category: categories[reason], reason, agentId: event.actorId, requestId: event.subjectId, evidence: event.digest, intervention: "REQUIRES_CURRENT_DELEGATED_AUTHORITY" })));
  const limitAttempts = denials.filter(e => Array.isArray(e.details.reasons) && e.details.reasons.some(r => ["DAILY_LIMIT", "ROLLING_LIMIT"].includes(r)));
  if (new Set(limitAttempts.map(e => e.actorId)).size > 1) signals.push({ category: "COORDINATED_LIMIT_ATTEMPT", reason: "MULTIPLE_AGENTS_DENIED_SHARED_LIMIT", agentId: "MULTIPLE", requestId: "MULTIPLE", evidence: limitAttempts.at(-1)!.digest, intervention: "REQUIRES_CURRENT_DELEGATED_AUTHORITY" });
  return signals;
}
