import type { ReplayEvent, ReplayEventType } from "./ReplayEvent.ts";

export type ReplayIntegrity = {
  valid: boolean;
  chainedEvents: number;
  unchainedLegacyEvents: number;
  firstBrokenEventId: string | null;
  explanation: string;
};

export type ReplaySummary = {
  eventCount: number;
  evidenceAdded: number;
  evidenceRemoved: number;
  policyChanges: number;
  manualApprovals: number;
  providerEvents: number;
  riskChanges: number;
  trustChanges: number;
  providers: string[];
  actors: string[];
  eventTypes: Partial<Record<ReplayEventType, number>>;
  latestRisk: number | null;
  latestTrust: number | null;
};

export type ReplayTimeline = {
  tenantId: string;
  identityId: string;
  entityId: string;
  events: ReplayEvent[];
  startedAt: string | null;
  endedAt: string | null;
  generatedAt: string;
  integrity: ReplayIntegrity;
  summary: ReplaySummary;
};

export function summarizeReplay(events: ReplayEvent[]): ReplaySummary {
  const eventTypes: Partial<Record<ReplayEventType, number>> = {};
  for (const event of events) eventTypes[event.type] = (eventTypes[event.type] ?? 0) + 1;
  const latestRisk = [...events]
    .reverse()
    .find((event) => event.resultingRisk !== null && event.resultingRisk !== undefined)
    ?.resultingRisk ?? null;
  const latestTrust = [...events]
    .reverse()
    .find((event) => event.resultingTrust !== null)
    ?.resultingTrust ?? null;
  return {
    eventCount: events.length,
    evidenceAdded: events.filter((event) =>
      ["EVIDENCE_ADDED", "EVIDENCE_RECORDED", "PASSPORT_VERIFIED", "EMAIL_VERIFIED",
        "PHONE_VERIFIED", "DEVICE_OBSERVED", "LOCATION_OBSERVED", "LIVENESS_CHECKED",
        "DEEPFAKE_ANALYZED"].includes(event.type),
    ).length,
    evidenceRemoved: eventTypes.EVIDENCE_REMOVED ?? 0,
    policyChanges: (eventTypes.POLICY_CHANGED ?? 0) + (eventTypes.ENTERPRISE_POLICY_CHANGED ?? 0),
    manualApprovals: (eventTypes.MANUAL_APPROVAL ?? 0) + (eventTypes.MANUAL_REVIEW_COMPLETED ?? 0),
    providerEvents: events.filter((event) => Boolean(event.provider)).length,
    riskChanges: events.filter((event) =>
      event.priorRisk !== null && event.priorRisk !== undefined &&
      event.resultingRisk !== null && event.resultingRisk !== undefined &&
      event.priorRisk !== event.resultingRisk,
    ).length,
    trustChanges: events.filter((event) =>
      event.priorTrust !== null && event.resultingTrust !== null &&
      event.priorTrust !== event.resultingTrust,
    ).length,
    providers: [...new Set(events.flatMap((event) => event.provider ? [event.provider] : []))].sort(),
    actors: [...new Set(events.flatMap((event) => event.actor ? [event.actor] : []))].sort(),
    eventTypes,
    latestRisk,
    latestTrust,
  };
}
