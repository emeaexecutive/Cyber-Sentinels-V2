import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = {
  evidence: readFileSync(new URL("../app/api/evidence/[id]/route.ts", import.meta.url), "utf8"),
  graph: readFileSync(new URL("../app/api/evidence/graph/[identity]/route.ts", import.meta.url), "utf8"),
  history: readFileSync(new URL("../app/api/evidence/history/[identity]/route.ts", import.meta.url), "utf8"),
  dna: readFileSync(new URL("../app/api/trust-dna/[identity]/route.ts", import.meta.url), "utf8"),
  decision: readFileSync(new URL("../app/api/trust-intelligence/decision/[identity]/route.ts", import.meta.url), "utf8"),
  replay: readFileSync(new URL("../app/api/replay/[id]/route.ts", import.meta.url), "utf8"),
  http: readFileSync(new URL("../src/core/trust/intelligence/http.ts", import.meta.url), "utf8"),
};

test("all Trust Intelligence reads require enterprise authentication and validated references", () => {
  for (const [name, source] of Object.entries(files).filter(([name]) => !["http", "replay"].includes(name))) {
    assert.match(source, /trustIntelligenceContext\(request\)/, name);
    assert.match(source, /trustIntelligenceReference/, name);
    assert.match(source, /trustIntelligenceFailure/, name);
  }
  assert.match(files.replay, /trustIntelligenceContext\(request\)/);
  assert.match(files.replay, /authenticatedTrustClient\(\)/);
});

test("Trust Intelligence responses are private, versioned and correlation-aware", () => {
  assert.match(files.http, /trust-intelligence-v1/);
  assert.match(files.http, /private, no-store/);
  assert.match(files.http, /x-correlation-id/);
  assert.match(files.http, /status < 500/);
});

test("Evidence graph, history, Trust DNA and Replay enforce bounded reads", () => {
  for (const source of [files.graph, files.history, files.dna, files.decision, files.replay]) {
    assert.match(source, /trustIntelligenceLimit\(request\)/);
  }
});

test("legacy Replay remains available while identity Replay is additive", () => {
  assert.match(files.replay, /trust_replay_sessions/);
  assert.match(files.replay, /loadWorkflowTrust/);
  assert.match(files.replay, /createReplayRepository/);
  assert.match(files.replay, /ReplayRenderer/);
});
