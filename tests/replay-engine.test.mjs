import test from "node:test";
import assert from "node:assert/strict";
import {
  ReplayEngine,
  ReplayRenderer,
  sanitizeReplayMetadata,
} from "../src/core/trust/replay/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const entityId = "22222222-2222-4222-8222-222222222222";

function event(id, type, eventTime, overrides = {}) {
  return {
    id,
    tenantId,
    identityId: entityId,
    entityId,
    type,
    title: type.replaceAll("_", " "),
    description: `${type} was retained for forensic replay.`,
    occurredAt: eventTime,
    eventTime,
    source: "test",
    actorId: null,
    actor: "reviewer:test",
    provider: "provider:test",
    confidence: 0.9,
    evidenceIds: [],
    priorRisk: null,
    resultingRisk: null,
    priorTrust: null,
    resultingTrust: null,
    metadata: {},
    previousEventHash: null,
    integrityHash: null,
    createdAt: eventTime,
    ...overrides,
  };
}

test("Replay orders forensic events deterministically and reconstructs changes", () => {
  const timeline = new ReplayEngine().build(tenantId, entityId, [
    event("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "TRUST_UPDATED", "2026-07-24T10:02:00Z", {
      priorTrust: 90,
      resultingTrust: 64,
      priorRisk: 20,
      resultingRisk: 70,
    }),
    event("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "PASSPORT_VERIFIED", "2026-07-24T10:00:00Z", {
      evidenceIds: ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
    }),
  ]);
  assert.deepEqual(timeline.events.map((item) => item.type), [
    "PASSPORT_VERIFIED",
    "TRUST_UPDATED",
  ]);
  assert.equal(timeline.summary.evidenceAdded, 1);
  assert.equal(timeline.summary.trustChanges, 1);
  assert.equal(timeline.summary.riskChanges, 1);
  const rendered = new ReplayRenderer().render(timeline);
  assert.equal(rendered[1].trustChange, "90 → 64");
  assert.equal(rendered[1].riskChange, "20 → 70");
});

test("Replay discards cross-tenant and cross-entity repository output", () => {
  const selected = event("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "EMAIL_VERIFIED", "2026-07-24T10:00:00Z");
  const timeline = new ReplayEngine().build(tenantId, entityId, [
    selected,
    { ...selected, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", tenantId: "99999999-9999-4999-8999-999999999999" },
    { ...selected, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", entityId: "99999999-9999-4999-8999-999999999999", identityId: "99999999-9999-4999-8999-999999999999" },
  ]);
  assert.deepEqual(timeline.events.map((item) => item.id), [selected.id]);
});

test("Replay detects a discontinuous integrity chain without rejecting legacy history", () => {
  const firstHash = "a".repeat(64);
  const secondHash = "b".repeat(64);
  const intact = new ReplayEngine().build(tenantId, entityId, [
    event("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "EVIDENCE_ADDED", "2026-07-24T10:00:00Z", {
      integrityHash: firstHash,
    }),
    event("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "TRUST_UPDATED", "2026-07-24T10:01:00Z", {
      previousEventHash: firstHash,
      integrityHash: secondHash,
    }),
  ]);
  assert.equal(intact.integrity.valid, true);
  const broken = new ReplayEngine().build(tenantId, entityId, [
    intact.events[0],
    { ...intact.events[1], previousEventHash: "c".repeat(64) },
  ]);
  assert.equal(broken.integrity.valid, false);
  assert.equal(broken.integrity.firstBrokenEventId, intact.events[1].id);
  const legacy = new ReplayEngine().build(tenantId, entityId, [
    event("cccccccc-cccc-4ccc-8ccc-cccccccccccc", "DECISION_RECORDED", "2026-07-24T09:00:00Z"),
  ]);
  assert.equal(legacy.integrity.valid, true);
  assert.equal(legacy.integrity.unchainedLegacyEvents, 1);
});

test("Replay metadata removes sensitive payload and contact fields", () => {
  assert.deepEqual(
    sanitizeReplayMetadata({
      evidenceType: "PASSPORT",
      safeReference: "ref:1",
      rawPayload: "secret",
      emailAddress: "person@example.com",
      apiToken: "secret",
    }),
    { evidenceType: "PASSPORT", safeReference: "ref:1" },
  );
});
