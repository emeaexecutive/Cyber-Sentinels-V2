import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const base = read("../app/api/replay/[id]/route.ts");
const timeline = read("../app/api/replay/[id]/timeline/route.ts");
const events = read("../app/api/replay/[id]/events/route.ts");
const summary = read("../app/api/replay/[id]/summary/route.ts");
const http = read("../src/core/trust/replay/http.ts");
const repository = read("../src/core/trust/replay/supabase-repository.ts");
const viewer = read("../components/replay-viewer.tsx");

test("all entity Replay endpoints authenticate, validate UUIDs, search, and fail safely", () => {
  for (const source of [timeline, events, summary]) {
    assert.match(source, /trustGraphContext\(request\)/);
    assert.match(source, /trustGraphUuid/);
    assert.match(source, /replaySearch\(request\)/);
    assert.match(source, /trustGraphFailure/);
  }
  assert.match(base, /ReplayService/);
  assert.match(base, /replayFormat/);
  assert.match(base, /exportCsv/);
  assert.match(base, /enterpriseAudit/);
  assert.match(base, /trust_replay_sessions/);
});

test("Replay search supports every requested filter and bounded indexed queries", () => {
  for (const marker of [
    "from", "to", "riskMin", "riskMax", "provider", "actor",
    "evidenceType", "trustMin", "trustMax",
  ]) {
    assert.match(http, new RegExp(marker), marker);
  }
  assert.match(http, /requestedLimit < 1 \|\| requestedLimit > 500/);
  assert.match(http, /REPLAY_SCORE_RANGE_INVALID/);
  assert.match(repository, /\.eq\("tenant_id", tenantId\)/);
  assert.match(repository, /\.eq\("entity_id", entityId\)/);
  assert.match(repository, /\.contains\("metadata", \{ evidenceType: search\.evidenceType \}\)/);
});

test("Replay Viewer exposes timeline, filters, state changes, provider history, and exports", () => {
  for (const marker of [
    "Trust Timeline",
    "From date",
    "Maximum risk",
    "Provider",
    "Actor",
    "Evidence type",
    "Minimum trust",
    "Trust:",
    "Risk:",
    "Evidence:",
    "Integrity chain verified",
  ]) {
    assert.match(viewer, new RegExp(marker, "i"), marker);
  }
  assert.match(viewer, /\(\["json", "csv", "audit"\] as const\)/);
  assert.match(viewer, /Export \{format\}/);
  assert.match(viewer, /data-testid="replay-viewer"/);
});
