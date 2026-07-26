import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../../supabase/migrations/202607230002_enterprise_trust_graph.sql", import.meta.url),
  "utf8",
);
const tables = [
  "trust_entities",
  "trust_evidence",
  "trust_relationships",
  "trust_sources",
  "trust_graph_events",
];

test("EPIC 21 migration creates versioned graph and event tables", () => {
  for (const table of tables) assert.match(sql, new RegExp(`create table public\\.${table}`), table);
  assert.match(sql, /version integer not null/);
  assert.match(sql, /deleted_at timestamptz/);
  assert.match(sql, /removed_at timestamptz/);
});

test("all graph tables enable RLS, revoke direct writes and scope tenant reads", () => {
  assert.match(sql, /alter table public\.%I enable row level security/);
  assert.match(sql, /revoke all on public\.%I from anon,authenticated/);
  for (const policy of [
    "tenant reads trust entities",
    "tenant reads trust graph evidence",
    "tenant reads trust relationships",
    "tenant reads trust sources",
    "tenant reads trust graph events",
  ]) assert.match(sql, new RegExp(policy));
  assert.match(sql, /user_can_access_trust_workspace\(tenant_id\)/);
});

test("composite tenant foreign keys prevent cross-tenant graph joins", () => {
  assert.match(sql, /foreign key\(tenant_id,entity_id\)/);
  assert.match(sql, /foreign key\(tenant_id,source_entity\)/);
  assert.match(sql, /foreign key\(tenant_id,target_entity\)/);
  assert.match(sql, /Cross-tenant Trust Graph mutation denied/);
});

test("mutations are atomic, event emitting, version checked and service only", () => {
  assert.match(sql, /mutate_trust_graph_v1/);
  assert.match(sql, /insert into public\.trust_graph_events/);
  assert.match(sql, /Trust Graph version conflict/);
  assert.match(sql, /Trust Graph service path required/);
  assert.match(sql, /revoke all on function public\.mutate_trust_graph_v1[\s\S]*from public,anon,authenticated/);
  assert.match(sql, /trust_graph_events_append_only/);
  assert.match(sql, /trust_evidence_append_only/);
});

test("indexes cover tenant entity, evidence, relationship, source, event and hashed match lookups", () => {
  for (const index of [
    "trust_entities_tenant_type_status_idx",
    "trust_evidence_entity_idx",
    "trust_evidence_match_key_idx",
    "trust_relationships_source_idx",
    "trust_relationships_target_idx",
    "trust_sources_health_idx",
    "trust_graph_events_entity_idx",
  ]) assert.match(sql, new RegExp(index), index);
});
