export type ReplayEventType =
  | "EVIDENCE_RECORDED"
  | "SIGNAL_RECEIVED"
  | "TRUST_UPDATED"
  | "RISK_DETECTED"
  | "MANUAL_OVERRIDE"
  | "DECISION_RECORDED";

export type ReplayEvent = {
  id: string;
  tenantId: string;
  identityId: string;
  type: ReplayEventType;
  title: string;
  description: string;
  occurredAt: string;
  source: string;
  confidence: number | null;
  evidenceIds: string[];
  priorTrust: number | null;
  resultingTrust: number | null;
  actorId: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type ReplayTimeline = {
  tenantId: string;
  identityId: string;
  events: ReplayEvent[];
  startedAt: string | null;
  endedAt: string | null;
  generatedAt: string;
};

export interface ReplayRepository {
  findByIdentity(tenantId: string, identityId: string, limit: number): Promise<ReplayEvent[]>;
}

export class ReplayEngine {
  build(tenantId: string, identityId: string, events: ReplayEvent[]): ReplayTimeline {
    const selected = events
      .filter((event) => event.tenantId === tenantId && event.identityId === identityId)
      .map((event) => ({ ...event, occurredAt: new Date(event.occurredAt).toISOString() }))
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id));
    return {
      tenantId,
      identityId,
      events: selected,
      startedAt: selected.at(0)?.occurredAt ?? null,
      endedAt: selected.at(-1)?.occurredAt ?? null,
      generatedAt: new Date().toISOString(),
    };
  }
}

export class ReplayRenderer {
  render(timeline: ReplayTimeline): Array<{
    timestamp: string;
    event: string;
    trustChange: string | null;
    explanation: string;
  }> {
    return timeline.events.map((event) => ({
      timestamp: event.occurredAt,
      event: event.title,
      trustChange:
        event.priorTrust === null || event.resultingTrust === null
          ? null
          : `${event.priorTrust} → ${event.resultingTrust}`,
      explanation: event.description,
    }));
  }
}
