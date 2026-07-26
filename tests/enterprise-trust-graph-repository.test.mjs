import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/core/trust/repositories/supabase.ts", import.meta.url),
  "utf8",
);

test("repository uses one atomic mutation RPC for records and events", () => {
  assert.match(source, /mutate_trust_graph_v1/);
  for (const action of [
    "CREATE_ENTITY",
    "UPDATE_ENTITY",
    "DELETE_ENTITY",
    "ATTACH_EVIDENCE",
    "CREATE_RELATIONSHIP",
    "REMOVE_RELATIONSHIP",
    "UPDATE_PROVIDER",
  ]) assert.match(source, new RegExp(`\"${action}\"`), action);
});

test("repository scopes every graph table read by tenant", () => {
  for (const table of [
    "trust_entities",
    "trust_evidence",
    "trust_relationships",
    "trust_sources",
    "trust_graph_events",
  ]) assert.match(source, new RegExp(`from\\(\"${table}\"\\)[\\s\\S]{0,260}eq\\(\"tenant_id\"`), table);
});

test("neighbour and timeline loading avoid per-row N+1 queries", () => {
  assert.match(source, /\.or\(`source_entity\.eq\.\$\{entityId\},target_entity\.eq\.\$\{entityId\}`\)/);
  assert.match(source, /\.in\(\"id\", entityIds\)/);
  assert.match(source, /Promise\.all\(\[/);
  assert.doesNotMatch(source, /for\s*\([^)]*\)\s*await readClient/);
});

test("email and device correlation query only hashed match keys", () => {
  assert.match(source, /\^\[a-f0-9\]\{64\}\$/);
  assert.match(source, /\.contains\(\"metadata\", \{ matchKeyHash \}\)/);
});
