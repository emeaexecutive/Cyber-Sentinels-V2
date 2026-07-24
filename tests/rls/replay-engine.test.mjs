import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../../supabase/migrations/202607240002_replay_timeline_engine.sql", import.meta.url),
  "utf8",
);

test("Replay evolves the immutable table with entity, forensic state, and integrity columns", () => {
  for (const column of [
    "id", "tenant_id", "entity_id", "event_type", "event_time", "actor",
    "provider", "confidence", "risk_before", "risk_after", "trust_before",
    "trust_after", "metadata", "created_at", "previous_event_hash", "event_hash",
  ]) {
    assert.match(sql, new RegExp(column), column);
  }
  assert.match(sql, /foreign key\(tenant_id,entity_id\)[\s\S]*trust_entities\(tenant_id,id\)/);
  assert.match(sql, /replay_events_append_only|append_replay_event_internal_v2/);
});

test("Replay search indexes cover date, provider, actor, evidence, risk, and trust", () => {
  for (const index of [
    "replay_events_entity_time_idx",
    "replay_events_provider_idx",
    "replay_events_actor_idx",
    "replay_events_risk_idx",
    "replay_events_trust_idx",
    "replay_events_evidence_type_idx",
  ]) {
    assert.match(sql, new RegExp(index), index);
  }
});

test("Replay writes are service-only, chained, serialized, and tenant-checked", () => {
  assert.match(sql, /auth\.role\(\) <> 'service_role'/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /digest\(coalesce\(previous_hash,''\)\|\|event_payload::text,'sha256'\)/);
  assert.match(sql, /where tenant_id=tenant and id=entity and status <> 'DELETED'/);
  assert.match(sql, /revoke all on function public\.append_replay_event_v2\(jsonb\)[\s\S]*anon,authenticated/);
  assert.match(sql, /grant execute on function public\.append_replay_event_v2\(jsonb\)[\s\S]*service_role/);
});

test("evidence and Trust DNA triggers capture every required source family", () => {
  for (const marker of [
    "passport", "email", "phone", "device", "location", "vpn", "browser",
    "liveness", "deepfake", "policy", "manual", "PROVIDER_RESPONSE_RECORDED",
    "TRUST_DNA_RECALCULATED",
  ]) {
    assert.match(sql, new RegExp(marker, "i"), marker);
  }
});
