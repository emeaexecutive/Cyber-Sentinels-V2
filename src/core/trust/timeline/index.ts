import type { EvidenceNode } from "../evidence/index.ts";
import type { ReplayEvent, ReplayTimeline } from "../replay/index.ts";
import { ReplayEngine } from "../replay/index.ts";
import type { TrustUpdate } from "../signals/index.ts";

export class TrustTimeline {
  private readonly replay = new ReplayEngine();

  build(input: {
    tenantId: string;
    identityId: string;
    evidence: EvidenceNode[];
    replayEvents: ReplayEvent[];
    updates: TrustUpdate[];
  }): ReplayTimeline {
    const evidenceEvents: ReplayEvent[] = input.evidence.map((item) => ({
      id: `evidence:${item.id}`,
      tenantId: item.tenantId,
      identityId: item.identityId,
      type: "EVIDENCE_RECORDED",
      title: `${item.kind} evidence recorded`,
      description: `${item.label} was recorded by ${item.verifier}.`,
      occurredAt: item.observedAt,
      source: item.source,
      confidence: item.confidence,
      evidenceIds: [item.id],
      priorTrust: null,
      resultingTrust: null,
      actorId: null,
      metadata: { status: item.status },
    }));
    const updateEvents: ReplayEvent[] = input.updates.map((item) => ({
      id: `update:${item.id}`,
      tenantId: item.tenantId,
      identityId: item.identityId,
      type: "TRUST_UPDATED",
      title: "Trust updated",
      description: item.reason,
      occurredAt: item.occurredAt,
      source: "CONTINUOUS_TRUST",
      confidence: item.confidence,
      evidenceIds: [],
      priorTrust: item.priorTrust,
      resultingTrust: item.resultingTrust,
      actorId: null,
      metadata: { delta: item.delta },
    }));
    return this.replay.build(
      input.tenantId,
      input.identityId,
      [...input.replayEvents, ...evidenceEvents, ...updateEvents],
    );
  }
}
