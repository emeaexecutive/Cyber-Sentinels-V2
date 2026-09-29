import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { consistentContextScenario } from '../src/lib/scope-continuity/scenarios.ts';
import { seriousIncidentScenario } from '../src/lib/serious-incident/scenarios.ts';
import { buildSeriousIncidentArtifacts } from '../src/lib/serious-incident/integrations.ts';

const load = name => readFile(`supabase/migrations/${name}`, 'utf8');
const rc1 = await load('202607160001_release_1_rc1_provider_evidence_gate.sql');
const continuous = await load('202607240003_continuous_trust_engine.sql');
const scope = await load('202607310001_environment_attestation_scope_continuity.sql');
const incident = await load('202608010001_ai_serious_incident_regulatory_lineage.sql');
const repair = await load('20260929084417_repair_execution_proof_sql_lint.sql');
const signatures = [
  'persist_rc1_trust_assessment(uuid,text,text,text,bigint,text,jsonb,jsonb,jsonb,jsonb)',
  'ingest_continuous_trust_signal_v1(jsonb,text,uuid,jsonb)',
  'persist_scope_continuity_decision_v1(jsonb,jsonb,jsonb,uuid,uuid)',
  'persist_serious_incident_case_v1(jsonb,jsonb,jsonb,uuid,uuid)',
];
function originalFunction(source, name) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('$$;', source.indexOf('as $$', start));
  assert.ok(end > start, name);
  return source.slice(start, end + 3);
}
function createTable(source, name) {
  const expression = new RegExp(`create table(?: if not exists)? public\\.${name} \\([\\s\\S]*?\\r?\\n\\);`, 'i');
  const found = source.match(expression);
  assert.ok(found, name);
  return found[0];
}

test('four historical SQL failures are reproduced and repaired without weakening evidence controls', async t => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(await readFile('tests/fixtures/execution-proof-sql-prerequisites.sql', 'utf8'));
    await db.exec(scope);
    // Include real incident DDL, RLS, immutability triggers and the affected RPC.
    // The independent append RPC is outside this regression's scope.
    await db.exec(incident.slice(0, incident.indexOf('create or replace function public.serious_incident_transition_allowed_v1')));
    await db.exec(createTable(continuous, 'trust_signals'));
    await db.exec(createTable(continuous, 'trust_signal_processing'));
    await db.exec(originalFunction(rc1, 'persist_rc1_trust_assessment'));
    await db.exec(originalFunction(continuous, 'ingest_continuous_trust_signal_v1'));
    for (const signature of signatures) {
      await db.exec(`revoke all on function public.${signature} from public,anon,authenticated; grant execute on function public.${signature} to service_role;`);
    }
    // Match the later live pgcrypto search-path migration before testing.
    for (const signature of signatures.slice(2)) await db.exec(`alter function public.${signature} set search_path=public,extensions;`);
    await db.exec("select set_config('request.jwt.claim.role','service_role',false)");
    const tenant = '11111111-1111-4111-8111-111111111111';
    const actor = '22222222-2222-4222-8222-222222222222';
    const foreignTenant = randomUUID();
    await db.query('insert into trust_workspaces values($1),($2)', [tenant, foreignTenant]);
    const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0].result;
    async function call(name, args) {
      await db.exec('set role service_role');
      try { return await scalar(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as result`, args); }
      finally { await db.exec('reset role'); }
    }
    const verificationId = randomUUID();
    await db.query('insert into hopae_verifications(id,verification_id,workspace_id,workflow_id,owner_user_id,correlation_id,source_mode) values($1,$2,$3,$4,$5,$6,$7)', [verificationId, 'provider-verification', tenant, randomUUID(), actor, randomUUID(), 'test']);
    const rc1Args = [verificationId, 'event-1', 'completed', 'provider-verification', 1, 'a'.repeat(64), { evidenceStatus: 'verified' }, { status: 'complete' }, { trust_decision: 'allow', confidence_band: 'high', enforcement_action: 'allow' }, { replay: {}, evidenceGraph: {}, trustMemory: {}, enforcement: {} }];
    const signal = { id: randomUUID(), tenantId: tenant, entityId: 'agent:test', entityType: 'AI_AGENT', signalType: 'SYSTEM', source: 'test', observedAt: '2026-09-29T00:00:00Z', receivedAt: '2026-09-29T00:00:00Z', createdAt: '2026-09-29T00:00:00Z', severity: 'LOW', confidence: 0.8, status: 'INFORMATIONAL', fingerprint: 'b'.repeat(64), correlationId: randomUUID(), metadata: {} };
    await db.query('insert into trust_subjects values($1,$2,null)', [tenant, signal.entityId]);
    const signalArgs = [signal, 'c'.repeat(64), actor, {}];
    const scopeInput = structuredClone(consistentContextScenario());
    const scopeArgs = [scopeInput.input, scopeInput.decision, scopeInput.artifacts, actor, scopeInput.decision.correlationId];
    const scenario = seriousIncidentScenario();
    // Use no optional upstream references for this isolated incident fixture.
    scenario.assessment.references.environmentAttestationReference = null;
    scenario.assessment.references.scopeContinuityDecisionReference = null;
    for (const key of ['scopeAuthorizationLeaseReference', 'declaredEnvironmentReference', 'configuredEnvironmentReference']) scenario.assessment.evidenceSnapshot[key] = null;
    scenario.assessment.evidenceSnapshot.observedEnvironmentReferences = [];
    // Keep this persistence fixture valid: every recorded event precedes ingestion.
    // The illustrative scenario's default first ingestion predates later chronology events.
    scenario.assessment.clocks.firstCyberSentinelsIngestionAt = '2026-08-01T10:08:00.000Z';
    const incidentCorrelation = '66666666-6666-4666-8666-666666666666';
    scenario.artifacts = buildSeriousIncidentArtifacts(scenario.assessment, scenario.screening, incidentCorrelation);
    const incidentArgs = [scenario.assessment, scenario.screening, scenario.artifacts, actor, incidentCorrelation];

    await t.test('original RC1 partial-index conflict target fails 42P10 atomically', async () => {
      await assert.rejects(call('persist_rc1_trust_assessment', rc1Args), error => error.code === '42P10');
      assert.equal(await scalar('select count(*)::int result from hopae_webhook_events'), 0);
    });
    await t.test('original duplicate signal fails 42702 after a successful first ingestion', async () => {
      assert.equal((await call('ingest_continuous_trust_signal_v1', signalArgs)).status, 'ACCEPTED');
      await db.query("update trust_signal_processing set status='PROCESSED' where signal_id=$1", [signal.id]);
      await assert.rejects(call('ingest_continuous_trust_signal_v1', signalArgs), error => error.code === '42702');
    });
    await t.test('original lease hash fails 42725 before persistence', async () => {
      await assert.rejects(call('persist_scope_continuity_decision_v1', scopeArgs), error => error.code === '42725');
      assert.equal(await scalar('select count(*)::int result from scope_continuity_decisions'), 0);
    });
    await t.test('original incident Trust Memory concatenation fails 42883 atomically', async () => {
      await assert.rejects(call('persist_serious_incident_case_v1', incidentArgs), error => error.code === '42883');
      assert.equal(await scalar('select count(*)::int result from incident_regulatory_assessments'), 0);
    });
    const functionsSql = "select oid::regprocedure::text signature,proowner,proacl::text acl,proconfig,prosecdef from pg_proc where proname=any($1::text[]) order by proname";
    const names = signatures.map(value => value.split('(')[0]);
    const beforeFunctions = (await db.query(functionsSql, [names])).rows;
    const bodiesSql = 'select proname,prosrc from pg_proc where proname=any($1::text[]) order by proname';
    const beforeBodies = (await db.query(bodiesSql, [names])).rows;
    const schemaSql = "select c.relname,c.relrowsecurity,c.relforcerowsecurity,(select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgname) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal) triggers,(select jsonb_agg(row_to_json(p) order by p.policyname) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) policies from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname";
    const beforeSchema = (await db.query(schemaSql)).rows;
    await db.exec(repair);

    await t.test('repair preserves owners, service-only ACLs, search paths, RLS and immutable triggers', async () => {
      assert.deepEqual((await db.query(functionsSql, [names])).rows, beforeFunctions);
      assert.deepEqual((await db.query(schemaSql)).rows, beforeSchema);
      const expectedChanges = {
        persist_rc1_trust_assessment: ['on conflict (event_id) do nothing', 'on conflict (event_id) where event_id is not null do nothing'],
        ingest_continuous_trust_signal_v1: ['select status from public.trust_signal_processing\n          where tenant_id=tenant and signal_id=existing.id', 'select processing.status from public.trust_signal_processing as processing\n          where processing.tenant_id=tenant and processing.signal_id=existing.id'],
        persist_scope_continuity_decision_v1: ["p_input->'authorization'", "(p_input->'authorization')"],
        persist_serious_incident_case_v1: ["incident::text||':'||item->>'eventKind'", "incident::text||':'||(item->>'eventKind')"],
      };
      assert.deepEqual((await db.query(bodiesSql, [names])).rows, beforeBodies.map(row => ({
        ...row, prosrc: row.prosrc.replaceAll('\r\n', '\n').replace(...expectedChanges[row.proname]),
      })));
      for (const signature of signatures) {
        const privileges = (await db.query("select has_function_privilege('anon',$1,'execute') anon,has_function_privilege('authenticated',$1,'execute') authenticated,has_function_privilege('service_role',$1,'execute') service", [signature])).rows[0];
        assert.deepEqual(privileges, { anon: false, authenticated: false, service: true });
      }
    });
    await t.test('RC1 now persists linked evidence and returns unchanged references on duplicate', async () => {
      const first = await call('persist_rc1_trust_assessment', rc1Args);
      assert.equal(first.duplicate, false);
      for (const key of ['replay_reference', 'evidence_graph_reference', 'trust_memory_reference', 'receipt_reference']) assert.match(first[key], /^[a-f0-9-]{36}$/);
      assert.deepEqual(await call('persist_rc1_trust_assessment', rc1Args), { ...first, duplicate: true });
      assert.equal(await scalar('select count(*)::int result from hopae_webhook_events'), 1);
      assert.equal(await scalar('select count(*)::int result from verification_receipts'), 1);
    });
    await t.test('signal duplicate returns the tenant-bound processing state without another signal', async () => {
      const result = await call('ingest_continuous_trust_signal_v1', signalArgs);
      assert.equal(result.status, 'DUPLICATE');
      assert.equal(result.processingStatus, 'PROCESSED');
      assert.equal(await scalar('select count(*)::int result from trust_signals'), 1);
      await assert.rejects(call('ingest_continuous_trust_signal_v1', [{ ...signal, fingerprint: 'd'.repeat(64) }, ...signalArgs.slice(1)]), /Idempotency key conflicts/);
      await assert.rejects(call('ingest_continuous_trust_signal_v1', [{ ...signal, tenantId: foreignTenant }, ...signalArgs.slice(1)]), /entity is unavailable/);
    });
    await t.test('scope persists full graph, memory and attestations with stable immutable lease hashing', async () => {
      const result = await call('persist_scope_continuity_decision_v1', scopeArgs);
      assert.equal(result.idempotentReplay, false);
      assert.equal(result.outcome, scopeInput.decision.outcome);
      const expected = await scalar("select encode(extensions.digest(convert_to(($1::jsonb-'consumedActionCount'-'createdAt'-'immutableHash')::text,'UTF8'),'sha256'),'hex') result", [scopeInput.input.authorization]);
      assert.equal(await scalar('select immutable_hash result from scope_authorization_leases'), expected);
      assert.equal(await scalar('select count(*)::int result from environment_attestations'), 1);
      assert.equal(await scalar("select count(*)::int result from trust_memory_index where memory_type='SCOPE_CONTINUITY_DECISION'"), 1);
      assert.equal((await call('persist_scope_continuity_decision_v1', scopeArgs)).idempotentReplay, true);
      const changed = structuredClone(scopeArgs);
      changed[1].decisionHash = 'e'.repeat(64);
      await assert.rejects(call('persist_scope_continuity_decision_v1', changed), /idempotency conflict/);
      const volatile = structuredClone(scopeArgs);
      volatile[0].authorization.consumedActionCount = 4;
      volatile[0].authorization.createdAt = '2026-09-29T00:00:00Z';
      volatile[0].authorization.immutableHash = 'f'.repeat(64);
      volatile[1].id = randomUUID();
      volatile[1].correlationId = randomUUID();
      volatile[4] = volatile[1].correlationId;
      assert.equal((await call('persist_scope_continuity_decision_v1', volatile)).idempotentReplay, false);
      const changedLease = structuredClone(volatile);
      changedLease[0].authorization.permittedTargets = ['unauthorized.example'];
      changedLease[1].id = randomUUID();
      changedLease[1].correlationId = randomUUID();
      changedLease[4] = changedLease[1].correlationId;
      await assert.rejects(call('persist_scope_continuity_decision_v1', changedLease), /Conflicting scope-authorization/);
    });
    await t.test('incident persists actual chronology, graph and correctly keyed Trust Memory; replay is idempotent', async () => {
      assert.equal((await call('persist_serious_incident_case_v1', incidentArgs)).idempotentReplay, false);
      const memory = (await db.query("select source_id from trust_memory_index where memory_type<>'SCOPE_CONTINUITY_DECISION' order by source_id")).rows.map(row => row.source_id);
      assert.deepEqual(memory, scenario.artifacts.trustMemory.map(item => `${scenario.assessment.id}:${item.eventKind}`).sort());
      assert.equal(await scalar('select count(*)::int result from incident_chronology_events'), scenario.artifacts.replay.length);
      assert.equal((await call('persist_serious_incident_case_v1', incidentArgs)).idempotentReplay, true);
      const changed = structuredClone(incidentArgs);
      changed[0].identity.agentId = 'changed-agent';
      await assert.rejects(call('persist_serious_incident_case_v1', changed), /Conflicting serious-incident/);
      assert.equal(await scalar('select count(*)::int result from incident_regulatory_assessments'), 1);
    });
    await t.test('tenant-scoped reads and upstream reference checks still reject another tenant', async () => {
      await db.query("select set_config('test.tenant',$1,false)", [foreignTenant]);
      await db.exec('set role authenticated');
      try {
        assert.equal(await scalar('select count(*)::int result from scope_continuity_decisions'), 0);
        assert.equal(await scalar('select count(*)::int result from incident_regulatory_assessments'), 0);
      } finally { await db.exec('reset role'); }
      const changed = structuredClone(incidentArgs);
      changed[0].id = randomUUID();
      changed[0].enterpriseId = foreignTenant;
      changed[0].references.environmentAttestationReference = scopeInput.input.attestations[0].id;
      await assert.rejects(call('persist_serious_incident_case_v1', changed), /Tenant-bound environment attestation/);
    });
    await t.test('scope decisions and incident cases cannot be updated or deleted after repair', async () => {
      for (const table of ['scope_continuity_decisions', 'incident_regulatory_assessments']) {
        await assert.rejects(db.query(`update ${table} set enterprise_id=enterprise_id`), /append-only/);
        await assert.rejects(db.query(`delete from ${table}`), /append-only/);
      }
    });
    await t.test('direct anonymous and authenticated RPC calls remain denied', async () => {
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        try {
          for (const [index, args] of [rc1Args, signalArgs, scopeArgs, incidentArgs].entries()) {
            await assert.rejects(db.query(`select ${names[index]}(${args.map((_, i) => `$${i + 1}`).join(',')})`, args), error => error.code === '42501');
          }
        } finally { await db.exec('reset role'); }
      }
    });
  } finally { await db.close(); }
});
