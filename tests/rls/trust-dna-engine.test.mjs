import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../../supabase/migrations/202607240001_trust_dna_engine.sql", import.meta.url),
  "utf8",
);

test("Trust DNA schema is versioned, append-only, and bound to Enterprise Trust Graph entities", () => {
  assert.match(sql, /create table public\.trust_dimension_scores/);
  assert.match(sql, /create table public\.trust_score_history/);
  assert.match(sql, /foreign key\(tenant_id,entity_id\)[\s\S]*trust_entities\(tenant_id,id\)/);
  assert.match(sql, /trust_profiles_v2_entity_version_uidx/);
  assert.match(sql, /previous_profile_id/);
  assert.match(sql, /trust_dimension_scores_append_only/);
  assert.match(sql, /trust_score_history_append_only/);
});

test("Trust DNA RLS grants tenant reads but denies direct authenticated writes", () => {
  for (const table of ["trust_dimension_scores", "trust_score_history"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon,authenticated`));
    assert.match(sql, new RegExp(`grant select on public\\.${table} to authenticated`));
  }
  assert.match(sql, /user_can_access_trust_workspace\(tenant_id\)/);
  assert.doesNotMatch(sql, /grant (insert|update|delete).*authenticated/i);
});

test("atomic persistence is service-only, tenant-checked, and version-checked", () => {
  assert.match(sql, /create or replace function public\.persist_trust_dna_v2/);
  assert.match(sql, /auth\.role\(\) <> 'service_role'/);
  assert.match(sql, /where tenant_id=tenant and id=entity and status <> 'DELETED'/);
  assert.match(sql, /Trust DNA version conflict/);
  assert.match(sql, /revoke all on function public\.persist_trust_dna_v2\(jsonb,jsonb\)[\s\S]*anon,authenticated/);
  assert.match(sql, /grant execute on function public\.persist_trust_dna_v2\(jsonb,jsonb\)[\s\S]*service_role/);
});
