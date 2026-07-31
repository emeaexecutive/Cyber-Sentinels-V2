import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql=readFileSync(new URL("../../supabase/migrations/202607310001_environment_attestation_scope_continuity.sql",import.meta.url),"utf8");

test("migration creates the canonical Scope Continuity relational model",()=>{for(const table of ["execution_context_declarations","environment_attestations","scope_authorization_leases","scope_continuity_decisions","scope_decision_attestations","context_contradiction_events","scope_continuity_reviewer_actions"])assert.match(sql,new RegExp(`public\\.${table}`));});
test("every new table enables RLS and denies anonymous or direct authenticated writes",()=>{assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.%I from anon,authenticated/);assert.doesNotMatch(sql,/for insert to authenticated|for update to authenticated|for all to authenticated/i);});
test("tenant reads use canonical workspace authorization",()=>{assert.equal((sql.match(/user_can_access_trust_workspace\(enterprise_id\)/g)??[]).length,7);});
test("composite foreign keys reject cross-enterprise evidence attachment",()=>{assert.match(sql,/foreign key\(enterprise_id,execution_context_id\)/);assert.match(sql,/foreign key\(enterprise_id,attestation_id\)/);assert.match(sql,/foreign key\(enterprise_id,authorization_id\)/);assert.match(sql,/Cross-tenant attestation reference rejected/);});
test("unauthenticated and client-side service-role paths are denied",()=>{assert.match(sql,/auth\.role\(\)<>\'service_role\'/);assert.match(sql,/revoke all on function public\.persist_scope_continuity_decision_v1[^;]+from public,anon,authenticated/s);assert.match(sql,/grant execute on function public\.persist_scope_continuity_decision_v1[^;]+to service_role/s);});
test("evidence and decisions are append-only with superseding corrections",()=>{assert.match(sql,/prevent_scope_continuity_history_mutation/);assert.match(sql,/supersedes_attestation_id/);assert.match(sql,/supersedes_lease_id/);assert.match(sql,/supersedes_action_id/);});
test("idempotency and correlation are tenant-scoped",()=>{assert.match(sql,/unique\(enterprise_id,execution_context_id,correlation_id\)/);assert.match(sql,/idempotentReplay/);});
test("provider assertions and cryptographic claims are constrained",()=>{assert.match(sql,/provider_or_third_party_identity is not null/);assert.match(sql,/signatureVerified.*true/);});
test("Replay is a security-invoker projection and does not contain an external-action branch",()=>{assert.match(sql,/scope_continuity_replay with \(security_invoker=true\)/);assert.doesNotMatch(sql,/'external_action'/);});
test("migration is additive and contains no remote execution command",()=>{assert.doesNotMatch(sql,/\b(drop table|truncate table|delete from)\b|supabase db push|psql\s/i);});
