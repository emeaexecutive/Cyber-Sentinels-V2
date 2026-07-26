import type { TrustGraphRepository } from "../repositories/index.ts";

export class TrustGraphQueries {
  private readonly repository: TrustGraphRepository;

  constructor(repository: TrustGraphRepository) {
    this.repository = repository;
  }

  findEntitiesUsingDevice(tenantId: string, deviceFingerprintHash: string, limit = 100) {
    return this.repository.findEntitiesByEvidenceFingerprint(
      tenantId,
      "DEVICE",
      deviceFingerprintHash,
      limit,
    );
  }

  findEntitiesSharingEmail(tenantId: string, emailHash: string, limit = 100) {
    return this.repository.findEntitiesByEvidenceFingerprint(
      tenantId,
      "EMAIL",
      emailHash,
      limit,
    );
  }

  findAllEvidenceForIdentity(tenantId: string, entityId: string, limit = 500) {
    return this.repository.findEvidence(tenantId, entityId, limit);
  }

  findProviderFailures(tenantId: string, limit = 100) {
    return this.repository.findProviderFailures(tenantId, limit);
  }

  findLinkedAIAgents(tenantId: string, entityId: string, limit = 100) {
    return this.repository.findLinkedEntities(tenantId, entityId, "AI_AGENT", limit);
  }

  findOrphanEntities(tenantId: string, limit = 100) {
    return this.repository.findOrphanEntities(tenantId, limit);
  }
}
