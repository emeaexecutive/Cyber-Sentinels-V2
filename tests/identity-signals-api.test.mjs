import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const verificationRoute = await readFile(new URL("../app/api/identity/verifications/route.ts", import.meta.url), "utf8");
const context = await readFile(new URL("../lib/identity-signals/enterprise-context.ts", import.meta.url), "utf8");
const worldCallback = await readFile(new URL("../app/api/providers/world-id/callback/route.ts", import.meta.url), "utf8");
const hopaeAlias = await readFile(new URL("../app/api/providers/hopae/callback/route.ts", import.meta.url), "utf8");
const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
const subjectRoute = await readFile(new URL("../app/api/identity/subjects/route.ts", import.meta.url), "utf8");
const providerRoute = await readFile(new URL("../app/api/identity/providers/route.ts", import.meta.url), "utf8");
const providerHealthRoute = await readFile(new URL("../app/api/identity/providers/health/route.ts", import.meta.url), "utf8");
const repository = await readFile(new URL("../lib/identity-signals/repository.ts", import.meta.url), "utf8");
const adapters = await readFile(new URL("../lib/identity-signals/adapters.ts", import.meta.url), "utf8");
const types = await readFile(new URL("../lib/identity-signals/types.ts", import.meta.url), "utf8");
const http = await readFile(new URL("../lib/identity-signals/http.ts", import.meta.url), "utf8");

test("identity API derives enterprise authority from authenticated membership", () => {
  assert.match(context, /x-enterprise-id/i);
  assert.match(context, /supabase\.auth\.getUser/);
  assert.match(context, /trust_workspaces/);
  assert.match(context, /workspace_members/);
  assert.match(verificationRoute, /enterpriseId must be selected only/);
  assert.match(verificationRoute, /Idempotency-Key/);
  assert.match(subjectRoute, /resolveIdentityEnterprise\(request, \["owner", "admin", "reviewer"\]\)/);
  assert.match(repository, /IDENTITY_SUBJECT_CREATED/);
  assert.match(repository, /correlation_id: input\.correlationId/);
});

test("provider callbacks remain fail-closed and canonical", () => {
  assert.match(worldCallback, /WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED/);
  assert.match(worldCallback, /confidence: 0/);
  assert.match(worldCallback, /serverVerified: false/);
  assert.match(hopaeAlias, /export \{ POST \} from "\.\.\/\.\.\/route"/);
  assert.match(middleware, /\/api\/providers\/hopae\/callback/);
  assert.match(middleware, /\/api\/providers\/world-id\/callback/);
});

test("identity runtime exposes the complete adapter and normalized signal contract", () => {
  for (const method of ["getCapabilities", "healthCheck", "collectSignal", "verifyCallback"]) assert.match(types, new RegExp(`${method}\\(`));
  for (const status of ["PASS","FAIL","INCONCLUSIVE","UNAVAILABLE","UNSUPPORTED","BLOCKED","ERROR","PENDING"]) assert.match(types, new RegExp(`"${status}"`));
  for (const field of ["signatureVerified","providerEventId","providerTransactionId","payloadHash","normalizedValue","provenance","riskFlags"]) assert.match(types, new RegExp(field));
  assert.match(adapters, /import "server-only"/);
});

test("enterprise routes return correlation IDs and persist only normalized evidence", () => {
  assert.match(http, /correlationId/);
  for (const route of [verificationRoute, subjectRoute, providerRoute, providerHealthRoute]) assert.match(route, /identityCorrelationId/);
  for (const field of ["signal_status","signature_verified","provider_event_id","payload_hash","normalized_value","provenance"]) assert.match(repository, new RegExp(field));
  assert.doesNotMatch(repository, /raw_payload|raw_proof|service_role_key/i);
});
