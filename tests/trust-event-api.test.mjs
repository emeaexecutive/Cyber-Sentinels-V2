import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = await Promise.all([
  "../app/api/trust-events/route.ts", "../app/api/trust-events/ingest/[provider]/route.ts", "../app/api/trust-events/[id]/route.ts", "../app/api/trust-events/[id]/integrity/route.ts",
  "../app/api/trust-events/subjects/[subjectId]/route.ts", "../app/api/trust-events/workflows/[workflowId]/route.ts", "../app/api/trust-events/sessions/[sessionId]/route.ts", "../app/api/trust-events/providers/health/route.ts",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
const establishedHopaeCallback = await readFile(new URL("../app/api/providers/route.ts", import.meta.url), "utf8");
const trustEventHttp = await readFile(new URL("../src/lib/trust-events/http.ts", import.meta.url), "utf8");

test("all Trust Event query APIs authenticate and scope by enterprise", () => {
  for (const source of [files[0], files[2], files[3], files[4], files[5], files[6], files[7]]) assert.match(source, /trustEventReadContext/);
  for (const source of [files[0], files[2], files[3], files[4], files[5], files[6]]) assert.match(source, /enterpriseId/);
});

test("legacy Trust Event POST remains available without permitting canonical writes", () => {
  assert.match(files[0], /export async function POST/);
  assert.match(files[0], /trust_event_created/);
  assert.match(files[0], /Canonical v1 writes are accepted/);
});

test("ingestion preserves raw bytes, correlation IDs, body limits, and stable dispositions", () => {
  const source = files[1]; assert.match(source, /request\.arrayBuffer\(\)/); assert.match(source, /rawBytes: bytes/); assert.match(source, /maximumEnvelopeBytes/);
  assert.match(source, /trustEventCorrelationId/); assert.match(source, /result\.disposition === "DUPLICATE"/); assert.match(source, /result\.conflict \? 409/);
  assert.doesNotMatch(source, /request\.json\(\)/);
});

test("integrity endpoint verifies both the event digest and the previous link", () => {
  assert.match(files[3], /verifyTrustEventHash/); assert.match(files[3], /previousLinkValid/); assert.match(files[3], /event\.sequence - 1/);
  assert.match(files[3], /storageFieldsValid/); assert.match(files[3], /event\.enterpriseId === auth\.enterpriseId/);
  assert.match(files[3], /INVALID_EVENT_ID/);
});

test("pagination uses a stable timestamp and event ID cursor", () => {
  assert.match(trustEventHttp, /base64url/);
  assert.match(trustEventHttp, /receivedAt.*eventId/);
  for (const source of [files[0], files[4], files[5], files[6]]) {
    assert.match(source, /order\("received_at"/);
    assert.match(source, /order\("event_id"/);
    assert.match(source, /encodeTrustEventCursor/);
    assert.match(source, /event_id\.lt/);
  }
});

test("the established Hopae callback preserves exact bytes and appends canonical Trust Events", () => {
  assert.match(establishedHopaeCallback, /request\.arrayBuffer\(\)/);
  assert.match(establishedHopaeCallback, /rawBytes/);
  assert.match(establishedHopaeCallback, /ingestTrustEventRequest/);
  assert.match(establishedHopaeCallback, /supabaseTrustEventRepository/);
  assert.match(establishedHopaeCallback, /canonical_trust_event_persistence_failed/);
});
