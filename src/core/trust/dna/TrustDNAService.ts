import type { TrustEntity } from "../types/index.ts";
import { TrustDNAEngine } from "./TrustDNAEngine.ts";
import type { TrustDNARepository } from "./TrustDNARepository.ts";
import type { TrustProfile } from "./TrustProfile.ts";

function missingEntity(): Error {
  return Object.assign(new Error("Trust entity was not found."), {
    status: 404,
    code: "TRUST_ENTITY_NOT_FOUND",
  });
}

export class TrustDNAService {
  private readonly repository: TrustDNARepository;
  private readonly engine: TrustDNAEngine;
  private readonly uuid: () => string;
  private readonly now: () => string;

  constructor(
    repository: TrustDNARepository,
    engine = new TrustDNAEngine(),
    uuid: () => string = () => crypto.randomUUID(),
    now: () => string = () => new Date().toISOString(),
  ) {
    this.repository = repository;
    this.engine = engine;
    this.uuid = uuid;
    this.now = now;
  }

  private async entity(tenantId: string, entityId: string): Promise<TrustEntity> {
    const entity = await this.repository.findEntity(tenantId, entityId);
    if (!entity || entity.status === "DELETED") throw missingEntity();
    return entity;
  }

  async getProfile(tenantId: string, entityId: string, evidenceLimit = 500) {
    const [entity, stored] = await Promise.all([
      this.entity(tenantId, entityId),
      this.repository.findLatestProfile(tenantId, entityId),
    ]);
    if (stored) return { profile: stored, persisted: true };
    const [evidence, sources] = await Promise.all([
      this.repository.findEvidence(tenantId, entityId, evidenceLimit),
      this.repository.providerHealth(tenantId),
    ]);
    return {
      profile: this.engine.calculate({
        profileId: this.uuid(),
        tenantId,
        entity,
        evidence,
        sources,
        calculatedAt: this.now(),
      }),
      persisted: false,
    };
  }

  async recalculate(tenantId: string, entityId: string): Promise<TrustProfile> {
    const [entity, evidence, sources, previousProfile] = await Promise.all([
      this.entity(tenantId, entityId),
      this.repository.findEvidence(tenantId, entityId, 500),
      this.repository.providerHealth(tenantId),
      this.repository.findLatestProfile(tenantId, entityId),
    ]);
    const profile = this.engine.recalculate({
      profileId: this.uuid(),
      tenantId,
      entity,
      evidence,
      sources,
      calculatedAt: this.now(),
      previousProfile,
    });
    return this.repository.saveProfile(profile);
  }

  async history(tenantId: string, entityId: string, limit = 100) {
    await this.entity(tenantId, entityId);
    return this.repository.findHistory(tenantId, entityId, limit);
  }
}
