import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { canonicalizeJson, canonicalizeTrustEvent, normalizeUtcTimestamp } from "../src/lib/trust-events/canonicalize.ts";
import { hashTrustEvent, signTrustEvent, verifyTrustEventHash } from "../src/lib/trust-events/hash.ts";
import { ingestTrustEventRequest } from "../src/lib/trust-events/gateway.ts";
import { TRUST_EVENT_CANONICALIZATION, TRUST_EVENT_HASH_ALGORITHM, TRUST_EVENT_SCHEMA_VERSION } from "../src/lib/trust-events/types.ts";

const enterpriseId = "11111111-1111-4111-8111-111111111111";
const originalSecret = process.env.HOPAE_WEBHOOK_SECRET;
const originalEnabled = process.env.HOPAE_ENABLED;
process.env.HOPAE_WEBHOOK_SECRET = "trust-event-test-secret";
process.env.HOPAE_ENABLED = "true";

function unsigned(overrides = {}) {
  return { eventId: "22222222-2222-4222-8222-222222222222", enterpriseId, schemaVersion: TRUST_EVENT_SCHEMA_VERSION, eventType: "provider.envelope.accepted", subject: { type: "HUMAN", id: "subject-1" }, actor: { type: "PROVIDER", id: "hopae_connect" }, workflow: null, session: null, authority: null, provider: { key: "hopae_connect", protocol: "HMAC", serverVerified: false, eventId: "evt-1", transactionId: "verification-1", deliveryId: null }, normalizedFacts: { z: 2, a: 1 }, reasonCodes: ["SIGNED"], evidenceReferences: ["evidence:33333333-3333-4333-8333-333333333333"], occurredAt: "2026-07-20T10:00:00+02:00", receivedAt: "2026-07-20T08:00:01.000Z", sequence: 1, previousHash: null, canonicalization: TRUST_EVENT_CANONICALIZATION, hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM, ordering: { late: false, supersedesEventId: null, providerSequence: null }, ...overrides };
}

test("RFC 8785-style canonical JSON orders keys and normalizes integrity timestamps", () => {
  assert.equal(canonicalizeJson({ z: 1, a: { d: 2, c: 3 } }), '{"a":{"c":3,"d":2},"z":1}');
  assert.equal(normalizeUtcTimestamp("2026-07-20T10:00:00+02:00"), "2026-07-20T08:00:00.000Z");
  assert.match(canonicalizeTrustEvent(unsigned()), /"occurredAt":"2026-07-20T08:00:00.000Z"/);
  assert.throws(() => canonicalizeJson({ value: Number.NaN }), /non-finite/);
  assert.throws(() => canonicalizeJson({ value: undefined }), /undefined/);
  assert.throws(() => canonicalizeJson({ value: 1n }), /bigint/);
  assert.throws(() => canonicalizeJson({ value: "\ud800" }), /surrogates/);
});

test("Trust Event hashes are deterministic and tamper evident", () => {
  const first = signTrustEvent(unsigned());
  const second = signTrustEvent({ ...unsigned(), normalizedFacts: { a: 1, z: 2 } });
  assert.equal(first.eventHash, second.eventHash);
  assert.equal(hashTrustEvent(first), first.eventHash);
  assert.equal(verifyTrustEventHash(first), true);
  assert.equal(verifyTrustEventHash({ ...first, normalizedFacts: { a: 2 } }), false);
});

test("Trust Event runtime validation rejects incomplete provider and ordering metadata", () => {
  assert.throws(() => canonicalizeTrustEvent({ ...unsigned(), provider: { ...unsigned().provider, serverVerified: "yes" } }), /serverVerified/);
  assert.throws(() => canonicalizeTrustEvent({ ...unsigned(), provider: { ...unsigned().provider, eventId: "invalid reference with spaces" } }), /provider\.eventId/);
  assert.throws(() => canonicalizeTrustEvent({ ...unsigned(), ordering: { late: "no", supersedesEventId: null, providerSequence: null } }), /ordering metadata/);
  assert.throws(() => canonicalizeTrustEvent({ ...unsigned(), ordering: { late: false, supersedesEventId: "not-a-uuid", providerSequence: null } }), /supersedesEventId/);
  assert.throws(() => canonicalizeTrustEvent({ ...unsigned(), ordering: { late: false, supersedesEventId: null, providerSequence: -1 } }), /providerSequence/);
});

class MemoryRepository {
  envelopes = new Map(); heads = new Map(); events = []; evidence = [];
  async resolveEnterprise(_provider, _envelope, authenticated) { return authenticated ?? enterpriseId; }
  async isProviderEnabled() { return true; }
  async recordRejectedEnvelope(input) { this.rejected = input; }
  async reserveEnvelope(input) {
    const key = `${input.enterpriseId}:${input.providerKey}:${input.idempotencyKey}`;
    const existing = this.envelopes.get(key);
    if (existing) return existing.requestHash === input.requestHash ? { status: "DUPLICATE", envelopeId: existing.id, eventIds: existing.eventIds, disposition: existing.disposition } : { status: "CONFLICT", envelopeId: existing.id };
    const id = crypto.randomUUID(); this.envelopes.set(key, { id, requestHash: input.requestHash, eventIds: [], disposition: "INCONCLUSIVE" }); return { status: "NEW", envelopeId: id };
  }
  async getChainHead(id) { return this.heads.get(id) ?? { sequence: 0, eventHash: null }; }
  async persistEvidence(input) { const id = crypto.randomUUID(); this.evidence.push({ id, ...input }); return `evidence:${id}`; }
  async appendEvent(input) {
    await new Promise((resolve) => setImmediate(resolve));
    const head = this.heads.get(input.event.enterpriseId) ?? { sequence: 0, eventHash: null };
    if (input.event.sequence !== head.sequence + 1 || input.event.previousHash !== head.eventHash) return "CHAIN_CONFLICT";
    this.events.push(input.event); this.heads.set(input.event.enterpriseId, { sequence: input.event.sequence, eventHash: input.event.eventHash }); return "APPENDED";
  }
  async completeEnvelope(input) { for (const value of this.envelopes.values()) if (value.id === input.envelopeId) Object.assign(value, { eventIds: input.eventIds, disposition: input.disposition }); }
}

function hopaeBody(eventId = "evt-1", extra = {}) { return JSON.stringify({ event: "verification.completed", eventId, timestamp: "2026-07-20T08:00:00.000Z", data: { verificationId: `verification-${eventId}`, ...extra } }); }
function request(provider, body, timestamp = Math.floor(Date.now() / 1000), valid = true, authenticated = false) {
  const bytes = new TextEncoder().encode(body);
  const signature = createHmac("sha256", valid ? process.env.HOPAE_WEBHOOK_SECRET : "incorrect").update(`${timestamp}.${body}`).digest("hex");
  return { rawBytes: bytes, headers: { "x-hopae-signature": `t=${timestamp},v1=${signature}` }, method: "POST", path: `/api/trust-events/ingest/${provider}`, receivedAt: new Date(), correlationId: crypto.randomUUID(), ...(authenticated ? { authenticatedEnterpriseId: enterpriseId, authenticatedActorId: "44444444-4444-4444-8444-444444444444" } : {}) };
}

test("Hopae verifies the original bytes and returns the prior result for an exact duplicate", async () => {
  const repository = new MemoryRepository(); const body = hopaeBody();
  const accepted = await ingestTrustEventRequest(request("hopae_connect", body), repository);
  const duplicate = await ingestTrustEventRequest(request("hopae_connect", body), repository);
  assert.equal(accepted.disposition, "ACCEPTED"); assert.equal(accepted.eventIds.length, 1); assert.equal(repository.events.length, 1);
  assert.equal(duplicate.disposition, "DUPLICATE"); assert.deepEqual(duplicate.eventIds, accepted.eventIds); assert.equal(repository.evidence.length, 1);
  assert.equal(repository.events[0].provider.serverVerified, false);
});

test("Hopae rejects invalid and expired signatures before persistence", async () => {
  const invalidRepo = new MemoryRepository();
  assert.equal((await ingestTrustEventRequest(request("hopae", hopaeBody(), Math.floor(Date.now() / 1000), false), invalidRepo)).disposition, "REJECTED_SIGNATURE");
  assert.equal(invalidRepo.events.length, 0);
  const expiredRepo = new MemoryRepository();
  assert.equal((await ingestTrustEventRequest(request("hopae", hopaeBody(), Math.floor(Date.now() / 1000) - 600, true), expiredRepo)).disposition, "REJECTED_TIMESTAMP");
  assert.equal(expiredRepo.events.length, 0);
});

test("same Hopae event key with different bytes is a conflict and creates no duplicate evidence", async () => {
  const repository = new MemoryRepository();
  await ingestTrustEventRequest(request("hopae", hopaeBody("evt-conflict")), repository);
  const conflict = await ingestTrustEventRequest(request("hopae", hopaeBody("evt-conflict", { harmless: "changed" })), repository);
  assert.equal(conflict.disposition, "REJECTED_REPLAY"); assert.equal(conflict.conflict, true); assert.equal(repository.events.length, 1); assert.equal(repository.evidence.length, 1);
});

test("concurrent deliveries append a contiguous per-enterprise hash chain", async () => {
  const repository = new MemoryRepository();
  const results = await Promise.all(["evt-a", "evt-b", "evt-c"].map((id) => ingestTrustEventRequest(request("hopae", hopaeBody(id)), repository)));
  assert.ok(results.every((result) => result.ok)); assert.deepEqual(repository.events.map((event) => event.sequence), [1, 2, 3]);
  assert.equal(repository.events[1].previousHash, repository.events[0].eventHash); assert.equal(repository.events[2].previousHash, repository.events[1].eventHash);
});

test("World ID is always inconclusive with zero confidence and placeholders contribute nothing", async () => {
  const repository = new MemoryRepository();
  const worldBody = JSON.stringify({ eventId: "world-event-1", data: { subjectId: "subject-world" } });
  const world = await ingestTrustEventRequest({ ...request("world_id", worldBody, undefined, true, true), headers: {} }, repository);
  assert.equal(world.disposition, "INCONCLUSIVE"); assert.equal(repository.events[0].eventType, "identity.world_id.proof_received"); assert.deepEqual(repository.events[0].normalizedFacts, { provider: "world_id", outcome: "INCONCLUSIVE", serverVerified: false, confidence: 0 });
  assert.ok(world.reasonCodes.includes("WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"));
  const placeholderRepo = new MemoryRepository(); const placeholder = await ingestTrustEventRequest({ ...request("onfido", "{}"), headers: {} }, placeholderRepo);
  assert.equal(placeholder.disposition, "BLOCKED_PROVIDER"); assert.equal(placeholderRepo.events.length, 0); assert.equal(placeholderRepo.evidence.length, 0);
});

test("provider runtime disablement blocks persistence after tenant routing", async () => {
  const repository = new MemoryRepository();
  repository.isProviderEnabled = async () => false;
  const result = await ingestTrustEventRequest(request("hopae", hopaeBody("evt-disabled")), repository);
  assert.equal(result.disposition, "BLOCKED_PROVIDER");
  assert.deepEqual(result.reasonCodes, ["PROVIDER_DISABLED"]);
  assert.equal(repository.events.length, 0);
  assert.equal(repository.evidence.length, 0);
  assert.equal(repository.rejected.protocol, "HMAC");
});

test.after(() => {
  if (originalSecret === undefined) delete process.env.HOPAE_WEBHOOK_SECRET; else process.env.HOPAE_WEBHOOK_SECRET = originalSecret;
  if (originalEnabled === undefined) delete process.env.HOPAE_ENABLED; else process.env.HOPAE_ENABLED = originalEnabled;
});
