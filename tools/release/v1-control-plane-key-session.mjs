// Supported owner/admin application API only. No database credentials.
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const origin = 'https://www.cybersentinels.com';
if(process.env.I_CONFIRM_PRODUCTION!=='kecgtsfibkypjuaxqbjx') throw new Error('Explicit Production target confirmation required');
const directory = join(tmpdir(), 'cyber-v1-control-plane-proof');
const isolation=process.argv[2]==='isolation';
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
  if(isolation) tenant=JSON.parse(await readFile(join(directory,'isolation-workspace.json'),'utf8')).tenant;
  if (!tenant || !/^[a-f0-9-]{36}$/.test(tenant)) throw new Error('Authenticated tenant was not established by the application');
  const response = await context.request.post(`${origin}/api/developer/api-keys`, {
    headers: { 'x-enterprise-id': tenant },
    data: {
      label: isolation ? 'CUSTOMER_ZERO_CONTROL_PLANE_ISOLATION_20260909' : 'CUSTOMER_ZERO_CONTROL_PLANE_KEY_20260909', environment: 'live',
      expires_at: new Date(Date.now() + 2 * 3600000).toISOString(),
      scopes: ['agents:write','agents:verify','authority:read','authority:write','trust:request','trust:read','outcomes:write','review:read','review:write'],
      authority_management_boundary: {
        actions: ['read_repository'], target_prefixes: ['repository:customer-zero-v1-release-evidence'],
        purposes: ['deployment_evidence_review'], environments: ['production'], max_ttl_seconds: 3600,
      },
    },
  });
  const body = await response.json();
  if (response.status() !== 201 || !/^cs_live_/.test(body.api_key ?? '')) throw new Error(`API key issuance failed: ${response.status()} ${body.error ?? ''}`);
  await mkdir(directory, { recursive: true });
  const encryptedPath = join(directory, isolation ? 'customer-zero-isolation-key.dpapi' : 'customer-zero-key.dpapi');
  const protection = spawnSync('powershell.exe', ['-NoProfile','-Command',
    'Add-Type -AssemblyName System.Security; $raw=[Console]::In.ReadToEnd(); $bytes=[Text.Encoding]::UTF8.GetBytes($raw); $protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [IO.File]::WriteAllBytes($env:V1_KEY_PATH,$protected);'],
    { input: body.api_key, encoding: 'utf8', env: { ...process.env, V1_KEY_PATH: encryptedPath } });
  if (protection.status !== 0) throw new Error('Could not protect the issued key');
  const evidence = { status: response.status(), tenant, key: body.key, secretStored: 'Windows DPAPI, outside repository', issuedThrough: '/api/developer/api-keys' };
  await writeFile(join(directory, isolation ? 'isolation-key-metadata.json' : 'key-metadata.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: 'ISSUED', tenant, keyId: body.key.id, expiresAt: body.key.expires_at }));
} finally { await context.close(); }
