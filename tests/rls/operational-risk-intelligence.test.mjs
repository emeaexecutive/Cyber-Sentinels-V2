import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../../supabase/migrations/202607170001_operational_risk_intelligence_shadow.sql", import.meta.url), "utf8");
const reviewRoute = await readFile(new URL("../../app/api/admin/reviews/route.ts", import.meta.url), "utf8");

test("ORI migration enables RLS, revokes client writes, and tenant-scopes reads", () => {
  for (const table of ["ori_model_registry", "ori_feature_registry", "ori_model_state_audit", "ori_inference_records", "ori_reviewer_outcomes"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(migration, /revoke all on public\.ori_model_registry from public, anon, authenticated/i);
  assert.match(migration, /revoke all on public\.ori_inference_records from public, anon, authenticated/i);
  assert.match(migration, /user_can_access_trust_workspace\(tenant_id\)/);
  assert.doesNotMatch(migration, /for all to authenticated\s+using \(true\)/i);
});

test("model activation and reviewer writes are service-role only and audited", () => {
  assert.match(migration, /grant all privileges on public\.ori_model_registry to service_role/i);
  assert.match(migration, /ori_model_state_change_audit/);
  assert.match(migration, /prevent_ori_reviewer_outcome_mutation/);
  assert.match(migration, /revoke all on function public\.record_ori_reviewer_outcome[\s\S]+from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.record_ori_reviewer_outcome[\s\S]+to service_role/i);
  assert.match(reviewRoute, /requireAdminApiAccess/);
});

test("database constraints prohibit authorization outputs and sensitive persistence fields", () => {
  assert.match(migration, /recommendation in \('NO_ADDITIONAL_ACTION', 'STEP_UP', 'HUMAN_REVIEW', 'ABSTAIN'\)/);
  assert.match(migration, /score between 0 and 1/);
  assert.match(migration, /Raw passports, biometrics, images, documents, provider payloads, email addresses, secrets, tokens/i);
  assert.doesNotMatch(migration, /raw_passport|biometric_template|api_secret|access_token/i);
});

test("client-selected tenant and raw model upload have no authenticated insert grant", () => {
  assert.doesNotMatch(migration, /grant\s+insert[\s\S]{0,120}ori_inference_records[\s\S]{0,80}authenticated/i);
  assert.doesNotMatch(migration, /grant\s+(insert|update)[\s\S]{0,120}ori_model_registry[\s\S]{0,80}authenticated/i);
  assert.match(reviewRoute, /target_reviewer_id: access\.user\.id/);
});

if (process.env.RUN_ORI_RLS_TESTS === "true") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const tokenA = process.env.RLS_TEST_USER_A_JWT;
  const tenantB = process.env.RLS_TEST_TENANT_B_ID;
  if (!url || !anonKey || !tokenA || !tenantB) throw new Error("ORI live RLS tests require Supabase URL, anon key, User A JWT, and Tenant B ID.");
  async function request(path, options = {}, token = tokenA) {
    return fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: anonKey, authorization: `Bearer ${token}`, "content-type": "application/json", Prefer: "return=representation", ...(options.headers || {}) } });
  }
  test("live tenant A cannot read tenant B ORI records", async () => {
    const response = await request(`ori_inference_records?tenant_id=eq.${tenantB}&select=inference_id`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });
  test("live normal user cannot activate or upload an ORI model", async () => {
    const response = await request("ori_model_registry?registry_id=eq.ori-operational-risk-logistic-v1%3A1.0.0", { method: "PATCH", body: JSON.stringify({ status: "APPROVED", artifact_reference: "client-upload" }) });
    assert.ok([401, 403].includes(response.status));
  });
  test("live client cannot insert a tenant-overridden inference", async () => {
    const response = await request("ori_inference_records", { method: "POST", body: JSON.stringify({ tenant_id: tenantB }) });
    assert.ok([401, 403].includes(response.status));
  });
  test("live anonymous users cannot read ORI records", async () => {
    const response = await request("ori_inference_records?select=inference_id&limit=1", {}, anonKey);
    assert.ok([401, 403].includes(response.status));
  });
}
