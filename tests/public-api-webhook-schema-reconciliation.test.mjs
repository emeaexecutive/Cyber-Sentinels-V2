import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20260903093116_reconcile_public_api_webhook_event_types.sql", import.meta.url),
  "utf8",
);
const executableSql = migration.replace(/^\s*--.*$/gm, "");

const eventTypes = [
  "decision.created",
  "decision.review_required",
  "decision.denied",
  "authority.changed",
  "monitoring.coverage_gap",
  "deployment.reauthorization_required",
  "intent.execution_mismatch",
  "execution.outcome",
  "data.impact_detected",
  "receipt.available",
  "authority.revoked",
  "trust.material_change",
  "outcome.contradiction",
];

test("webhook reconciliation restores the complete canonical event vocabulary", () => {
  assert.match(migration, /alter table public\.public_api_webhook_events/i);
  assert.match(migration, /drop constraint if exists public_api_webhook_events_event_type_check/i);
  assert.match(migration, /add constraint public_api_webhook_events_event_type_check/i);
  assert.match(migration, /not valid/i);
  assert.match(migration, /validate constraint public_api_webhook_events_event_type_check/i);

  for (const eventType of eventTypes) {
    assert.match(migration, new RegExp(`'${eventType.replaceAll(".", "\\.")}'`));
  }
});

test("webhook reconciliation cannot weaken access controls or mutate retained rows", () => {
  assert.doesNotMatch(executableSql, /\b(?:grant|revoke)\b/i);
  assert.doesNotMatch(executableSql, /\b(?:enable|disable)\s+row\s+level\s+security\b/i);
  assert.doesNotMatch(executableSql, /\b(?:insert|update|delete|truncate)\b/i);
  assert.doesNotMatch(executableSql, /\bdrop\s+(?:table|column)\b/i);
});
