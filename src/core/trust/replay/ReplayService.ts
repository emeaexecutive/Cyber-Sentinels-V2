import { ReplayEngine } from "./ReplayEngine.ts";
import { validateReplayEvent, type ReplayEvent } from "./ReplayEvent.ts";
import { ReplayRenderer } from "./ReplayRenderer.ts";
import type { ReplayRepository, ReplaySearch } from "./ReplayRepository.ts";

function missingEntity() {
  return Object.assign(new Error("Replay entity was not found."), {
    status: 404,
    code: "REPLAY_ENTITY_NOT_FOUND",
  });
}

function csv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export class ReplayService {
  private readonly repository: ReplayRepository;
  private readonly engine: ReplayEngine;
  private readonly renderer: ReplayRenderer;

  constructor(
    repository: ReplayRepository,
    engine = new ReplayEngine(),
    renderer = new ReplayRenderer(),
  ) {
    this.repository = repository;
    this.engine = engine;
    this.renderer = renderer;
  }

  private async assertEntity(tenantId: string, entityId: string) {
    const entity = await this.repository.findEntity(tenantId, entityId);
    if (!entity || entity.status === "DELETED") throw missingEntity();
    return entity;
  }

  async timeline(tenantId: string, entityId: string, search: ReplaySearch) {
    await this.assertEntity(tenantId, entityId);
    const events = await this.repository.findByEntity(tenantId, entityId, search);
    return this.engine.build(tenantId, entityId, events);
  }

  async events(tenantId: string, entityId: string, search: ReplaySearch) {
    return (await this.timeline(tenantId, entityId, search)).events;
  }

  async summary(tenantId: string, entityId: string, search: ReplaySearch) {
    const timeline = await this.timeline(tenantId, entityId, search);
    return {
      entityId,
      startedAt: timeline.startedAt,
      endedAt: timeline.endedAt,
      integrity: timeline.integrity,
      ...timeline.summary,
    };
  }

  async capture(event: ReplayEvent) {
    const validated = validateReplayEvent(event);
    await this.assertEntity(validated.tenantId, validated.entityId ?? validated.identityId);
    return this.repository.append(validated);
  }

  async artifact(tenantId: string, entityId: string, search: ReplaySearch) {
    const timeline = await this.timeline(tenantId, entityId, search);
    return {
      schemaVersion: "enterprise-replay-v1",
      generatedAt: timeline.generatedAt,
      tenantId,
      entityId,
      integrity: timeline.integrity,
      summary: timeline.summary,
      timeline,
      rendered: this.renderer.render(timeline),
    };
  }

  async exportCsv(tenantId: string, entityId: string, search: ReplaySearch) {
    const timeline = await this.timeline(tenantId, entityId, search);
    const header = [
      "id", "event_time", "event_type", "actor", "provider", "confidence",
      "risk_before", "risk_after", "trust_before", "trust_after", "evidence_ids",
      "title", "description", "integrity_hash",
    ];
    const rows = timeline.events.map((event) => [
      event.id,
      event.eventTime ?? event.occurredAt,
      event.type,
      event.actor ?? event.actorId,
      event.provider,
      event.confidence,
      event.priorRisk,
      event.resultingRisk,
      event.priorTrust,
      event.resultingTrust,
      event.evidenceIds.join("|"),
      event.title,
      event.description,
      event.integrityHash,
    ].map(csv).join(","));
    return [header.join(","), ...rows].join("\r\n");
  }

  async enterpriseAudit(tenantId: string, entityId: string, search: ReplaySearch) {
    const artifact = await this.artifact(tenantId, entityId, search);
    return {
      format: "Cyber Sentinels Enterprise Audit",
      formatVersion: "1.0",
      scope: { tenantId, entityId },
      generatedAt: artifact.generatedAt,
      immutable: true,
      integrity: artifact.integrity,
      summary: artifact.summary,
      records: artifact.rendered,
    };
  }
}
