import { validateReplayEvent, type ReplayEvent } from "./ReplayEvent.ts";
import { summarizeReplay, type ReplayIntegrity, type ReplayTimeline } from "./ReplayTimeline.ts";

function integrity(events: ReplayEvent[]): ReplayIntegrity {
  let previousHash: string | null = null;
  let chainedEvents = 0;
  let unchainedLegacyEvents = 0;
  for (const event of events) {
    if (!event.integrityHash) {
      unchainedLegacyEvents += 1;
      continue;
    }
    chainedEvents += 1;
    if (!/^[a-f0-9]{64}$/.test(event.integrityHash)) {
      return {
        valid: false,
        chainedEvents,
        unchainedLegacyEvents,
        firstBrokenEventId: event.id,
        explanation: "An event contains an invalid integrity hash.",
      };
    }
    if ((event.previousEventHash ?? null) !== previousHash) {
      return {
        valid: false,
        chainedEvents,
        unchainedLegacyEvents,
        firstBrokenEventId: event.id,
        explanation: "The replay hash chain is discontinuous.",
      };
    }
    previousHash = event.integrityHash;
  }
  return {
    valid: true,
    chainedEvents,
    unchainedLegacyEvents,
    firstBrokenEventId: null,
    explanation: unchainedLegacyEvents
      ? "Chained EPIC 23 events are intact; legacy events predate chained integrity."
      : "Every event is ordered and linked to the previous retained event.",
  };
}

export class ReplayEngine {
  build(tenantId: string, identityId: string, events: ReplayEvent[]): ReplayTimeline {
    const selected = events
      .filter(
        (event) =>
          event.tenantId === tenantId &&
          (event.entityId ?? event.identityId) === identityId,
      )
      .map(validateReplayEvent)
      .sort(
        (left, right) =>
          (left.eventTime ?? left.occurredAt).localeCompare(right.eventTime ?? right.occurredAt) ||
          left.id.localeCompare(right.id),
      );
    return {
      tenantId,
      identityId,
      entityId: identityId,
      events: selected,
      startedAt: selected.at(0)?.eventTime ?? null,
      endedAt: selected.at(-1)?.eventTime ?? null,
      generatedAt: new Date().toISOString(),
      integrity: integrity(selected),
      summary: summarizeReplay(selected),
    };
  }
}
