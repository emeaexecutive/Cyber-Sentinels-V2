import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { startTreasurySandbox } from './sandbox-server.mjs';
import { verifyTreasuryExport } from '../../lib/treasury/evidence.ts';

const output = 'artifacts/execution06-treasury/' + randomUUID();
await mkdir(output, { recursive: true });
const cases = [], running = [];
const post = async (s, path, body) => {
  const response = await fetch(s.url + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(response.status, 200); return response.json();
};
async function preserve(s, name) {
  const bundle = await (await fetch(s.url + '/api/evidence')).json();
  assert.ok(verifyTreasuryExport(bundle, new Map([['sandbox:receipt:v1', s.h.receiptKeys.publicKey]]), bundle.checkpoint));
  const truncated = structuredClone(bundle); truncated.events.pop();
  assert.equal(verifyTreasuryExport(truncated, new Map([['sandbox:receipt:v1', s.h.receiptKeys.publicKey]]), bundle.checkpoint), false);
  await writeFile(`${output}/${name}.json`, JSON.stringify(bundle, null, 2));
  await writeFile(`${output}/${name}-trusted-public-key.pem`, s.h.receiptKeys.publicKey.export({ type: 'spki', format: 'pem' }));
  await writeFile(`${output}/${name}-checkpoint.json`, JSON.stringify(bundle.checkpoint, null, 2));
  return bundle.checkpoint;
}
try {
  const s = await startTreasurySandbox(); running.push(s); const h = s.h;
  const signed = h.signed();
  const allow = await post(s, '/api/authorize', { signed }); assert.equal(allow.decision, 'ALLOW');
  assert.equal((await (await fetch(s.url + '/api/destination')).json()).length, 0);
  const committed = await post(s, '/api/commit', { mandateId: allow.mandateId, signed }); assert.ok(committed.effectId);
  assert.equal((await (await fetch(s.url + '/api/destination')).json()).length, 1);
  cases.push({ case: 'EUR50000_ALLOW', decision: allow.decision, observedEffects: 1, receipt: committed.event.digest });
  await h.treasury.configure(h.tenant, 'operator', { ...h.policy, version: 'v2', approvalThreshold: 4000000 });
  const payment = h.payment({ requestId: 'review:0002', agentId: 'agent:2', policyVersion: 'v2' }), reviewSigned = h.signed(payment);
  assert.equal((await post(s, '/api/authorize', { signed: reviewSigned })).decision, 'REVIEW');
  assert.equal((await (await fetch(s.url + '/api/destination')).json()).length, 1);
  await h.treasury.approve(h.tenant, 'reviewer', payment, payment.expiresAt);
  await h.treasury.approve(h.tenant, 'owner', payment, payment.expiresAt);
  const approved = await post(s, '/api/authorize', { signed: reviewSigned }); assert.equal(approved.decision, 'ALLOW');
  assert.equal((await post(s, '/api/commit', { mandateId: approved.mandateId, signed: reviewSigned })).decision, 'ALLOW');
  cases.push({ case: 'REVIEW_THEN_DUAL_APPROVAL', beforeApprovalEffects: 1, afterApprovalEffects: 2 });
  await h.control.contain(h.tenant, 'operator', { kind: 'agent', id: 'agent:1' }, 'synthetic compromise');
  const denied = await post(s, '/api/authorize', { signed: h.signed(h.payment({ requestId: 'revoked:0003', policyVersion: 'v2' })) });
  assert.equal(denied.decision, 'DENY'); assert.ok(denied.reasons.includes('AGENT_INACTIVE'));
  cases.push({ case: 'REVOKED_DENY', additionalEffects: 0 });
  const firstCheckpoint = await preserve(s, 'allow-review-deny');

  const race = await startTreasurySandbox(); running.push(race); const r = race.h;
  await r.treasury.configure(r.tenant, 'operator', { ...r.policy, version: 'v2', dailyLimit: 5000000, rollingLimit: 5000000 });
  const inputs = ['agent:1', 'agent:2'].map((agentId, i) => r.signed(r.payment({ agentId, requestId: 'http:race:000' + i, policyVersion: 'v2' })));
  const results = await Promise.all(inputs.map(signed => post(race, '/api/authorize', { signed })));
  assert.equal(results.filter(r => r.decision === 'ALLOW').length, 1);
  const winner = results.findIndex(r => r.decision === 'ALLOW');
  const body = { mandateId: results[winner].mandateId, signed: inputs[winner] };
  assert.equal((await post(race, '/api/commit', { ...body, available: false })).decision, 'DENY');
  assert.equal((await (await fetch(race.url + '/api/destination')).json()).length, 0);
  let unknown = false; try { await post(race, '/api/commit?drop=1', body); } catch { unknown = true; }
  assert.equal(unknown, true);
  const effects = await (await fetch(race.url + '/api/destination')).json(); assert.equal(effects.length, 1);
  assert.equal((await post(race, '/api/commit', body)).decision, 'DENY');
  cases.push({ case: 'FINAL_ALLOWANCE_AND_AMBIGUOUS_RESPONSE', admitted: 1, denied: 1, clientOutcome: 'UNKNOWN_BEFORE_RECONCILIATION', independentlyObservedSyntheticEffects: effects.length, replayDidNotReexecute: true });
  const raceCheckpoint = await preserve(race, 'race-unknown');
  await writeFile(output + '/summary.json', JSON.stringify({ status: 'PASS', synthetic: true, liveFunds: false, cases, firstCheckpoint, raceCheckpoint }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', output, cases, console: s.url, synthetic: true, liveFunds: false }));
  if (process.argv.includes('--serve')) await new Promise(() => {});
} finally { for (const s of running) await s.close(); }
