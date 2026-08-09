import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Phase 1 extends the canonical Operational Entity and evidence stores instead of creating a parallel trust engine", async () => {
  const [migration, server, canonical] = await Promise.all([
    read("supabase/migrations/202608080003_native_operational_entity_verification.sql"),
    read("lib/operational-entities/native-verification-server.ts"),
    read("src/lib/trust-transaction/canonical.ts"),
  ]);
  assert.match(migration, /references public\.operational_entities\(enterprise_id,entity_id\)/);
  assert.match(migration, /insert into public\.evidence_objects/);
  assert.match(migration, /insert into public\.trust_memory_index/);
  assert.match(server, /ingestContinuousTrustSignal/);
  assert.match(canonical, /executeCanonicalTrustTransaction/);
  assert.doesNotMatch(migration, /create table public\.(?:trust_engine|operational_entities_v2|native_entity_registry)/i);
});

test("private keys are prohibited and challenge storage retains only the nonce hash", async () => {
  const [migration, core, panel] = await Promise.all([
    read("supabase/migrations/202608080003_native_operational_entity_verification.sql"),
    read("lib/operational-entities/native-verification.ts"),
    read("components/native-entity-verification-panel.tsx"),
  ]);
  const challengeTable = migration.slice(migration.indexOf("create table public.operational_entity_native_challenges"), migration.indexOf("create table public.operational_entity_native_runtime_observations"));
  assert.match(challengeTable, /nonce_hash text not null/);
  assert.doesNotMatch(challengeTable, /\n\s*nonce text/i);
  assert.match(migration, /not\(public_jwk \? 'd'\)/);
  assert.match(core, /PRIVATE_CREDENTIAL_PROHIBITED/);
  assert.match(panel, /private Ed25519 key is generated as non-extractable browser memory/i);
  assert.doesNotMatch(panel, /privateKey\s*:/);
});

test("challenge consumption is tenant-bound, row-locked and atomic under concurrent use", async () => {
  const migration = await read("supabase/migrations/202608080003_native_operational_entity_verification.sql");
  const consume = migration.slice(migration.indexOf("create or replace function public.consume_native_entity_challenge_v1"), migration.indexOf("comment on table public.operational_entity_manifests"));
  assert.match(consume, /where enterprise_id=p_enterprise_id and operational_entity_id=p_operational_entity_id and challenge_id=p_challenge_id\s+for update/);
  assert.match(consume, /if challenge\.status<>'ISSUED'/);
  assert.match(consume, /'REPLAYED'/);
  assert.match(consume, /update public\.operational_entity_native_challenges set status='VERIFIED'.*status='ISSUED'/s);
  assert.match(migration, /unique\(enterprise_id,challenge_id\)/);
});

test("audience, manifest supersession and observations are server-controlled and atomic", async () => {
  const [migration, route, service, panel] = await Promise.all([
    read("supabase/migrations/202608080003_native_operational_entity_verification.sql"),
    read("app/api/operational-entities/[entityId]/native-verification/route.ts"),
    read("lib/operational-entities/native-verification-server.ts"),
    read("components/native-entity-verification-panel.tsx"),
  ]);
  assert.match(route, /function expectedAudience\(request: Request\)/);
  assert.match(route, /NATIVE_VERIFICATION_AUDIENCE/);
  assert.match(route, /issueStoredNativeChallenge\(context, entityId, expectedAudience\(request\)\)/);
  assert.match(route, /submitNativeProof\(context, entityId, input, expectedAudience\(request\)\)/);
  assert.doesNotMatch(route, /issueStoredNativeChallenge\([^\n]*input\.audience/);

  const registerManifest = migration.slice(migration.indexOf("create or replace function public.register_native_entity_manifest_v1"), migration.indexOf("create or replace function public.consume_native_entity_challenge_v1"));
  assert.match(registerManifest, /operational_entities[\s\S]*for update/);
  assert.match(registerManifest, /status='ACTIVE'[\s\S]*for update/);
  assert.match(registerManifest, /set status='SUPERSEDED'/);
  assert.match(service, /db\.rpc\("register_native_entity_manifest_v1"/);

  const preVerification = service.slice(service.indexOf("export async function submitNativeProof"), service.indexOf("const result = verifyNativeEntity"));
  assert.doesNotMatch(preVerification, /operational_entity_native_(?:runtime|software)_observations/);
  const consume = migration.slice(migration.indexOf("create or replace function public.consume_native_entity_challenge_v1"));
  assert.match(consume, /operational_entity_native_runtime_observations/);
  assert.match(consume, /operational_entity_native_software_observations/);
  assert.match(consume, /additionalEvents/);
  assert.match(consume, /additionalMemories/);
  assert.match(service, /p_replay: \{ \.\.\.replay, additionalEvents: additionalReplay \}/);
  assert.match(service, /p_memory: \{ \.\.\.memory, additionalMemories \}/);
  assert.match(panel, /buildDigest: null/);
  assert.match(panel, /sourceDigest: null/);
  assert.match(panel, /no build or source integrity is fabricated/i);
});

test("tenant RLS, service-only writes, authentication, roles, rate limiting and body bounds guard the API", async () => {
  const [migration, route, enterpriseContext] = await Promise.all([
    read("supabase/migrations/202608080003_native_operational_entity_verification.sql"),
    read("app/api/operational-entities/[entityId]/native-verification/route.ts"),
    read("lib/identity-signals/enterprise-context.ts"),
  ]);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /user_can_access_trust_workspace\(enterprise_id\)/);
  assert.match(migration, /revoke all on public\.%I from public,anon,authenticated/);
  assert.match(migration, /grant all privileges on public\.%I to service_role/);
  assert.match(migration, /auth\.role\(\)<>'service_role'/);
  assert.match(route, /resolveIdentityEnterprise\(request, \["owner", "admin"\]\)/);
  assert.match(route, /checkRequestRateLimit/);
  assert.match(route, /MAX_BODY_BYTES = 131_072/);
  assert.match(enterpriseContext, /x-enterprise-id/i);
});

test("the HTTP contract exposes every Phase 1 lifecycle operation without returning secrets", async () => {
  const [route, service] = await Promise.all([
    read("app/api/operational-entities/[entityId]/native-verification/route.ts"),
    read("lib/operational-entities/native-verification-server.ts"),
  ]);
  for (const action of ["register_credential", "rotate_credential", "register_manifest", "issue_challenge", "submit_proof", "revoke_credential", "revoke_manifest", "revoke_owner_binding"]) {
    assert.match(route, new RegExp(`action === \\"${action}\\"`), `${action} must be routed`);
  }
  assert.match(service, /privateKeyStored: false/);
  assert.doesNotMatch(service, /private_jwk|private_key|privateKey\s*:/i);
  assert.match(service, /function proofSubmission\(raw: unknown\)/);
  assert.match(service, /submittedAt: iso\(value\.submittedAt, "proof\.submittedAt"\)/);
  assert.match(service, /loadNativeVerification/);
});

test("native evidence participates in the existing canonical evidence collector while external evidence stays optional", async () => {
  const server = await read("lib/trust-transaction/server.ts");
  const collector = server.slice(server.indexOf("async loadConfiguredEvidence"), server.indexOf("async loadAuthority"));
  assert.match(collector, /native_entity_identity_evidence/);
  assert.match(server, /providerId: "cyber_sentinels_native"/);
  assert.match(collector, /if \(nativeEvidence\.length\) return nativeEvidence/);
  assert.match(collector, /hopae_verifications/);
  assert.match(collector, /\[\.\.\.nativeEvidence, \.\.\.\(result\.data \?\? \[\]\)\.map\(safeEvidence\)\]/);
});

test("canonical authority resolution retains revoked contracts so exact actions deterministically DENY", async () => {
  const server = await read("lib/trust-transaction/server.ts");
  const authority = server.slice(server.indexOf("async loadAuthority"), server.indexOf("async loadPolicy"));
  assert.match(authority, /select\("contract,revocation_state,revoked_at"\)/);
  assert.doesNotMatch(authority, /eq\("revocation_state",\s*"active"\)/);
  assert.match(authority, /revocationState:/);
  assert.match(authority, /revokedAt:/);
});

test("Replay, Trust Memory, revocation and continuous reevaluation retain exact provenance", async () => {
  const [migration, service] = await Promise.all([
    read("supabase/migrations/202608080003_native_operational_entity_verification.sql"),
    read("lib/operational-entities/native-verification-server.ts"),
  ]);
  for (const event of ["MANIFEST_REGISTERED", "CREDENTIAL_REGISTERED", "CHALLENGE_ISSUED", "CHALLENGE_VERIFIED", "NATIVE_IDENTITY_VERIFIED", "OWNER_CONFIRMED", "RUNTIME_BOUND", "BUILD_VERIFIED", "ENTITY_CHANGED", "CREDENTIAL_ROTATED", "CREDENTIAL_REVOKED", "VERIFICATION_EXPIRED", "REVERIFICATION_COMPLETED"]) {
    assert.match(`${migration}\n${service}`, new RegExp(event));
  }
  for (const memory of ["NATIVE_ENTITY_VERIFIED", "ACCOUNTABLE_OWNER_CHANGED", "SIGNING_KEY_ROTATED", "SIGNING_KEY_REVOKED", "MATERIAL_MANIFEST_CHANGE", "RUNTIME_IDENTITY_CHANGED", "BUILD_PROVENANCE_CONFLICT", "ENTITY_REVERIFIED"]) {
    assert.match(`${migration}\n${service}`, new RegExp(memory));
  }
  assert.match(service, /ingestContinuousTrustSignal/);
  assert.match(service, /status: "REVOKED"/);
  assert.match(migration, /on conflict\(enterprise_id,memory_type,source_id\) do nothing/);
});

test("the Operational Entity and CPTO demo surfaces expose proof, unknowns and copied-ID failure", async () => {
  const [entityPage, demo, panel, entityModel] = await Promise.all([
    read("app/operational-entities/[entityId]/page.tsx"),
    read("app/demo/trust-runtime/page.tsx"),
    read("components/native-entity-verification-panel.tsx"),
    read("lib/operational-entities/operational-entity.ts"),
  ]);
  for (const label of ["Native Verification", "Last Verified", "Signing Credential", "Manifest Version", "Owner Binding", "Runtime Binding", "Software Provenance", "Continuity", "Changed Attributes", "Verified Claims", "Unverified Claims", "Conflicts", "Evidence and reason codes"]) {
    assert.match(entityPage, new RegExp(label, "i"));
  }
  assert.match(entityPage, /process\.env\.NODE_ENV === "development" \|\| process\.env\.VERCEL_ENV === "preview"/);
  assert.match(demo, /How do you know that is the same agent\?/);
  assert.match(demo, /What happens if somebody copies its ID\?/);
  assert.match(demo, /INVALID_SIGNATURE \/ WRONG_ENTITY/);
  assert.match(entityModel, /AGENT_ALPHA_OPERATIONAL_ENTITY_ID = "entity:alpha"/);
  assert.match(entityModel, /resolveCanonicalAgentAlpha/);
  assert.match(demo, /persistedAgentAlpha/);
  assert.match(demo, /NativeEntityVerificationPanel/);
  assert.doesNotMatch(demo, /createOperationalEntity/);
  for (const action of ["VERIFY AGENT ALPHA", "COPY ALPHA ID", "REPLAY OLD PROOF", "ALTER MANIFEST", "CHANGE RUNTIME", "REVOKE AUTHORITY", "ROTATE KEY + RECOVER"]) {
    assert.match(panel, new RegExp(action.replaceAll("+", "\\+")));
  }
  assert.match(panel, /fetch\("\/api\/trust\/execute"/);
  assert.match(panel, /fetch\("\/api\/trust-fabric\/contracts"/);
  assert.match(panel, /privateSigningKey/);
  assert.doesNotMatch(panel, /JSON\.stringify\([^\n]*privateSigningKey|privateKey\s*:/);
});
