import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const canonical = await readFile(new URL("../src/lib/trust-transaction/canonical.ts", import.meta.url), "utf8");
const server = await readFile(new URL("../lib/trust-transaction/server.ts", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/trust/transactions/[transactionId]/outcome-review/route.ts", import.meta.url), "utf8");
const receiptRoute = await readFile(new URL("../app/api/trust/transactions/[transactionId]/receipt/route.ts", import.meta.url), "utf8");
const forward = await readFile(new URL("../supabase/migrations/20260907120000_add_decision_outcome_review_to_canonical_trust.sql", import.meta.url), "utf8");
const canonicalFoundation = await readFile(new URL("../supabase/migrations/202608060002_end_to_end_trust_transaction.sql", import.meta.url), "utf8");

test("decision outcome evidence remains an additive fact set", () => {
  for (const field of [
    "originalDecision",
    "decisionModelProvider",
    "decisionModelName",
    "decisionModelVersion",
    "policyVersion",
    "decisionReasonCodes",
    "humanOverride",
    "providerOutcome",
    "runtimeOutcome",
    "destinationOutcome",
    "adjudicatedOutcome",
    "evaluationStatus",
  ]) assert.match(canonical, new RegExp(`\\b${field}\\b`), field);
  assert.match(canonical, /decisionModelProvider: string \| null/);
  assert.match(canonical, /decisionModelName: string \| null/);
  assert.match(canonical, /decisionModelVersion: string \| null/);
  assert.doesNotMatch(canonical, /adjudicatedOutcome:\s*canonicalOutcome/);
});

test("the review endpoint derives tenant, original decision, policy and reason codes from persisted server state", () => {
  assert.doesNotMatch(route, /tenantId|enterpriseId|decisionId/);
  assert.match(server, /const tenant = await resolveSessionTenant\(input\.supabase, input\.user\)/);
  assert.match(server, /\.eq\("enterprise_id", tenant\.id\)\s*\.eq\("transaction_id", input\.transactionId\)/);
  assert.match(server, /decision: String\(transaction\.data\.decision\)/);
  assert.match(server, /policyVersion: String\(transaction\.data\.policy_version\)/);
  assert.match(server, /reasonCodes: Array\.isArray\(transaction\.data\.reason_codes\)/);
});

test("tenant A cannot read or directly mutate tenant B decision review under RLS", () => {
  assert.match(canonicalFoundation, /alter table public\.%I enable row level security/);
  assert.match(canonicalFoundation, /revoke all on public\.%I from public,anon,authenticated/);
  assert.match(canonicalFoundation, /grant select on public\.%I to authenticated/);
  assert.match(canonicalFoundation, /using\(public\.user_can_access_trust_workspace\(enterprise_id\)\)/);
  assert.match(server, /canonical_trust_transactions"\)\.select\("\*"\)\.eq\("enterprise_id", tenant\.id\)\.eq\("transaction_id", input\.transactionId\)/);
  assert.doesNotMatch(forward, /grant execute[^;]+attach_canonical_decision_outcome_review_v1[^;]+to\s+authenticated/i);
});

test("cross-tenant transaction and decision references are rejected", () => {
  assert.match(forward, /where enterprise_id=p_enterprise_id and transaction_id=p_transaction_id/);
  assert.match(forward, /Cross-tenant transaction reference rejected/);
  assert.match(forward, /Cross-tenant or mismatched decision reference rejected/);
  assert.match(forward, /p_review->>'originalDecision'<>tx\.decision/);
  assert.match(forward, /p_review->>'policyVersion'<>tx\.policy_version/);
  assert.match(forward, /Previous transaction tenant mismatch/);
  assert.match(canonicalFoundation, /foreign key\(enterprise_id,previous_transaction_id\) references public\.canonical_trust_transactions\(enterprise_id,transaction_id\)/);
});

test("late review persistence appends Replay chronology and Trust Memory without changing decision", () => {
  const start = forward.indexOf("create or replace function public.attach_canonical_decision_outcome_review_v1");
  const definition = forward.slice(start, forward.indexOf("end $$;", start));
  assert.match(definition, /set decision_outcome_review=p_review,updated_at=now\(\)/);
  assert.doesNotMatch(definition, /set[^;]*\bdecision\s*=/i);
  assert.match(definition, /'DECISION_OUTCOME_REVIEW_ATTACHED'/);
  assert.match(definition, /'DECISION_OUTCOME_REVIEW'/);
  assert.match(definition, /'originalDecision',tx\.decision/);
  assert.match(definition, /'adjudicatedOutcome',p_review->'adjudicatedOutcome'/);
  assert.match(definition, /'humanOverride',p_review->'humanOverride'/);
});

test("persisted review is reconstructed into receipts and portable Replay output", () => {
  assert.match(server, /decisionOutcomeReview: row\.decision_outcome_review/);
  assert.match(receiptRoute, /decisionOutcomeReview: receipt\.decisionOutcomeReview/);
  assert.match(forward, /'decisionOutcomeReview',tx\.decision_outcome_review/);
});
