import { TRUST_EVENT_CANONICALIZATION, TRUST_EVENT_HASH_ALGORITHM, TRUST_EVENT_SCHEMA_VERSION, type CanonicalTrustEvent, type GatewayResult, type JsonValue, type NormalizedProviderEvent, type ProviderEnvelope, type ProviderProtocol, type RawProviderRequest, type TrustEventDisposition } from "./types.ts";
import { resolveProviderAdapter } from "./provider-registry.ts";
import { sha256Hex, signTrustEvent } from "./hash.ts";
import { normalizeProviderEvent } from "./normalize.ts";

export type EnvelopeReservation = { status: "NEW"; envelopeId: string } | { status: "DUPLICATE"; envelopeId: string; eventIds: string[]; disposition: TrustEventDisposition } | { status: "CONFLICT"; envelopeId: string } | { status: "REPLAY"; envelopeId: string };
export type ChainHead = { sequence: number; eventHash: string | null };

export interface TrustEventGatewayRepository {
  resolveEnterprise(providerKey: string, envelope: ProviderEnvelope, authenticatedEnterpriseId?: string): Promise<string | null>;
  isProviderEnabled(providerKey: string, enterpriseId: string): Promise<boolean>;
  reserveEnvelope(input: { enterpriseId: string; providerKey: string; idempotencyKey: string; requestHash: string; envelope: ProviderEnvelope; receivedAt: string; correlationId: string }): Promise<EnvelopeReservation>;
  recordRejectedEnvelope(input: { enterpriseId?: string; providerKey: string; protocol: ProviderProtocol; requestHash: string; disposition: TrustEventDisposition; reasonCodes: string[]; correlationId: string; receivedAt: string }): Promise<void>;
  getChainHead(enterpriseId: string): Promise<ChainHead>;
  persistEvidence(input: { evidenceId: string; enterpriseId: string; envelopeId: string; providerKey: string; classification: string; domainKey: "IDENTITY"; subjectId: string; subjectType: string; evidenceType: string; result: "POSITIVE"|"NEGATIVE"|"INCONCLUSIVE"|"REVOKED"; assuranceLevel: "NONE"|"MEDIUM"|"HIGH"|"VERY_HIGH"; cryptographicallyVerified: boolean; serverVerified: boolean; normalizedFacts: Record<string, JsonValue>; occurredAt: string; receivedAt: string; retentionExpiresAt: string | null; reasonCodes: string[] }): Promise<string>;
  appendEvent(input: { event: CanonicalTrustEvent; envelopeId: string; correlationId: string }): Promise<"APPENDED" | "CHAIN_CONFLICT">;
  completeEnvelope(input: { envelopeId: string; disposition: TrustEventDisposition; eventIds: string[]; reasonCodes: string[] }): Promise<void>;
}

function failed(disposition: TrustEventDisposition, correlationId: string, reasonCodes: string[], extra: Partial<GatewayResult> = {}): GatewayResult {
  return { ok: false, disposition, correlationId, eventIds: [], reasonCodes, ...extra };
}

function buildUnsigned(input: { enterpriseId: string; event: NormalizedProviderEvent; envelope: ProviderEnvelope; envelopeProtocol: CanonicalTrustEvent["provider"]["protocol"]; serverVerified: boolean; receivedAt: string; sequence: number; previousHash: string | null; evidenceReference: string }) {
  return {
    eventId: crypto.randomUUID(), enterpriseId: input.enterpriseId, schemaVersion: TRUST_EVENT_SCHEMA_VERSION, eventType: input.event.eventType,
    subject: input.event.subject, actor: input.event.actor,
    workflow: input.event.workflowId ? { type: "WORKFLOW" as const, id: input.event.workflowId } : null,
    session: input.event.sessionId ? { type: "SESSION" as const, id: input.event.sessionId } : null,
    authority: input.event.authorityId ? { type: "AUTHORITY" as const, id: input.event.authorityId } : null,
    provider: { key: input.envelope.providerKey, protocol: input.envelopeProtocol, serverVerified: input.serverVerified, eventId: input.envelope.providerEventId, transactionId: input.envelope.transactionId, deliveryId: input.envelope.deliveryId },
    normalizedFacts: input.event.normalizedFacts, reasonCodes: input.event.reasonCodes, evidenceReferences: [...input.event.evidenceReferences, input.evidenceReference], occurredAt: input.event.occurredAt, receivedAt: input.receivedAt,
    sequence: input.sequence, previousHash: input.previousHash, canonicalization: TRUST_EVENT_CANONICALIZATION, hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM,
    ordering: { late: Date.parse(input.event.occurredAt) < Date.parse(input.receivedAt) - 300_000, supersedesEventId: input.event.supersedesEventId, providerSequence: input.event.providerSequence },
  };
}

export async function ingestTrustEventRequest(input: RawProviderRequest, repository: TrustEventGatewayRepository): Promise<GatewayResult> {
  const adapter = resolveProviderAdapter(input.path.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "");
  const requestHash = sha256Hex(input.rawBytes);
  if (!adapter) { await repository.recordRejectedEnvelope({ providerKey: "unknown", protocol: "UNSUPPORTED", requestHash, disposition: "BLOCKED_PROVIDER", reasonCodes: ["PROVIDER_NOT_REGISTERED"], correlationId: input.correlationId, receivedAt: input.receivedAt.toISOString() }); return failed("BLOCKED_PROVIDER", input.correlationId, ["PROVIDER_NOT_REGISTERED"]); }
  const capabilities = await adapter.getCapabilities();
  if (["UNSUPPORTED", "DISABLED"].includes(capabilities.runtimeStatus)) { await repository.recordRejectedEnvelope({ providerKey: adapter.key, protocol: capabilities.protocol, requestHash, disposition: "BLOCKED_PROVIDER", reasonCodes: capabilities.reasonCodes, correlationId: input.correlationId, receivedAt: input.receivedAt.toISOString() }); return failed("BLOCKED_PROVIDER", input.correlationId, capabilities.reasonCodes); }
  if (capabilities.runtimeStatus === "BLOCKED_BY_CREDENTIALS") { await repository.recordRejectedEnvelope({ providerKey: adapter.key, protocol: capabilities.protocol, requestHash, disposition: "BLOCKED_PROVIDER", reasonCodes: capabilities.reasonCodes, correlationId: input.correlationId, receivedAt: input.receivedAt.toISOString() }); return failed("BLOCKED_PROVIDER", input.correlationId, capabilities.reasonCodes); }
  const verification = await adapter.verifyEnvelope(input);
  if (!verification.verified) { const disposition = verification.disposition ?? "REJECTED_SIGNATURE"; await repository.recordRejectedEnvelope({ providerKey: adapter.key, protocol: capabilities.protocol, requestHash, disposition, reasonCodes: verification.reasonCodes, correlationId: input.correlationId, receivedAt: input.receivedAt.toISOString() }); return failed(disposition, input.correlationId, verification.reasonCodes); }
  let envelope: ProviderEnvelope;
  try { envelope = await adapter.parseEnvelope(input); } catch (error) { const reasons = [error instanceof Error && "code" in error ? String((error as Error & { code: string }).code) : "PROVIDER_SCHEMA_INVALID"]; await repository.recordRejectedEnvelope({ enterpriseId: input.authenticatedEnterpriseId, providerKey: adapter.key, protocol: capabilities.protocol, requestHash, disposition: "REJECTED_SCHEMA", reasonCodes: reasons, correlationId: input.correlationId, receivedAt: input.receivedAt.toISOString() }); return failed("REJECTED_SCHEMA", input.correlationId, reasons); }
  envelope.nonce ??= verification.nonce;
  envelope.authenticatedActorId = input.authenticatedActorId;
  const enterpriseId = await repository.resolveEnterprise(adapter.key, envelope, input.authenticatedEnterpriseId);
  if (!enterpriseId) { await repository.recordRejectedEnvelope({ providerKey: adapter.key, protocol: capabilities.protocol, requestHash, disposition: "REJECTED_TENANT", reasonCodes: ["ENTERPRISE_ROUTE_NOT_RESOLVED"], correlationId: input.correlationId, receivedAt: input.receivedAt.toISOString() }); return failed("REJECTED_TENANT", input.correlationId, ["ENTERPRISE_ROUTE_NOT_RESOLVED"]); }
  if (!await repository.isProviderEnabled(adapter.key, enterpriseId)) {
    await repository.recordRejectedEnvelope({ enterpriseId, providerKey: adapter.key, protocol: capabilities.protocol, requestHash, disposition: "BLOCKED_PROVIDER", reasonCodes: ["PROVIDER_DISABLED"], correlationId: input.correlationId, receivedAt: input.receivedAt.toISOString() });
    return failed("BLOCKED_PROVIDER", input.correlationId, ["PROVIDER_DISABLED"]);
  }
  let idempotencyKey: string;
  try { idempotencyKey = await adapter.deriveIdempotencyKey(envelope); } catch {
    await repository.recordRejectedEnvelope({ enterpriseId, providerKey: adapter.key, protocol: capabilities.protocol, requestHash, disposition: "REJECTED_SCHEMA", reasonCodes: ["PROVIDER_IDEMPOTENCY_REFERENCE_REQUIRED"], correlationId: input.correlationId, receivedAt: input.receivedAt.toISOString() });
    return failed("REJECTED_SCHEMA", input.correlationId, ["PROVIDER_IDEMPOTENCY_REFERENCE_REQUIRED"]);
  }
  const reservation = await repository.reserveEnvelope({ enterpriseId, providerKey: adapter.key, idempotencyKey, requestHash, envelope, receivedAt: input.receivedAt.toISOString(), correlationId: input.correlationId });
  if (reservation.status === "DUPLICATE") return { ok: true, disposition: "DUPLICATE", correlationId: input.correlationId, envelopeId: reservation.envelopeId, eventIds: reservation.eventIds, reasonCodes: ["IDEMPOTENT_REPLAY_RETURNED"] };
  if (reservation.status === "CONFLICT") return failed("REJECTED_REPLAY", input.correlationId, ["IDEMPOTENCY_KEY_BODY_CONFLICT"], { envelopeId: reservation.envelopeId, conflict: true });
  if (reservation.status === "REPLAY") return failed("REJECTED_REPLAY", input.correlationId, ["NONCE_REPLAY_DETECTED"], { envelopeId: reservation.envelopeId });
  let normalized: NormalizedProviderEvent[];
  try { normalized = (await adapter.normalize(envelope)).map((event) => normalizeProviderEvent(event, envelope, input.receivedAt)); }
  catch { await repository.completeEnvelope({ envelopeId: reservation.envelopeId, disposition: "REJECTED_SCHEMA", eventIds: [], reasonCodes: ["NORMALIZED_EVENT_SCHEMA_INVALID"] }); return failed("REJECTED_SCHEMA", input.correlationId, ["NORMALIZED_EVENT_SCHEMA_INVALID"], { envelopeId: reservation.envelopeId }); }
  if (!normalized.length) { await repository.completeEnvelope({ envelopeId: reservation.envelopeId, disposition: "INCONCLUSIVE", eventIds: [], reasonCodes: ["NO_NORMALIZED_EVENTS"] }); return failed("INCONCLUSIVE", input.correlationId, ["NO_NORMALIZED_EVENTS"], { envelopeId: reservation.envelopeId }); }
  const eventIds: string[] = [];
  for (const item of normalized) {
    const positiveEligible=capabilities.positiveEvidence&&verification.serverVerified&&adapter.key!=="world_id";
    const evidenceResult=item.eventType.includes("revoked")?"REVOKED" as const:item.eventType.includes("rejected")||item.eventType.includes("failed")?"NEGATIVE" as const:positiveEligible?"POSITIVE" as const:"INCONCLUSIVE" as const;
    const evidenceReference = await repository.persistEvidence({ evidenceId:crypto.randomUUID(),enterpriseId, envelopeId: reservation.envelopeId, providerKey: adapter.key, classification: positiveEligible ? "SERVER_VERIFIED" : "NORMALIZED_ONLY",domainKey:"IDENTITY",subjectId:item.subject.id,subjectType:item.subject.type,evidenceType:item.eventType,result:evidenceResult,assuranceLevel:positiveEligible&&(capabilities.signatureVerification||capabilities.serverVerification)?"VERY_HIGH":verification.serverVerified?"HIGH":verification.verified?"MEDIUM":"NONE",cryptographicallyVerified:capabilities.signatureVerification&&verification.verified,serverVerified:verification.serverVerified, normalizedFacts: item.normalizedFacts, occurredAt: item.occurredAt,receivedAt:input.receivedAt.toISOString(), retentionExpiresAt: null,reasonCodes:item.reasonCodes });
    let appended = false;
    for (let attempt = 0; attempt < 5 && !appended; attempt += 1) {
      const head = await repository.getChainHead(enterpriseId);
      const event = signTrustEvent(buildUnsigned({ enterpriseId, event: item, envelope, envelopeProtocol: capabilities.protocol, serverVerified: verification.serverVerified, receivedAt: input.receivedAt.toISOString(), sequence: head.sequence + 1, previousHash: head.eventHash, evidenceReference }));
      if (await repository.appendEvent({ event, envelopeId: reservation.envelopeId, correlationId: input.correlationId }) === "APPENDED") { eventIds.push(event.eventId); appended = true; }
    }
    if (!appended) { await repository.completeEnvelope({ envelopeId: reservation.envelopeId, disposition: "FAILED", eventIds, reasonCodes: ["CHAIN_CONTENTION_RETRY_EXHAUSTED"] }); return failed("FAILED", input.correlationId, ["CHAIN_CONTENTION_RETRY_EXHAUSTED"], { envelopeId: reservation.envelopeId }); }
  }
  const disposition: TrustEventDisposition = verification.disposition === "INCONCLUSIVE" || !capabilities.positiveEvidence ? "INCONCLUSIVE" : "ACCEPTED";
  const reasonCodes = [...new Set([...capabilities.reasonCodes, ...verification.reasonCodes])];
  await repository.completeEnvelope({ envelopeId: reservation.envelopeId, disposition, eventIds, reasonCodes });
  return { ok: true, disposition, correlationId: input.correlationId, envelopeId: reservation.envelopeId, eventIds, reasonCodes };
}
