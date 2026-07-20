import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../supabase/migrations/202607200001_canonical_trust_event_foundation.sql", import.meta.url), "utf8");
const tables = ["trust_event_envelopes", "trust_events", "trust_event_links", "trust_event_chain_heads", "trust_event_audit", "evidence_objects", "evidence_object_access"];

test("all Trust Event tables enable RLS, deny anonymous use, and reserve canonical mutation for service_role", () => {
  for (const table of tables) assert.match(migration, new RegExp(`'${table}'`));
  assert.match(migration, /enable row level security/i); assert.match(migration, /revoke all on public\.%I from anon, authenticated/i);
  assert.match(migration, /grant all privileges on public\.%I to service_role/i);
  assert.doesNotMatch(migration, /grant (update|delete)[^;]+authenticated/i);
  assert.doesNotMatch(migration, /grant insert on public\.(trust_event_envelopes|trust_event_links|trust_event_chain_heads|trust_event_audit|evidence_objects|evidence_object_access)[^;]+authenticated/i);
});

test("legacy inserts remain compatible while canonical writes stay service-only", () => {
  assert.match(migration, /grant insert on public\.trust_events to authenticated/i);
  assert.match(migration, /create policy "users create own trust_events"[\s\S]*schema_version is distinct from 'trust-event-v1'/i);
  assert.match(migration, /create policy "admin manage trust_events"[\s\S]*schema_version is distinct from 'trust-event-v1'/i);
  assert.doesNotMatch(migration, /with check \(\s*schema_version = 'trust-event-v1'/i);
});

test("tenant reads use workspace authorization and chain mutation uses a per-enterprise lock", () => {
  for (const name of ["canonical trust events", "trust event envelopes", "trust event links", "trust event chain heads", "trust event audit", "evidence metadata"]) assert.match(migration, new RegExp(`tenant members read ${name}`, "i"));
  assert.match(migration, /user_can_access_trust_workspace\(enterprise_id\)/i);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(enterprise::text \|\| ':default'/i);
  assert.match(migration, /for update/i); assert.match(migration, /return 'CHAIN_CONFLICT'/i);
  assert.doesNotMatch(migration, /global.*chain/i);
});

test("canonical history and audit are append-only with an encrypted Evidence Vault boundary", () => {
  assert.match(migration, /Canonical Trust Events are append-only/); assert.match(migration, /Trust Event audit records are append-only/);
  assert.match(migration, /Finalized Trust Event envelopes are immutable/);
  assert.match(migration, /if tg_op = 'DELETE' then return old; end if;\s+return new;/i);
  assert.match(migration, /storage_boundary <> 'EVIDENCE_VAULT'.*object_reference is not null and object_encrypted/i);
  assert.doesNotMatch(migration, /^\s+(raw_payload|raw_proof|access_token|client_secret|webhook_secret)\s+/im);
});

test("new canonical rows are constrained to the v1 enums and integrity shape", () => {
  for (const constraint of [
    "trust_events_v1_required_fields_check",
    "trust_events_v1_event_type_check",
    "trust_events_v1_subject_type_check",
    "trust_events_v1_actor_type_check",
    "trust_events_v1_protocol_check",
    "trust_events_v1_integrity_check",
  ]) assert.match(migration, new RegExp(constraint));
  assert.match(migration, /'HUMAN','AI_AGENT','SERVICE','DEVICE','WORKLOAD','ORGANIZATION','UNKNOWN'/);
  assert.match(migration, /'USER','AI_AGENT','SERVICE','SYSTEM','ADMINISTRATOR','PROVIDER','UNKNOWN'/);
  assert.match(migration, /canonicalization = 'RFC8785-JCS'/);
  assert.match(migration, /hash_algorithm = 'SHA-256'/);
});

test("idempotency distinguishes exact duplicates, body conflicts, and nonce replay", () => {
  assert.match(migration, /existing\.request_hash = p_request_hash/); assert.match(migration, /'DUPLICATE'/); assert.match(migration, /'CONFLICT'/); assert.match(migration, /'REPLAY'/);
  assert.match(migration, /trust_event_envelope_idempotency_idx/); assert.match(migration, /trust_event_envelope_nonce_idx/);
  assert.match(migration, /p_enterprise_id::text \|\| ':' \|\| p_provider_key/);
  assert.match(migration, /event_id uuid not null references public\.trust_events\(id\)/i);
});
