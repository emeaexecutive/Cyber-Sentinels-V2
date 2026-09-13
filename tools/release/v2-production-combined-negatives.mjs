// External clients only. Each negative key is distinct from the continuous V1/V2 client.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CyberSentinels } from '../../packages/cyber-sentinels-sdk/src/index.ts';
const origin = 'https://www.cybersentinels.com';
if (process.env.I_CONFIRM_PRODUCTION !== 'kecgtsfibkypjuaxqbjx' || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.V2_STAGING_PROJECT) throw new Error('Production public clients only');
if (process.cwd().toLowerCase().replaceAll('\\', '/') !== 'c:/users/emeae/desktop/cyber-sentinels-v2-release') throw new Error('WRONG WORKTREE');
const output = process.env.V2_RUN_DIRECTORY ?? 'docs/v2/production-qualification/same-client-20260913';
const session = join(tmpdir(), 'cyber-v2-combined-production-proof');
const proof = JSON.parse(await readFile(`${output}/v2/customer-zero.json`, 'utf8'));
assert.equal(proof.stages.rootOwnership.status, 'PASS');
const clients = {};
const metadata = {};
for (const role of ['main', 'legacy', 'wrong-client', 'tenant-b', 'expired']) {
  const directory = role === 'main' ? session : join(session, role);
  metadata[role] = JSON.parse(await readFile(join(directory, 'key-metadata.json'), 'utf8'));
  const decrypted = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Security; $bytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($env:QUALIFICATION_DPAPI_PATH),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($bytes))'], { encoding: 'utf8', env: { ...process.env, QUALIFICATION_DPAPI_PATH: join(directory, 'customer-zero-key.dpapi') } });
  if (decrypted.status !== 0 || !decrypted.stdout.startsWith('cs_live_')) throw new Error('DPAPI key unavailable');
  clients[role] = new CyberSentinels({ apiKey: decrypted.stdout, baseUrl: origin, timeoutMs: 60000 });
}
assert.equal(metadata.main.tenant, metadata['wrong-client'].tenant);
assert.notEqual(metadata.main.key.client_id, metadata['wrong-client'].key.client_id);
assert.notEqual(metadata.main.tenant, metadata['tenant-b'].tenant);
const result = { origin, startedAt: new Date().toISOString(), metadata, negatives: [] };
const save = () => writeFile(`${output}/negatives.json`, JSON.stringify(result, null, 2));
const reject = async (name, operation, status, code) => {
  try { await operation(); throw new Error(`${name}: unexpectedly accepted`); }
  catch (error) {
    assert.equal(error.status, status, `${name}: ${error.message}`);
    if (code) assert.equal(error.code, code);
    result.negatives.push({ name, status, code: error.code }); await save();
    console.log(JSON.stringify(result.negatives.at(-1)));
  }
};
const id = proof.stages.incident?.incident_id;
const tx = proof.transactionId;
const open = { transaction_id: tx, summary: 'Controlled qualification isolation negative', observed_at: new Date().toISOString() };
try {
  assert.ok(Date.parse(metadata.expired.key.expires_at) < Date.now(), 'Expired-key test must run after actual expiry');
  await reject('expired key', () => clients.expired.trust.getTransaction(tx), 401, 'API_KEY_EXPIRED');
  for (const [name, operation] of [
    ['legacy V1-only incidents:read (scope gate before resource lookup)', () => clients.legacy.incidents.get(id ?? 'scope-probe-not-an-incident')],
    ['legacy V1-only incidents:write', () => clients.legacy.incidents.open(open)],
    ['legacy V1-only evidence:export (scope gate before resource lookup)', () => clients.legacy.incidents.export(id ?? 'scope-probe-not-an-incident')],
  ]) await reject(name, operation, 403, 'INSUFFICIENT_SCOPE');
  for (const role of ['wrong-client', 'tenant-b']) {
    const client = clients[role];
    await reject(`${role} cannot read V1 root`, () => client.trust.getTransaction(tx), 404, 'RESOURCE_NOT_FOUND');
    await reject(`${role} cannot hijack V2 root`, () => client.incidents.open(open), 404, 'RESOURCE_NOT_FOUND');
    if (!id) continue;
    await reject(`${role} cannot read incident`, () => client.incidents.get(id), 404, 'RESOURCE_NOT_FOUND');
    await reject(`${role} cannot link evidence/append chronology`, () => client.incidents.append(id, proof.stages.observations[0]), 404, 'RESOURCE_NOT_FOUND');
    await reject(`${role} cannot read chronology`, () => client.incidents.replay(id), 404, 'RESOURCE_NOT_FOUND');
    await reject(`${role} cannot export`, () => client.incidents.export(id), 404, 'RESOURCE_NOT_FOUND');
  }
  await reject('caller-forged derived state on incident creation', () => clients.main.incidents.open({ ...open, states: { export: 'REGULATORY_EXPORT_READY' } }), 400, 'INVALID_REQUEST');
  await reject('invalid digest at evidence submission', () => clients.main.evidence.submit({ provider: { key: 'self', class: 'APPLICATION_SIGNAL', event_id: crypto.randomUUID(), finding: 'CONTROLLED_PRODUCTION_QUALIFICATION' }, type: 'DETECTION', subject: { type: 'AI_AGENT', id: proof.stages.rootTransaction.agent_id }, evidence: { qualification_provenance: 'CONTROLLED_PRODUCTION_QUALIFICATION', downstream_execution: 'NOT_OBSERVED' }, occurred_at: new Date().toISOString(), digest: '0'.repeat(64) }), 400, 'EVIDENCE_DIGEST_MISMATCH');
  if (!id) {
    result.status = 'PARTIAL_BLOCKED';
    result.blocked = ['cross-tenant incident read', 'cross-tenant evidence link', 'cross-tenant chronology', 'cross-tenant export', 'incident-link digest', 'incomplete incident export NOT READY'];
    result.reason = 'No incident exists: Production persistence failed. No fixture or substitute incident used.';
    const root = await clients.main.trust.getTransaction(tx);
    assert.equal(root.decision, 'ALLOW');
    assert.deepEqual(root.digests, proof.stages.rootTransaction.digests);
    result.originalAllowImmutable = true;
  } else {
  const other = clients['tenant-b'];
  const agent = await other.agents.register({ display_name: 'CONTROLLED_PRODUCTION_QUALIFICATION_TENANT_B', entity_type: 'AI_AGENT', owner_reference: 'owner:qualification-isolation', runtime: { environment: 'production', framework: 'custom' }, model: { provider: 'not_invoked', identifier: 'scripted-isolation-client' } });
  assert.equal(agent.manifest_context.enterprise_id, metadata['tenant-b'].tenant);
  const at = new Date().toISOString();
  const ev = await other.evidence.submit({ provider: { key: 'self', class: 'APPLICATION_SIGNAL', event_id: crypto.randomUUID(), finding: 'CONTROLLED_PRODUCTION_QUALIFICATION' }, type: 'DETECTION', subject: { type: 'AI_AGENT', id: agent.agent_id }, evidence: { context: {}, qualification_provenance: 'CONTROLLED_PRODUCTION_QUALIFICATION', downstream_execution: 'NOT_OBSERVED' }, occurred_at: at });
  result.tenantBEvidence = ev;
  await reject('Tenant A cannot link Tenant B evidence', () => clients.main.incidents.append(id, { transaction_id: tx, kind: 'DETECTION', summary: 'Cross-tenant evidence negative', observed_at: at, evidence_object_id: ev.evidence_id, evidence_digest: ev.evidence_digest, context: {} }), 404, 'RESOURCE_NOT_FOUND');
  const after = await clients.main.incidents.get(id);
  assert.deepEqual(after.timeline, proof.stages.export.package.timeline);
  result.noInvalidInputPersisted = true;
  result.status = 'PASS';
  }
} catch (error) { result.status = 'BLOCKED'; result.error = { message: error.message, status: error.status, code: error.code }; process.exitCode = 1; }
finally { result.completedAt = new Date().toISOString(); await save(); console.log(JSON.stringify({ status: result.status, error: result.error })); }
