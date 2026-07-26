import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { TrustGraphService } from "../../src/core/trust/index.ts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const rootId = "22222222-2222-4222-8222-222222222222";
const now = "2026-07-23T12:00:00.000Z";
const entity = (id) => ({
  id,
  tenantId,
  entityType: "DEVICE",
  entityName: id,
  status: "ACTIVE",
  metadata: {},
  version: 1,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
});

test("bounded 500-neighbour graph lookup avoids per-node repository calls", async () => {
  const neighbours = Array.from({ length: 500 }, (_, index) =>
    entity(`${String(index).padStart(8, "0")}-3333-4333-8333-333333333333`),
  );
  let neighbourCalls = 0;
  const repository = {
    async findEntity(_tenant, id) { return id === rootId ? entity(rootId) : null; },
    async findNeighbours() {
      neighbourCalls += 1;
      return {
        entities: neighbours,
        relationships: neighbours.map((item, index) => ({
          id: `${String(index).padStart(8, "0")}-4444-4444-8444-444444444444`,
          tenantId,
          sourceEntityId: rootId,
          targetEntityId: item.id,
          relationshipType: "USES_DEVICE",
          confidence: 0.8,
          metadata: {},
          version: 1,
          createdAt: now,
          removedAt: null,
        })),
      };
    },
    async findEvidence() { return []; },
  };
  const started = performance.now();
  const graph = await new TrustGraphService(repository).entityGraph(tenantId, rootId, 500);
  const durationMs = performance.now() - started;
  assert.equal(graph.neighbours.length, 500);
  assert.equal(graph.relationships.length, 500);
  assert.equal(neighbourCalls, 1);
  assert.ok(durationMs < 1_000, `Graph lookup took ${durationMs.toFixed(2)}ms`);
});
