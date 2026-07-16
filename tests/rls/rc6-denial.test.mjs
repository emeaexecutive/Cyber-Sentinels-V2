import assert from "node:assert/strict";
import test from "node:test";

if (process.env.RUN_RLS_TESTS !== "true") throw new Error("Blocked: RUN_RLS_TESTS=true is required.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const tokenA = process.env.RLS_TEST_USER_A_JWT;
const tenantB = process.env.RLS_TEST_TENANT_B_ID;
if (!url || !anonKey || !tokenA || !tenantB) throw new Error("Supabase URL, anon key, User A JWT and Tenant B ID names are required.");

async function request(path, options = {}) {
  return fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: anonKey, authorization: `Bearer ${tokenA}`, "content-type": "application/json", Prefer: "return=representation", ...(options.headers || {}) } });
}

test("tenant A cannot select tenant B provider executions", async () => {
  const response = await request(`provider_execution_records?tenant_id=eq.${tenantB}&select=execution_id`);
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), []);
});
for (const method of ["PATCH", "DELETE"]) test(`tenant A cannot ${method.toLowerCase()} tenant B provider executions`, async () => {
  const response = await request(`provider_execution_records?tenant_id=eq.${tenantB}`, { method, body: method === "PATCH" ? JSON.stringify({ status: "failed" }) : undefined });
  assert.ok([200, 204].includes(response.status)); if (response.status === 200) assert.deepEqual(await response.json(), []);
});
for (const table of ["release_validation_reviews", "webhook_event_ledger", "operational_measurements"]) test(`ordinary user cannot write ${table}`, async () => {
  const response = await request(table, { method: "POST", body: JSON.stringify({}) });
  assert.ok([400, 401, 403].includes(response.status));
});
test("anonymous cannot read protected records", async () => {
  const response = await fetch(`${url}/rest/v1/webhook_event_ledger?select=id`, { headers: { apikey: anonKey } });
  assert.ok([401, 403].includes(response.status));
});
