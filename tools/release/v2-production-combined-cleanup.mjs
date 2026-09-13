// Owner/admin cleanup after the continuous proof attempt ends, including a terminal blocker.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CyberSentinels } from '../../packages/cyber-sentinels-sdk/src/index.ts';
const origin = 'https://www.cybersentinels.com';
if (process.env.I_CONFIRM_PRODUCTION !== 'kecgtsfibkypjuaxqbjx' || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.V2_STAGING_PROJECT) throw new Error('Production public clients only');
if (process.cwd().toLowerCase().replaceAll('\\', '/') !== 'c:/users/emeae/desktop/cyber-sentinels-v2-release') throw new Error('WRONG WORKTREE');
const output = process.env.V2_RUN_DIRECTORY ?? 'docs/v2/production-qualification/same-client-20260913';
const v1 = JSON.parse(await readFile(`${output}/v1/customer-zero.json`, 'utf8'));
const v2 = JSON.parse(await readFile(`${output}/v2/customer-zero.json`, 'utf8'));
assert.ok(v1.completedAt && v2.completedAt, 'Both proof attempts must have ended before cleanup');
const session = join(tmpdir(), 'cyber-v2-combined-production-proof');
const result = { startedAt: new Date().toISOString(), reason: v2.result === 'PASS' ? 'Both proofs completed' : 'Terminal Production blocker; preserve records and revoke temporary credentials', keys: [], authorities: [] };
const save = () => writeFile(`${output}/cleanup.json`, JSON.stringify(result, null, 2));
const context = await chromium.launchPersistentContext(join(tmpdir(), 'cs-production-proof-playwright'), { headless: true, executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe' });
try {
  for (const role of ['main', 'legacy', 'wrong-client', 'tenant-b', 'expired']) {
    const directory = role === 'main' ? session : join(session, role);
    const meta = JSON.parse(await readFile(join(directory, 'key-metadata.json'), 'utf8'));
    const secretPath = join(directory, 'customer-zero-key.dpapi');
    const decrypted = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Security; $bytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($env:QUALIFICATION_DPAPI_PATH),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($bytes))'], { encoding: 'utf8', env: { ...process.env, QUALIFICATION_DPAPI_PATH: secretPath } });
    if (decrypted.status !== 0 || !decrypted.stdout.startsWith('cs_live_')) throw new Error('DPAPI unavailable');
    const cs = new CyberSentinels({ apiKey: decrypted.stdout, baseUrl: origin, timeoutMs: 60000 });
    if (role === 'main') {
      const agentId = v1.stages.agent.agent_id;
      const authorityId = v1.stages.authority.authority_id;
      let authority = await cs.authority.getVersion(agentId, authorityId);
      if (authority.status !== 'REVOKED') { await cs.authority.revoke(agentId, authorityId, 'Controlled qualification cleanup'); authority = await cs.authority.getVersion(agentId, authorityId); }
      assert.equal(authority.status, 'REVOKED');
      result.authorities.push(authority);
      result.authorityList = await cs.authority.list(agentId);
      const bad = await context.request.post(`${origin}/api/developer/api-keys`, { headers: { 'x-enterprise-id': meta.tenant }, data: { label: 'V2_COMBINED_BAD_SCOPE_NEGATIVE_20260913', environment: 'live', scopes: ['qualification:unsupported'], expires_at: new Date(Date.now()+600000).toISOString() } });
      const body = await bad.json();
      if (body.key?.id) {
        await context.request.patch(`${origin}/api/developer/api-keys`, { headers: { 'x-enterprise-id': meta.tenant }, data: { key_id: body.key.id, action: 'revoke' } });
      }
      result.badScope = { status: bad.status(), error: body.error };
      await save();
      assert.equal(bad.status(), 400); assert.equal(body.error, 'INVALID_API_KEY_INPUT');
    }
    const response = await context.request.patch(`${origin}/api/developer/api-keys`, { headers: { 'x-enterprise-id': meta.tenant }, data: { key_id: meta.key.id, action: 'revoke' } });
    const body = await response.json();
    assert.equal(response.status(), 200); assert.equal(body.key.status, 'revoked');
    const rejected = await fetch(`${origin}/api/v1/trust/transactions/${v1.stages.firstDecision.transaction_id}`, { headers: { authorization: `Bearer ${decrypted.stdout}` }, signal: AbortSignal.timeout(60000) });
    const rejectedBody = await rejected.json();
    assert.equal(rejected.status, 401); assert.equal(rejectedBody.error?.code, 'API_KEY_REVOKED');
    const listed = await context.request.get(`${origin}/api/developer/api-keys`, { headers: { 'x-enterprise-id': meta.tenant } });
    assert.equal(listed.status(), 200);
    const listedBody = await listed.json();
    assert.equal(listedBody.keys.find(key => key.id === meta.key.id)?.status, 'revoked');
    result.keys.push({ role, tenant: meta.tenant, key: body.key, revokedKeyResponse: { status: rejected.status, body: rejectedBody }, ownerListConfirmed: true });
    await save();
    await unlink(secretPath);
    await unlink(join(directory, 'key-metadata.json'));
    result.keys.at(-1).localDpapiRemoved = true;
    await save();
    console.log(JSON.stringify({ role, status: 'REVOKED', keyId: meta.key.id, revokedKeyStatus: rejected.status }));
  }
  result.temporaryApiKeysActive = result.keys.filter(row => row.key.status === 'active').length;
  result.qualificationAuthoritiesActive = result.authorities.filter(row => row.status !== 'REVOKED').length;
  assert.equal(result.temporaryApiKeysActive, 0); assert.equal(result.qualificationAuthoritiesActive, 0);
  result.status = 'PASS';
} catch (error) { result.status = 'BLOCKED'; result.error = { message: error.message, status: error.status, code: error.code }; process.exitCode = 1; }
finally { result.completedAt = new Date().toISOString(); await save(); await context.close(); console.log(JSON.stringify({ status: result.status, error: result.error, temporaryApiKeysActive: result.temporaryApiKeysActive, qualificationAuthoritiesActive: result.qualificationAuthoritiesActive })); }
