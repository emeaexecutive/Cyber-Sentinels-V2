import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [legacy, graph, repository, service, scopeIntegration, incidentMigration, reconciliation, manifestText] = await Promise.all([
  read("../supabase/migrations/202606080001_trust_relationships.sql"),
  read("../supabase/migrations/202607230002_enterprise_trust_graph.sql"),
  read("../src/core/trust/repositories/supabase.ts"),
  read("../src/core/trust/graph/service.ts"),
  read("../src/lib/scope-continuity/integrations.ts"),
  read("../supabase/migrations/202608010001_ai_serious_incident_regulatory_lineage.sql"),
  read("../docs/TRUST_RELATIONSHIPS_SCHEMA_RECONCILIATION.md"),
  read("../supabase/release/epic-26-27/manifest.json"),
]);

test("applied legacy and pending Enterprise graph relationships have distinct names", () => {
  assert.match(legacy, /create table if not exists public\.trust_relationships/i);
  assert.doesNotMatch(legacy, /trust_graph_relationships_v2/);
  assert.match(graph, /create table public\.trust_graph_relationships_v2/i);
  assert.doesNotMatch(graph, /(?:create table|alter table|on|into|update|from) public\.trust_relationships\b/i);
});

test("Enterprise graph consumers use only the tenant entity relationship table", () => {
  assert.equal((repository.match(/\.from\("trust_graph_relationships_v2"\)/g) ?? []).length, 2);
  assert.doesNotMatch(repository, /\.from\("trust_relationships"\)/);
  assert.match(graph, /relationship_row public\.trust_graph_relationships_v2%rowtype/);
  assert.match(graph, /insert into public\.trust_graph_relationships_v2/);
  assert.match(graph, /update public\.trust_graph_relationships_v2 set/);
});

test("relationship persistence is tenant safe, service written, and soft removed", () => {
  assert.match(graph, /foreign key\(tenant_id,source_entity\)[\s\S]{0,100}references public\.trust_entities\(tenant_id,id\)/);
  assert.match(graph, /foreign key\(tenant_id,target_entity\)[\s\S]{0,100}references public\.trust_entities\(tenant_id,id\)/);
  assert.match(graph, /check\(source_entity<>target_entity\)/);
  assert.match(graph, /where removed_at is null/);
  assert.match(graph, /alter table public\.%I enable row level security/);
  assert.match(graph, /revoke all on public\.%I from anon,authenticated/);
  assert.match(graph, /grant select on public\.%I to authenticated/);
  assert.match(graph, /user_can_access_trust_workspace\(tenant_id\)/);
  assert.match(graph, /Cross-tenant Trust Graph mutation denied/);
  assert.match(graph, /insert into public\.trust_graph_events/);
  assert.match(service, /Self relationships are not permitted/);
});

test("canonical edge directions and lifecycle vocabulary stay explicit", () => {
  for (const direction of [
    ["AUTHORIZED_BY", /type: "AUTHORIZED_BY", from: authorization\.id, to: authorization\.approverId/],
    ["OBSERVED_BY", /"OBSERVED_BY" as const, from: item\.id, to: item\.attestationSourceId/],
    ["CONTRADICTS", /from: item\.id, to: declaration\.id, type: decision\.contradictions\.length \? "CONTRADICTS"/],
    ["RESULTED_IN", /from: item\.id, to: decision\.id, type: "RESULTED_IN"/],
  ]) assert.match(scopeIntegration, direction[1], direction[0]);

  for (const edge of ["SUPERSEDES", "REVIEWED_BY", "AFFECTED", "REMEDIATED_BY", "SUBMITTED_TO"]) {
    assert.match(incidentMigration, new RegExp(`'${edge}'`), edge);
  }
  assert.doesNotMatch(service, /confidence[^\n]{0,80}evidenceStrength/i);
});

test("historical immutability exception is narrow and hash bound", () => {
  const manifest = JSON.parse(manifestText);
  const correction = manifest.historicalCorrections.find((entry) => entry.path.endsWith("202607230002_enterprise_trust_graph.sql"));
  assert.ok(correction);
  assert.equal(correction.originalCommit, "4f817901a638eada170efd6fdd21202a8e33862d");
  assert.equal(correction.originalSha256, "58898a9803e3c097d418c3f5e7661cf89f756f868d01be6961a8344c0c10b18c");
  assert.match(correction.applicationProof, /remote-blank|never durably applied/i);
  assert.match(correction.scope, /name separation only/i);
  assert.equal(correction.dataMigrationRequired, false);
  assert.equal(correction.productionLedgerRepairRequired, false);
  assert.match(reconciliation, /original remains recoverable through Git history/i);
  assert.doesNotMatch(graph, /drop\s+table|truncate\s+|delete\s+from/i);
});
