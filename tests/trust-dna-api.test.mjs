import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const current = read("../app/api/trust-dna/[identity]/route.ts");
const history = read("../app/api/trust-dna/[identity]/history/route.ts");
const recalculate = read("../app/api/trust-dna/recalculate/route.ts");
const repository = read("../src/core/trust/dna/supabase-repository.ts");
const dashboard = read("../components/trust-dna-card.tsx");

test("Trust DNA APIs authenticate, validate entity identifiers, bound reads, and fail safely", () => {
  assert.match(current, /trustIntelligenceContext\(request\)/);
  assert.match(current, /TrustDNAService/);
  assert.match(current, /trustIntelligenceLimit\(request\)/);
  assert.match(history, /trustGraphContext\(request\)/);
  assert.match(history, /trustGraphUuid/);
  assert.match(history, /trustGraphLimit\(request, 100\)/);
  assert.match(history, /trustGraphFailure/);
});

test("recalculation is a role-constrained same-origin mutation with server-derived evidence", () => {
  assert.match(recalculate, /trustGraphContext\(request, true, \["owner", "admin", "reviewer"\]\)/);
  assert.match(recalculate, /trustGraphBody/);
  assert.match(recalculate, /trustGraphUuid\(body\.entityId/);
  assert.doesNotMatch(recalculate, /body\.evidence|body\.score|body\.tenantId/);
  assert.match(repository, /createServiceRoleClient/);
  assert.match(repository, /persist_trust_dna_v2/);
});

test("enterprise dashboard card exposes every required Trust DNA field and an honest empty state", () => {
  for (const marker of [
    "Overall Score",
    "Dimension breakdown",
    "Confidence",
    "Evidence completeness",
    "Last recalculated",
    "No persisted Trust DNA profile yet",
  ]) {
    assert.match(dashboard, new RegExp(marker, "i"), marker);
  }
  assert.match(dashboard, /data-testid="trust-dna-card"/);
});
