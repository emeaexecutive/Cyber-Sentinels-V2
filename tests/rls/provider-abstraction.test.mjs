import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../supabase/migrations/202607170002_provider_abstraction_hopae.sql", import.meta.url), "utf8");
const executionMigration = await readFile(new URL("../../supabase/migrations/202607160003_release_1_rc6_production_evidence_gate.sql", import.meta.url), "utf8");
const callbackRoute = await readFile(new URL("../../app/api/providers/route.ts", import.meta.url), "utf8");
const trustRoute = await readFile(new URL("../../app/api/trust/execute/route.ts", import.meta.url), "utf8");
const providerServer = await readFile(new URL("../../lib/providers/hopae-rc1-server.ts", import.meta.url), "utf8");

test("provider tables enable RLS and deny anonymous or browser writes", () => {
  for (const table of ["provider_registry", "provider_state_audit", "provider_health_snapshots", "normalized_identity_evidence"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, "i"));
  }
  assert.doesNotMatch(migration, /grant insert on public\.normalized_identity_evidence to authenticated/i);
});

test("normalized evidence and execution reads are tenant scoped", () => {
  assert.match(migration, /user_can_access_trust_workspace\(tenant_id\)/);
  assert.match(migration, /tenant members read normalized identity evidence/i);
  assert.match(executionMigration, /tenant members read provider executions/i);
});

test("provider enablement is service-role only and audited", () => {
  assert.match(migration, /insert into public\.provider_state_audit/i);
  assert.match(migration, /revoke all on function public\.set_provider_enabled[\s\S]*authenticated/i);
  assert.match(migration, /grant execute on function public\.set_provider_enabled[\s\S]*service_role/i);
  assert.match(callbackRoute, /requireAdminApiAccess/);
});

test("callback ingress enforces content type, body limit, raw body, signature, and duplicate ledger", () => {
  assert.match(callbackRoute, /contentType !== "application\/json"/);
  assert.match(callbackRoute, /256_000/);
  assert.match(callbackRoute, /await request\.text\(\)/);
  assert.match(providerServer, /verifyCallback/);
  assert.match(providerServer, /reserveWebhookEvent/);
});

test("tenant and provider selection are resolved by protected server paths", () => {
  assert.match(trustRoute, /supabase\.auth\.getUser/);
  assert.match(providerServer, /trust_workspaces/);
  assert.match(providerServer, /getSelectedProviderAdapter/);
  assert.doesNotMatch(providerServer, /input\.body\.hopae_provider_id/);
});

test("Trust Decision remains authoritative and callback persistence is atomic", () => {
  assert.match(providerServer, /executeCanonicalTrustAssessment/);
  assert.match(providerServer, /persist_provider_identity_evidence/);
  assert.match(migration, /result := public\.persist_rc1_trust_assessment/);
  assert.doesNotMatch(callbackRoute, /authorization\s*=|set.*verified/i);
});
