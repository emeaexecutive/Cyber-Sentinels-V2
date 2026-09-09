import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const historicalMigrationA = await readFile(
  new URL("../supabase/migrations/20260820085027_vale_canonical_provider_preview.sql", import.meta.url),
  "utf8",
);
const historicalMigrationB = await readFile(
  new URL("../supabase/migrations/20260821174100_reconcile_canonical_persist_search_path.sql", import.meta.url),
  "utf8",
);
const forwardMigration = await readFile(
  new URL("../supabase/migrations/20260907120000_add_decision_outcome_review_to_canonical_trust.sql", import.meta.url),
  "utf8",
);

function canonicalFunction(sql) {
  const match = sql.match(
    /create or replace function public\.persist_canonical_trust_transaction_decision_v1\(p_transaction jsonb,p_decision jsonb\)([\s\S]*?)end \$\$;/i,
  );
  assert.ok(match, "canonical persistence function definition must be present");
  return match[0];
}

test("historical canonical migrations remain unchanged", () => {
  assert.match(historicalMigrationA, /create or replace function public\.persist_canonical_trust_transaction_decision_v1/i);
  assert.match(historicalMigrationB, /create or replace function public\.persist_canonical_trust_transaction_decision_v1/i);
  assert.doesNotMatch(historicalMigrationA, /decision_outcome_review/i);
  assert.doesNotMatch(historicalMigrationB, /decision_outcome_review/i);
});

test("forward migration adds decision-outcome review persistence support", () => {
  const definition = canonicalFunction(forwardMigration);
  assert.match(definition, /security definer\s+set search_path\s*=\s*public\s*,\s*extensions\s+as \$\$/i);
  assert.match(forwardMigration, /add column if not exists decision_outcome_review jsonb/i);
  assert.match(forwardMigration, /p_transaction->'decisionOutcomeReview'/i);
  assert.match(forwardMigration, /decision_outcome_review->>'originalDecision'\s*=\s*decision/i);
  assert.match(forwardMigration, /decision_outcome_review->>'evaluationStatus'\s+in\s*\(\s*'SUPPORTED',\s*'CONTRADICTED',\s*'HUMAN_OVERRIDDEN',\s*'PARTIALLY_SUPPORTED',\s*'UNRESOLVED'/i);
  assert.match(forwardMigration, /decision_outcome_review->>'adjudicatedOutcome'\s+in\s*\('ALLOW','REVIEW','DENY'\)/i);
  assert.doesNotMatch(forwardMigration, /adjudicatedOutcome'\s*=\s*decision/i);
});

test("forward migration projects separate original and adjudicated outcomes into Replay", () => {
  assert.match(forwardMigration, /create or replace function public\.append_canonical_trust_transaction_replay_v1/i);
  assert.match(forwardMigration, /'originalDecision',tx\.decision/i);
  assert.match(forwardMigration, /'policyVersion',tx\.policy_version/i);
  assert.match(forwardMigration, /'decisionReasonCodes',to_jsonb\(tx\.reason_codes\)/i);
  assert.match(forwardMigration, /'decisionOutcomeReview',tx\.decision_outcome_review/i);
  assert.match(forwardMigration, /immutable original decision and separately retained outcome review/i);
});

test("forward migration links original decision, action, observations and adjudication in Trust Memory", () => {
  assert.match(forwardMigration, /create or replace function public\.emit_canonical_trust_transaction_memory_v1/i);
  for (const field of ["originalDecision", "action", "observedOutcomes", "providerOutcome", "runtimeOutcome", "destinationOutcome", "laterAdjudication", "adjudicatedOutcome", "humanOverride", "evaluationStatus"]) {
    assert.match(forwardMigration, new RegExp(`'${field}'`), field);
  }
  assert.match(forwardMigration, /without rewriting the original decision/i);
});

test("forward migration scopes Replay and Trust Memory projections to the tenant transaction", () => {
  for (const functionName of ["append_canonical_trust_transaction_replay_v1", "emit_canonical_trust_transaction_memory_v1"]) {
    const start = forwardMigration.indexOf(`create or replace function public.${functionName}`);
    assert.notEqual(start, -1, functionName);
    const definition = forwardMigration.slice(start, forwardMigration.indexOf("end $$;", start));
    assert.match(definition, /where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id/i);
    assert.match(definition, /tx\.actor_id<>p_actor_id or tx\.correlation_id<>p_correlation_id/i);
  }
});

test("forward migration preserves least-privilege execution grants", () => {
  assert.match(forwardMigration, /revoke all on function public\.persist_canonical_trust_transaction_decision_v1\(jsonb,jsonb\) from public,anon,authenticated;/i);
  assert.match(forwardMigration, /grant execute on function public\.persist_canonical_trust_transaction_decision_v1\(jsonb,jsonb\) to service_role;/i);
  assert.doesNotMatch(forwardMigration, /grant execute[^;]+to\s+(?:public|anon|authenticated)\b/i);
});
