// Supported owner/admin application API only. No database credentials.
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const origin = 'https://www.cybersentinels.com';
if(process.env.I_CONFIRM_PRODUCTION!=='kecgtsfibkypjuaxqbjx') throw new Error('Explicit Production target confirmation required');
const role = process.argv[2];
if (!['legacy','wrong-client','tenant-b','expired'].includes(role)) throw new Error('Explicit negative-test role required');
const directory = join(tmpdir(), 'cyber-v2-combined-production-proof', role);
const isolation=false;
if (process.cwd().toLowerCase() !== 'c:/users/emeae/desktop/cyber-sentinels-v2-release'.replaceAll('/', String.fromCharCode(92)).toLowerCase()) throw new Error('WRONG WORKTREE');
if (process.env.V2_STAGING_PROJECT || process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Staging and database credentials forbidden');
await mkdir(directory, { recursive: true });
try { await readFile(join(directory, 'key-metadata.json')); throw new Error('Existing session metadata: refuse duplicate issuance'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const context = await chromium.launchPersistentContext(join(tmpdir(), 'cs-production-proof-playwright'), {
  headless: true, executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await context.newPage();
  let tenant;
  page.on('request', request => {
    if (request.url() === `${origin}/api/developer/api-keys`) tenant = request.headers()['x-enterprise-id'];
  });
  await page.goto(`${origin}/developers/api-keys`, { waitUntil: 'networkidle' });
  if(role === 'tenant-b') tenant=JSON.parse(await readFile(join(tmpdir(),'cyber-v1-control-plane-proof','isolation-workspace.json'),'utf8')).tenant;
  if (!tenant || !/^[a-f0-9-]{36}$/.test(tenant)) throw new Error('Authenticated tenant was not established by the application');
  const response = await context.request.post(`${origin}/api/developer/api-keys`, {
    headers: { 'x-enterprise-id': tenant },
    data: {
      label: 'V2_COMBINED_NEGATIVE_20260913_' + role, environment: 'live',
      expires_at: new Date(Date.now() + (role === 'expired' ? 15000 : 2 * 3600000)).toISOString(),
      scopes: ['legacy','expired'].includes(role) ? ['trust:read'] : ['agents:write','trust:read','incidents:read','incidents:write','evidence:write','evidence:export'],
      authority_management_boundary: {
        actions: ['read_repository'], target_prefixes: ['repository:customer-zero-v1-release-evidence'],
        purposes: ['deployment_evidence_review'], environments: ['production'], max_ttl_seconds: 3600,
      },
    },
  });
  const body = await response.json();
  if (response.status() !== 201 || !/^cs_live_/.test(body.api_key ?? '')) throw new Error(`API key issuance failed: ${response.status()} ${body.error ?? ''}`);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'key-metadata.json'), JSON.stringify({ tenant, key: body.key }, null, 2));
  const encryptedPath = join(directory, isolation ? 'customer-zero-isolation-key.dpapi' : 'customer-zero-key.dpapi');
  const protection = spawnSync('powershell.exe', ['-NoProfile','-Command',
    'Add-Type -AssemblyName System.Security; $raw=[Console]::In.ReadToEnd(); $bytes=[Text.Encoding]::UTF8.GetBytes($raw); $protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [IO.File]::WriteAllBytes($env:V1_KEY_PATH,$protected);'],
    { input: body.api_key, encoding: 'utf8', env: { ...process.env, V1_KEY_PATH: encryptedPath } });
  if (protection.status !== 0) throw new Error('Could not protect the issued key');
  const evidence = { status: response.status(), tenant, key: body.key, secretStored: 'Windows DPAPI, outside repository', issuedThrough: '/api/developer/api-keys' };
  await writeFile(join(directory, isolation ? 'isolation-key-metadata.json' : 'key-metadata.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: 'ISSUED', tenant, keyId: body.key.id, clientId: body.key.client_id, scopes: body.key.scopes, expiresAt: body.key.expires_at }));
} finally { await context.close(); }
