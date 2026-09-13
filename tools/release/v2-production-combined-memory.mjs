// Read-only owner corroboration of Memory records already created by the public API client.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const origin = 'https://www.cybersentinels.com';
if (process.env.I_CONFIRM_PRODUCTION !== 'kecgtsfibkypjuaxqbjx' || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.V2_STAGING_PROJECT) throw new Error('Production owner read only');
if (process.cwd().toLowerCase().replaceAll('\\', '/') !== 'c:/users/emeae/desktop/cyber-sentinels-v2-release') throw new Error('WRONG WORKTREE');
const output = process.env.V2_RUN_DIRECTORY;
if (!output) throw new Error('Explicit proof directory required');
const proof = JSON.parse(await readFile(`${output}/v2/customer-zero.json`, 'utf8'));
assert.equal(proof.result, 'PASS');
const meta = JSON.parse(await readFile(join(tmpdir(), 'cyber-v2-combined-production-proof', 'key-metadata.json'), 'utf8'));
const context = await chromium.launchPersistentContext(join(tmpdir(), 'cs-production-proof-playwright'), { headless: true, executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe' });
try {
  const response = await context.request.get(`${origin}/api/trust-architecture/subjects/${encodeURIComponent(proof.stages.rootTransaction.agent_id)}/timeline`, { headers: { 'x-enterprise-id': meta.tenant } });
  assert.equal(response.status(), 200);
  const body = await response.json();
  const memory = body.timeline.memory.filter(row => row.summary?.incidentId === proof.stages.incident.incident_id);
  for (const kind of ['INCIDENT_TRANSACTION_LINK', 'INCIDENT_EXECUTION_OBSERVATION', 'INCIDENT_OUTCOME', 'INCIDENT_DETECTION', 'INCIDENT_INTERVENTION', 'INCIDENT_CONTAINMENT', 'INCIDENT_REMEDIATION', 'INCIDENT_EVIDENCE_EXPORT']) assert.ok(memory.some(row => row.memory_type === kind), `Missing Memory ${kind}`);
  await writeFile(`${output}/incident-memory.json`, JSON.stringify({ status: 'PASS', source: 'Existing owner application API; read-only corroboration, all mutations used the combined public API client', incidentId: proof.stages.incident.incident_id, memory }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', incidentId: proof.stages.incident.incident_id, memoryRecords: memory.length }));
} finally { await context.close(); }
