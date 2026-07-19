import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evidenceDisplayLabel, identityRequestUiState, identityUiStates, isStrictVerifiedEvidence } from "../lib/identity-signals/presentation.ts";
import { externalControlTruth } from "../lib/operations/external-control-truth.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [dashboard, detail, providers, operations, dashboardApi, providerApi, healthApi, operationsApi, context, middleware, capabilityTruth] = await Promise.all([
  read("components/identity-signals/identity-dashboard.tsx"),
  read("components/identity-signals/verification-detail.tsx"),
  read("components/identity-signals/provider-operations.tsx"),
  read("components/identity-signals/operations-status.tsx"),
  read("app/api/identity/verifications/route.ts"),
  read("app/api/identity/providers/route.ts"),
  read("app/api/identity/providers/health/route.ts"),
  read("app/api/operations/status/route.ts"),
  read("lib/identity-signals/enterprise-context.ts"),
  read("middleware.ts"),
  read("lib/providers/capability-truth.ts"),
]);

test("dashboard renders persisted API data and all required operational states", () => {
  assert.match(dashboard, /fetch\(`\/api\/identity\/verifications\?page=/);
  assert.match(dashboardApi, /dashboardSnapshot/);
  for (const state of identityUiStates) assert.match(`${dashboard}\n${detail}`, new RegExp(`data-state=[{\"]+${state}|\"${state}\"`));
  for (const field of ["evidenceCount", "verifiedEvidenceCount", "warningCount", "providerErrors", "reasonCodes", "updatedAt"]) assert.match(dashboard, new RegExp(field));
  assert.match(dashboard, /pageSize=20/);
  assert.match(dashboard, /Identity verification pagination/);
  assert.doesNotMatch(dashboard, /success rate|uptime|99\.9|sample data|mock/i);
});

test("request-state classification preserves partial, completed, failed and blocked truth", () => {
  assert.equal(identityRequestUiState("RUNNING"), "partial");
  assert.equal(identityRequestUiState("COMPLETED", ["PASS"]), "completed");
  assert.equal(identityRequestUiState("FAILED"), "failed");
  assert.equal(identityRequestUiState("PARTIAL", ["BLOCKED", "UNAVAILABLE"]), "blocked");
});

test("verification detail keeps evidence separate and exposes the required safe fields", () => {
  assert.match(detail, /\/api\/identity\/verifications\/\$\{verificationId\}/);
  for (const field of ["provider_id", "signal_type", "signal_status", "server_verified", "signature_verified", "provider_reference", "provider_event_id", "observed_at", "expires_at", "reason_codes", "provenance"]) assert.match(detail, new RegExp(field));
  assert.match(detail, /Mixed evidence is never collapsed/);
  assert.doesNotMatch(detail, />Verified</);
});

test("Hopae signed presentation requires every persisted verification prerequisite", () => {
  const complete = { provider_id: "hopae_connect", signal_status: "PASS", outcome: "VERIFIED", server_verified: true, signature_verified: true, provider_reference: "ref", provider_transaction_id: "transaction", source_digest: "digest" };
  assert.equal(isStrictVerifiedEvidence(complete), true);
  for (const missing of ["server_verified", "signature_verified", "provider_reference", "provider_transaction_id", "source_digest"]) assert.equal(isStrictVerifiedEvidence({ ...complete, [missing]: missing.endsWith("verified") ? false : null }), false, `${missing} must be required`);
  assert.equal(evidenceDisplayLabel(complete), "Signed and server verified");
  assert.match(providerApi, /signature_verified === true/);
  assert.match(providerApi, /provider_reference/);
  assert.match(providerApi, /source_digest/);
});

test("World ID and placeholder providers cannot display positive verification capability", () => {
  const world = { provider_id: "world_id", signal_status: "PASS", outcome: "VERIFIED", server_verified: true, signature_verified: true, provider_reference: "ref", provider_transaction_id: "tx", source_digest: "digest" };
  assert.equal(evidenceDisplayLabel(world), "Proof received — server verification pending");
  assert.match(detail, /Proof received — server verification pending/);
  assert.match(providers, /Server verification not implemented/);
  assert.match(healthApi, /WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED/);
  assert.match(healthApi, /serverVerificationCapability: false/);
  assert.match(healthApi, /transactionalReadiness: false/);
});

test("provider capability and health views expose staged truth without unsafe output", () => {
  for (const state of ["REGISTERED", "CONFIGURED", "AVAILABLE", "TRANSACTIONAL", "SIGNED", "SERVER_VERIFIED", "DEGRADED", "DISABLED", "BLOCKED"]) assert.match(`${providers}\n${providerApi}\n${capabilityTruth}`, new RegExp(state));
  for (const field of ["lastCheck", "responseTimeMs", "transactionalReadiness", "signatureCapability", "serverVerificationCapability", "reasonCodes", "blockers"]) assert.match(`${providers}\n${healthApi}`, new RegExp(field));
  assert.doesNotMatch(healthApi, /rawBody|raw_payload|apiKey|serviceRoleKey|webhookSecret|error\.message/);
  assert.match(providers, /Secrets, raw provider responses and raw error bodies are not returned/);
});

test("operations status never infers external production controls", () => {
  const controls = externalControlTruth();
  for (const control of controls) assert.equal(control.state, "BLOCKED_BY_EXTERNAL_CONFIGURATION");
  assert.match(operationsApi, /externalControlTruth/);
  for (const marker of ["vercel-production-branch", "vercel-environment", "cloudflare-waf", "cloudflare-dnssec", "cloudflare-bot-controls", "supabase-migrations", "supabase-production-rls"]) assert.ok(controls.some((control) => control.id === marker));
  for (const state of ["VERIFIED FROM RUNTIME", "VERIFIED FROM REPOSITORY", "BLOCKED BY EXTERNAL CONFIGURATION", "NOT CONFIGURED"]) assert.match(operations, new RegExp(state));
  assert.doesNotMatch(operationsApi, /request\.json|searchParams|get\("evidence"\)/);
});

test("identity UI and operations APIs enforce authentication and tenant authorization", async () => {
  for (const route of [dashboardApi, providerApi, healthApi, operationsApi]) assert.match(route, /resolveIdentityEnterprise\(request/);
  assert.match(context, /supabase\.auth\.getUser/);
  assert.match(context, /trust_workspaces/);
  assert.match(context, /workspace_members/);
  assert.match(context, /Enterprise access denied/);
  assert.match(middleware, /"\/dashboard"/);
  const pages = await Promise.all([read("app/dashboard/identity/page.tsx"), read("app/dashboard/identity/providers/page.tsx"), read("app/dashboard/identity/operations/page.tsx"), read("app/dashboard/identity/verifications/[id]/page.tsx")]);
  for (const page of pages) assert.match(page, /redirect\("?`?\/login\?next=/);
});

test("identity surfaces expose semantic, keyboard and loading contracts", () => {
  for (const source of [dashboard, providers]) {
    assert.match(source, /<table/);
    assert.match(source, /<caption/);
    assert.match(source, /scope="col"/);
    assert.match(source, /overflow-x-auto/);
    assert.match(source, /tabIndex=\{0\}/);
  }
  for (const source of [dashboard, detail, providers, operations]) {
    assert.match(source, /aria-/);
    assert.match(source, /aria-busy="true"/);
    assert.match(source, /role="alert"/);
  }
  assert.match(dashboard, /min-h-11/);
  assert.match(detail, /<h2/);
  assert.match(detail, /<h3/);
  assert.doesNotMatch(`${dashboard}\n${detail}\n${providers}\n${operations}`, /onClick=\{\(\) => window|dangerouslySetInnerHTML/);
});
