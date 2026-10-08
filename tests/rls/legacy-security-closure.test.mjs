import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { approvalBoundary } from "../../lib/auth/approval-boundary.ts";

const migration = await readFile(new URL("../../supabase/migrations/202610040001_p0p1_security_closure.sql", import.meta.url), "utf8");
const approvalMigration = await readFile(new URL("../../supabase/migrations/202610040002_account_access_approval.sql", import.meta.url), "utf8");
const middleware = await readFile(new URL("../../middleware.ts", import.meta.url), "utf8");
const approvalPage = await readFile(new URL("../../app/admin/access-approvals/page.tsx", import.meta.url), "utf8");
const certificationRoute = await readFile(new URL("../../app/api/trust/certifications/route.ts", import.meta.url), "utf8");
const publicApiAuth = await readFile(new URL("../../lib/public-api/v1/authentication.ts", import.meta.url), "utf8");
const passportDecisionRoute = await readFile(new URL("../../app/api/passports/[id]/decision/route.ts", import.meta.url), "utf8");
const passportDecisionMigration = await readFile(new URL("../../supabase/migrations/202610040004_lock_legacy_passport_decision_writes.sql", import.meta.url), "utf8");
const affectedTables = [
  "ai_agents", "api_keys", "audit_logs", "autonomy_profiles", "data_rights_requests",
  "decisions", "enterprise_access_requests", "evidence_files", "execution_passports",
  "feedback_reports", "help_questions", "intent_requests", "interest_signals",
  "knowledge_articles", "passport_state_checks", "passports", "provenance_events",
  "risk_scores", "signals", "system_health_checks", "team_members", "teams",
  "trust_alerts", "trust_algorithm_runs", "trust_assistant_questions", "trust_certifications",
  "trust_graph_edges", "trust_graph_nodes", "trust_reports", "verification_cases",
  "verification_passports", "verifiers", "waitlist",
];

test("migration covers every legacy table found with a permissive authenticated policy", () => {
  const tableArray = migration.match(/affected_tables text\[\] := array\[([\s\S]*?)\];/)?.[1] ?? "";
  for (const table of affectedTables) assert.match(tableArray, new RegExp(`'${table}'`));
  assert.match(migration, /'authenticated' = any\(roles\)/);
  assert.match(migration, /revoke all on table public\.%I from authenticated/);
});

test("sensitive legacy rows are gated by owner, parent, or active team membership", () => {
  for (const identifier of [
    "ai agents owner access", "api keys owner read", "decisions owner access",
    "evidence files owner access", "passports owner access", "trust reports owner access",
    "verification cases owner access", "signals owner access", "teams read by active members",
  ]) assert.match(migration, new RegExp(identifier, "i"));
  assert.match(migration, /security_closure_team_member\(p_team_id text\)/);
  assert.match(migration, /security_closure_passport_owner\(p_passport_id uuid\)/);
  assert.match(migration, /security_closure_case_owner\(p_case_id uuid\)/);
});

test("enterprise access requests cannot be inserted directly by anon or authenticated users", () => {
  assert.match(migration, /revoke all on table public\.enterprise_access_requests from anon, authenticated/i);
  assert.match(migration, /revoke insert \([\s\S]*?\) on public\.enterprise_access_requests from anon/i);
  assert.doesNotMatch(migration, /grant\s+insert[\s\S]{0,120}enterprise_access_requests\s+to\s+(?:anon|authenticated)/i);
});

test("evidence storage is private and owner-scoped for read, upload, replace, and delete", () => {
  assert.match(migration, /update storage\.buckets set public = false where id = 'evidence-files'/i);
  for (const operation of ["read", "upload", "replace", "delete"]) {
    assert.match(migration, new RegExp(`evidence objects owner ${operation}`, "i"));
  }
  assert.ok((migration.match(/security_closure_evidence_object_owner\(name\)/g) ?? []).length >= 5);
});

test("protected product access requires server-side approval and keeps admin authority separate", () => {
  assert.match(approvalMigration, /status text not null default 'PENDING'/i);
  for (const status of ["PENDING", "APPROVED", "DENIED", "SUSPENDED", "REVOKED"]) {
    assert.match(approvalMigration, new RegExp(`'${status}'`));
  }
  assert.match(middleware, /from\("account_access_approvals"\)/);
  assert.match(middleware, /approval\?\.status === "APPROVED"/);
  assert.match(middleware, /record_account_access_attempt/);
  assert.match(middleware, /redirectTo\(req, "\/access-pending"\)/);
  assert.match(approvalPage, /requireAdminPageAccess/);
  assert.match(approvalPage, /createServiceRoleClient/);
  for (const event of ["ACCESS_REQUESTED", "ACCESS_APPROVED", "ACCESS_DENIED", "ACCESS_REVOKED", "BLOCKED_LOGIN_ATTEMPT", "SUCCESSFUL_APPROVED_LOGIN"]) {
    assert.match(approvalMigration, new RegExp(event));
  }
});

test("customer certification requests cannot self-issue or self-approve", () => {
  assert.match(certificationRoute, /status:\s*"pending"/);
  assert.match(certificationRoute, /trust_score:\s*50/);
  assert.doesNotMatch(certificationRoute, /status:\s*text\(body\.status/);
  assert.doesNotMatch(certificationRoute, /trust_score:\s*score\(body\.trust_score/);
  assert.doesNotMatch(certificationRoute, /patch\.status/);
});

test("V1 API keys inherit their owner's account approval state", () => {
  assert.match(publicApiAuth, /from\("account_access_approvals"\)/);
  assert.match(publicApiAuth, /approval\.data\?\.status !== "APPROVED"/);
  assert.match(publicApiAuth, /ACCESS_APPROVAL_REQUIRED/);
  assert.match(publicApiAuth, /Account access status is temporarily unavailable/);
});

test("pre-approval bypasses are limited to transport, signed callbacks, and V1 API-key auth", () => {
  for (const [path, method] of [
    ["/api/ready", "GET"], ["/api/auth/logout", "POST"],
    ["/api/auth/password-reset/request", "POST"], ["/api/consent", "GET"],
    ["/api/consent", "PATCH"], ["/api/enterprise-access", "POST"],
  ]) assert.equal(approvalBoundary(path, method), "PUBLIC_TRANSPORT", `${method} ${path}`);
  for (const [path, method] of [
    ["/api/providers/hopae/callback", "POST"],
    ["/api/trust-events/ingest/hopae_connect", "POST"],
    ["/api/stripe/webhook", "POST"],
  ]) assert.equal(approvalBoundary(path, method), "SIGNED_CALLBACK", `${method} ${path}`);
  assert.equal(approvalBoundary("/api/v1/trust/transactions", "GET"), "API_KEY");
  for (const path of ["/api/workspaces", "/api/memberships", "/api/evidence", "/api/trust/memory"]) {
    assert.equal(approvalBoundary(path, "GET"), "CUSTOMER", path);
  }
});

test("legacy passport review decisions are admin-only and not customer-writable", () => {
  assert.match(passportDecisionRoute, /requireAdminApiAccess/);
  assert.match(passportDecisionRoute, /createServiceRoleClient/);
  assert.match(middleware, /passports.*decision/);
  assert.match(passportDecisionMigration, /revoke update on table public\.passports from authenticated/i);
});