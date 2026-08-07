import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/lib/trust-transaction/canonical.ts"), "utf8");
const server = fs.readFileSync(path.join(root, "lib/trust-transaction/server.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/trust/execute/route.ts"), "utf8");
const hopae = fs.readFileSync(path.join(root, "lib/providers/hopae-rc1-server.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/202608060002_end_to_end_trust_transaction.sql"), "utf8");
const page = fs.readFileSync(path.join(root, "app/trust/transactions/[transactionId]/page.tsx"), "utf8");

test("the service exposes one named boundary and every required pipeline stage", () => {
  for (const name of [
    "executeCanonicalTrustTransaction", "authenticateActor", "resolveTenantFromSession", "resolveTrustObject",
    "collectConfiguredEvidence", "validateEvidenceFreshness", "resolveAuthority", "validateAuthorityScope",
    "resolvePolicyVersion", "evaluateCanonicalTrustDecision", "persistDecision", "extendEvidenceGraph",
    "appendReplay", "emitMaterialTrustMemory", "requestExternalExecutionIfAllowed",
    "recordExternalAcknowledgement", "recordExternalOutcome", "returnSafeTransactionReceipt",
  ]) assert.match(source, new RegExp(`(?:function|const)\\s+${name}\\b`), name);
});

test("the public transaction input has no tenant field and the route accepts no tenant for canonical execution", () => {
  const inputBlock = source.slice(source.indexOf("export type CanonicalTrustTransactionInput"), source.indexOf("export type AuthenticatedTransactionActor"));
  assert.doesNotMatch(inputBlock, /tenantId|enterpriseId|workspaceId/);
  const canonicalRoute = route.slice(route.indexOf("const subjectType"));
  assert.doesNotMatch(canonicalRoute, /body\.(tenant_id|workspace_id|enterprise_id)/);
  assert.match(server, /active_enterprise_id/);
  assert.match(server, /resolveSessionTenant/);
});

test("Hopae preserves real provider event identifiers and no longer chooses tenant from request body", () => {
  assert.match(hopae, /eventId: envelope\.eventId/);
  assert.match(hopae, /sourceDigest/);
  assert.match(hopae, /resolveWorkspaceFromSession/);
  assert.doesNotMatch(hopae, /const workspaceId = requiredReference\(input\.body\.(tenant_id|workspace_id)/);
  assert.match(server, /normalized_identity_evidence/);
  assert.match(server, /provider_event_id/);
  assert.match(server, /PROVIDER_EVIDENCE_SUBJECT_MISMATCH/);
  assert.match(server, /\.eq\("entity_id", subjectId\)/);
});

test("persistence is tenant-scoped, idempotent and gates external execution on ALLOW", () => {
  assert.match(migration, /unique\(enterprise_id,idempotency_key\)/);
  assert.match(migration, /Canonical transaction idempotency conflict/);
  for (const field of ["actor_id", "subject_type", "subject_id", "action_type", "action_purpose", "action_resource", "action_environment", "request_digest"]) {
    assert.match(migration, new RegExp(`existing\\.${field}<>`));
  }
  assert.match(migration, /tx\.decision<>'ALLOW'/);
  assert.match(migration, /public\.user_can_access_trust_workspace\(enterprise_id\)/);
  assert.match(migration, /correlation_id uuid not null/g);
  assert.match(migration, /previous_transaction_id/);
  assert.match(migration, /changed_conditions/);
});

test("acknowledgements and outcomes are separate append-only records", () => {
  assert.match(migration, /create table public\.external_action_acknowledgements/);
  assert.match(migration, /create table public\.external_action_outcomes/);
  assert.match(migration, /acknowledgement must never be represented as an external action outcome/);
  assert.match(migration, /outcome in \('SUCCEEDED','FAILED','UNKNOWN'\)/);
  assert.match(migration, /external_action_acknowledgements_append_only/);
  assert.match(migration, /external_action_outcomes_append_only/);
});

test("Trust Memory is rejected for non-material transactions and history is available in one UI", () => {
  assert.match(migration, /not tx\.material_change then raise exception 'Non-material Trust Memory write rejected'/);
  assert.match(source, /record\.materialChange \? dependencies\.emitTrustMemory\(record\) : null/);
  assert.match(page, /Every stage points to stored evidence/);
  assert.match(page, /Decision and execution are separate records/);
  assert.match(page, /Provider evidence/);
  assert.match(source, /historyUrl: `\/trust\/transactions\/\$\{persisted\.transactionId\}`/);
});

test("the old caller-controlled runtime signal fallback is not reachable from trust execution", () => {
  assert.doesNotMatch(route, /runtimeEngine\.executeRuntimeWorkflow/);
  for (const unsafe of ["identity_confidence", "proof_of_human", "session_integrity", "provider_signals", "evidence_refs"]) assert.doesNotMatch(route, new RegExp(`body\\.${unsafe}`));
});
