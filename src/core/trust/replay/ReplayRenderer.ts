import type { ReplayTimeline } from "./ReplayTimeline.ts";

export type RenderedReplayEvent = {
  id: string;
  timestamp: string;
  event: string;
  category: string;
  trustChange: string | null;
  riskChange: string | null;
  evidenceChange: string | null;
  actor: string | null;
  provider: string | null;
  confidence: string | null;
  explanation: string;
};

function change(before: number | null | undefined, after: number | null | undefined) {
  return before === null || before === undefined || after === null || after === undefined
    ? null
    : `${before} → ${after}`;
}

export class ReplayRenderer {
  render(timeline: ReplayTimeline): RenderedReplayEvent[] {
    return timeline.events.map((event) => ({
      id: event.id,
      timestamp: event.eventTime ?? event.occurredAt,
      event: event.title,
      category: event.type,
      trustChange: change(event.priorTrust, event.resultingTrust),
      riskChange: change(event.priorRisk, event.resultingRisk),
      evidenceChange:
        event.type === "EVIDENCE_REMOVED"
          ? "Removed"
          : event.evidenceIds.length
            ? `Added ${event.evidenceIds.length}`
            : null,
      actor: event.actor ?? event.actorId,
      provider: event.provider ?? null,
      confidence:
        event.confidence === null
          ? null
          : `${Math.round(event.confidence * 10_000) / 100}%`,
      explanation: event.description,
    }));
  }
}
