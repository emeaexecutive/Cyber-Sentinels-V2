import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL(
    "../supabase/migrations/20260822124942_repair_production_consent_event_metadata.sql",
    import.meta.url,
  ),
  "utf8",
);
const consentService = await readFile(
  new URL("../src/lib/consent/service.ts", import.meta.url),
  "utf8",
);
const eventRegistry = await readFile(
  new URL("../src/lib/trust-events/event-types.ts", import.meta.url),
  "utf8",
);

const definition = migration.match(
  /create or replace function public\.append_trust_event_v1\([\s\S]*?\$function\$;/i,
)?.[0];

test("the canonical append repair accepts every application-produced consent event", () => {
  assert.ok(definition, "append_trust_event_v1 replacement must be present");
  assert.match(
    definition,
    /\^\(identity\|device\|session\|authority\|workflow\|runtime\|security\|governance\|provider\|system\|consent\)\\\./,
  );

  const actionEvents = {
    ACCEPT_ALL: "consent.accept_all",
    REJECT_OPTIONAL: "consent.reject_optional",
    SAVE_PREFERENCES: "consent.preferences.saved",
    WITHDRAW: "consent.withdrawn",
  };
  for (const [action, eventType] of Object.entries(actionEvents)) {
    assert.match(consentService, new RegExp(`${action}: "${eventType.replaceAll(".", "\\.")}"`));
    assert.match(eventRegistry, new RegExp(`"${eventType.replaceAll(".", "\\.")}"`));
  }
  assert.match(consentService, /eventType: "consent\.receipt\.created"/);
  assert.match(eventRegistry, /"consent\.receipt\.created"/);
});

test("the repair preserves metadata validation and rejects malformed events", () => {
  assert.ok(definition);
  for (const validation of [
    /schemaVersion' <> 'trust-event-v1'/,
    /canonicalization' <> 'RFC8785-JCS'/,
    /hashAlgorithm' <> 'SHA-256'/,
    /eventHash'\) !~ '\^\[a-f0-9\]\{64\}\$'/,
    /jsonb_typeof\(p_event -> 'normalizedFacts'\) <> 'object'/,
    /jsonb_typeof\(p_event -> 'reasonCodes'\) <> 'array'/,
    /jsonb_typeof\(p_event -> 'evidenceReferences'\) <> 'array'/,
    /raise exception 'Invalid canonical event metadata'/,
  ]) {
    assert.match(definition, validation);
  }
  assert.doesNotMatch(definition, /exception\s+when\s+others/i);
  assert.doesNotMatch(definition, /return\s+true/i);
});

test("first-party unsigned metadata and nullable context retain the canonical contract", () => {
  assert.ok(definition);
  assert.match(definition, /'UNSIGNED'/);
  assert.match(consentService, /protocol: "UNSIGNED" as const, serverVerified: true/);
  assert.match(consentService, /workflow: null, session: null, authority: null/);
  assert.match(consentService, /normalizedFacts: \{ policyVersion:[\s\S]*categories: receipt\.categories \}/);
});

test("the service-role-only persistence boundary remains unchanged", () => {
  assert.match(definition, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /revoke all on function public\.append_trust_event_v1\(jsonb, uuid, uuid\)\s+from public, anon, authenticated;/i);
  assert.match(migration, /grant execute on function public\.append_trust_event_v1\(jsonb, uuid, uuid\)\s+to service_role;/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to\s+(?:public|anon|authenticated)\b/i);
  assert.doesNotMatch(migration, /alter table|disable row level security|create policy/i);
});
