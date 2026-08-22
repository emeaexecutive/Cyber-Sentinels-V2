import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pendingMigration = await readFile(
  new URL("../supabase/migrations/20260820085027_vale_canonical_provider_preview.sql", import.meta.url),
  "utf8",
);
const reconciliationMigration = await readFile(
  new URL("../supabase/migrations/20260821174100_reconcile_canonical_persist_search_path.sql", import.meta.url),
  "utf8",
);

function canonicalFunction(sql) {
  const match = sql.match(
    /create or replace function public\.persist_canonical_trust_transaction_decision_v1\(p_transaction jsonb,p_decision jsonb\)([\s\S]*?)end \$\$;/i,
  );
  assert.ok(match, "canonical persistence function definition must be present");
  return match[0];
}

function normalized(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

test("canonical persistence keeps pgcrypto resolvable in the pending and forward migrations", () => {
  const pending = canonicalFunction(pendingMigration);
  const reconciliation = canonicalFunction(reconciliationMigration);

  for (const definition of [pending, reconciliation]) {
    assert.match(definition, /security definer\s+set search_path\s*=\s*public\s*,\s*extensions\s+as \$\$/i);
    assert.doesNotMatch(definition, /set search_path\s*=\s*public\s+as \$\$/i);
    assert.match(definition, /digest\(event_payload::text\s*,\s*'sha256'\)/i);
  }

  assert.equal(normalized(reconciliation), normalized(pending));
});

test("forward reconciliation preserves least-privilege execution grants", () => {
  assert.match(reconciliationMigration, /revoke all on function public\.persist_canonical_trust_transaction_decision_v1\(jsonb,jsonb\) from public,anon,authenticated;/i);
  assert.match(reconciliationMigration, /grant execute on function public\.persist_canonical_trust_transaction_decision_v1\(jsonb,jsonb\) to service_role;/i);
  assert.doesNotMatch(reconciliationMigration, /grant execute[\s\S]*to\s+(?:public|anon|authenticated)\b/i);
});
