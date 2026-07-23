import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../../supabase/migrations/202607230001_trust_intelligence_engine.sql", import.meta.url),
  "utf8",
);

const tables = [
  "evidence_nodes",
  "evidence_relationships",
  "trust_profiles",
  "trust_dimensions",
  "trust_history",
  "replay_events",
  "trust_signals",
  "trust_updates",
  "provider_results",
];

test("EPIC 20 migration creates every required Trust Intelligence table", () => {
  for (const table of tables) assert.match(sql, new RegExp(`create table public\\.${table}`), table);
});

test("every Trust Intelligence table enables RLS and denies direct authenticated writes", () => {
  assert.match(sql, /alter table public\.%I enable row level security/);
  assert.match(sql, /revoke all on public\.%I from anon,authenticated/);
  assert.match(sql, /grant select on public\.%I to authenticated/);
  for (const table of tables) {
    assert.match(sql, new RegExp(`tenant reads ${table.replaceAll("_", " ")}`), table);
  }
});

test("tenant relationships and projections use composite tenant foreign keys", () => {
  assert.match(sql, /foreign key\(tenant_id,from_node_id\)/);
  assert.match(sql, /foreign key\(tenant_id,to_node_id\)/);
  assert.match(sql, /foreign key\(tenant_id,profile_id\)/);
  assert.match(sql, /foreign key\(tenant_id,signal_id\)/);
  assert.match(sql, /Cross-tenant or cross-identity signal projection denied/);
});

test("history is append-only and write functions are service-role only", () => {
  for (const table of tables) {
    assert.match(sql, new RegExp(`${table}_append_only`), table);
  }
  assert.match(sql, /Trust DNA service path required/);
  assert.match(sql, /Continuous Trust signal service path required/);
  assert.match(sql, /revoke all on function public\.persist_trust_profile_v1[\s\S]*from public,anon,authenticated/);
  assert.match(sql, /revoke all on function public\.record_trust_signal_v1[\s\S]*from public,anon,authenticated/);
});
