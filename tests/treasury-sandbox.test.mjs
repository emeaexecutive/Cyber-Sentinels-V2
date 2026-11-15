import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { generateKeyPairSync } from 'node:crypto';
import { treasuryFixture } from './fixtures/treasury.mjs';
import { verifyAuthorityReceipt } from '../lib/trust-receipts/authority-signature.ts';
import { verifySwarmReplay } from '../lib/swarm/containment.ts';
import { createSwarmStore } from '../lib/swarm/store.ts';
import { createFileSwarmPersistence } from '../lib/swarm/file-persistence.ts';
import { exportTreasuryEvidence, verifyTreasuryExport } from '../lib/treasury/evidence.ts';
import { treasurySandboxClient } from '../examples/treasury-sandbox/client.mjs';
import { financialSignals } from '../lib/treasury/intelligence.ts';

test('EUR50,000 commits exactly once and has a separately observed signed outcome', async () => {
  const h = await treasuryFixture(), s = h.signed();
  const allowed = await h.treasury.authorize(h.tenant, s);
  assert.equal(allowed.decision, 'ALLOW');
  assert.equal((await h.treasury.destination(h.tenant)).length, 0, 'ALLOW itself is not an effect');
  const result = await h.treasury.commit(h.tenant, allowed.mandateId, s);
  assert.equal(result.decision, 'ALLOW');
  const destination = await h.treasury.destination(h.tenant);
  assert.equal(destination.length, 1); assert.equal(destination[0].payment.amountMinor, 5000000);
  assert.equal(verifyAuthorityReceipt(result.event, result.signature, { tenantId: h.tenant, receiptId: result.event.digest, trustedKeys: new Map([['sandbox:receipt:v1', h.receiptKeys.publicKey]]) }), true);
  const forged = structuredClone(result.event); forged.details.effectId = 'forged';
  assert.equal(verifyAuthorityReceipt(forged, result.signature, { tenantId: h.tenant, receiptId: result.event.digest, trustedKeys: new Map([['sandbox:receipt:v1', h.receiptKeys.publicKey]]) }), false);
  assert.equal((await h.treasury.commit(h.tenant, allowed.mandateId, s)).decision, 'DENY');
  assert.equal((await h.treasury.destination(h.tenant)).length, 1);
});

test('high consequence REVIEW waits for two distinct independent current humans', async () => {
  const h = await treasuryFixture();
  await h.treasury.configure(h.tenant, 'operator', { ...h.policy, version: 'v2', approvalThreshold: 4000000 });
  const p = h.payment({ policyVersion: 'v2' }), s = h.signed(p);
  assert.equal((await h.treasury.authorize(h.tenant, s)).decision, 'REVIEW');
  await h.treasury.approve(h.tenant, 'reviewer', p, p.expiresAt);
  await assert.rejects(h.treasury.approve(h.tenant, 'reviewer', p, p.expiresAt), /DUPLICATE/);
  assert.equal((await h.treasury.authorize(h.tenant, s)).decision, 'REVIEW');
  await h.treasury.approve(h.tenant, 'owner', p, p.expiresAt);
  const a = await h.treasury.authorize(h.tenant, s); assert.equal(a.decision, 'ALLOW');
  h.actors.get('reviewer').permissions = [];
  assert.equal((await h.treasury.commit(h.tenant, a.mandateId, s)).decision, 'DENY');
  assert.equal((await h.treasury.destination(h.tenant)).length, 0);
});

test('mandate rejects beneficiary, amount, currency, asset, network and destination substitution', async () => {
  const h = await treasuryFixture(), s = h.signed(), a = await h.treasury.authorize(h.tenant, s);
  for (const change of [{ beneficiary: 'attacker' }, { amountMinor: 5000001 }, { currency: 'USD' }, { asset: 'USDC' }, { network: 'chain' }, { destination: 'attacker' }, { provider: 'uncontrolled' }, { chainId: '1' }, { contract: 'attacker' }]) {
    assert.equal((await h.treasury.commit(h.tenant, a.mandateId, h.signed(h.payment(change)))).decision, 'DENY');
  }
  assert.equal((await h.treasury.destination(h.tenant)).length, 0);
});

test('expired mandate, rotated key, wrong key, cross tenant, revoked identity fail closed', async () => {
  for (const scenario of ['expired', 'rotation', 'wrong-key', 'tenant', 'revoked']) {
    const h = await treasuryFixture(), s = h.signed(), a = await h.treasury.authorize(h.tenant, s);
    if (scenario === 'expired') h.advance(60001);
    if (scenario === 'rotation') await h.control.enrollRuntimeKey(h.tenant, 'operator', 'agent:1', generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }));
    if (scenario === 'revoked') await h.control.contain(h.tenant, 'operator', { kind: 'agent', id: 'agent:1' }, 'compromised');
    const input = scenario === 'wrong-key' ? h.signed(h.payment(), h.keys.get('agent:2').privateKey) : scenario === 'tenant' ? h.signed(h.payment({ tenantId: 'foreign:tenant' })) : s;
    assert.equal((await h.treasury.commit(h.tenant, a.mandateId, input)).decision, 'DENY', scenario);
    assert.equal((await h.treasury.destination(h.tenant)).length, 0);
  }
});

test('policy changes and emergency stop before destination commit deny an earlier ALLOW', async () => {
  for (const stopped of [false, true]) {
    const h = await treasuryFixture(), s = h.signed(), a = await h.treasury.authorize(h.tenant, s);
    await h.treasury.configure(h.tenant, 'operator', { ...h.policy, version: 'v2', stopped });
    assert.equal((await h.treasury.commit(h.tenant, a.mandateId, s)).decision, 'DENY');
    assert.equal((await h.treasury.destination(h.tenant)).length, 0);
  }
});

test('two agents cannot reserve the same final allowance; unavailable gateway has no effect', async () => {
  const h = await treasuryFixture();
  await h.treasury.configure(h.tenant, 'operator', { ...h.policy, version: 'v2', dailyLimit: 5000000, rollingLimit: 5000000 });
  const inputs = ['agent:1', 'agent:2'].map((agentId, i) => h.signed(h.payment({ agentId, requestId: 'race:000' + i, policyVersion: 'v2' })));
  const results = await Promise.all(inputs.map(s => h.treasury.authorize(h.tenant, s)));
  assert.equal(results.filter(r => r.decision === 'ALLOW').length, 1);
  const winner = results.findIndex(r => r.decision === 'ALLOW');
  assert.equal((await h.treasury.commit(h.tenant, results[winner].mandateId, inputs[winner], false)).decision, 'DENY');
  assert.equal((await h.treasury.destination(h.tenant)).length, 0);
  assert.equal((await h.treasury.commit(h.tenant, results[winner].mandateId, inputs[winner])).decision, 'ALLOW');
  assert.equal((await h.treasury.destination(h.tenant)).length, 1);
});

test('independent disk CAS clients race consumption; restart and Replay preserve one effect', async () => {
  await mkdir('tmp', { recursive: true }); const directory = await mkdtemp('tmp/treasury-');
  const persistence = createFileSwarmPersistence(directory), h = await treasuryFixture({ persistence });
  const s = h.signed(), a = await h.treasury.authorize(h.tenant, s);
  const other = h.make(createSwarmStore(createFileSwarmPersistence(directory)));
  const outcomes = await Promise.all([h.treasury.commit(h.tenant, a.mandateId, s), other.commit(h.tenant, a.mandateId, s)]);
  assert.equal(outcomes.filter(r => r.decision === 'ALLOW').length, 1);
  const restarted = h.make(createSwarmStore(createFileSwarmPersistence(directory)));
  assert.equal((await restarted.destination(h.tenant)).length, 1);
  const replay = await restarted.replay(h.tenant); assert.equal(replay.valid, true);
  const tampered = structuredClone(replay.events); tampered[0].details.corrupt = true;
  assert.equal(verifySwarmReplay(tampered, h.tenant), false);
});

test('revoked, cyclic, over-scoped and agent-origin authority cannot authorize payment', async () => {
  for (const mutate of [g => { g.grants[0].revokedAt = '2000-01-01'; }, g => { g.grants[0].parentGrantId = g.grants[0].id; }, g => { g.grants[0].scope = ['READ']; }, g => { g.grants[0].grantorType = 'ai_agent'; }]) {
    const h = await treasuryFixture({ graph: g => { mutate(g); return g; } });
    assert.equal((await h.treasury.authorize(h.tenant, h.signed())).decision, 'DENY');
    assert.equal((await h.treasury.destination(h.tenant)).length, 0);
  }
});

test('shared currency exposure spans providers and carries reservations across UTC midnight', async () => {
  const h = await treasuryFixture({ now: Date.parse('2026-10-19T23:59:59Z') });
  const policy = { ...h.policy, version: 'v2', dailyLimit: 5000000, rollingLimit: 5000000, routes: [...h.policy.routes, { ...h.policy.routes[0], provider: 'controlled:second' }] };
  await h.treasury.configure(h.tenant, 'operator', policy);
  assert.equal((await h.treasury.authorize(h.tenant, h.signed(h.payment({ policyVersion: 'v2' })))).decision, 'ALLOW');
  h.advance(2000);
  assert.equal((await h.treasury.authorize(h.tenant, h.signed(h.payment({ policyVersion: 'v2', provider: 'controlled:second', agentId: 'agent:2', requestId: 'provider:second' })))).decision, 'DENY');
  h.advance(60001);
  assert.equal((await h.treasury.authorize(h.tenant, h.signed(h.payment({ policyVersion: 'v2', provider: 'controlled:second', agentId: 'agent:2', requestId: 'provider:fresh' })))).decision, 'ALLOW');
});

test('invalid amounts fail closed and the SDK refuses remote payment destinations', async () => {
  const h = await treasuryFixture();
  for (const amountMinor of [0, -1, 0.01, Number.MAX_SAFE_INTEGER + 1]) assert.equal((await h.treasury.authorize(h.tenant, h.signed(h.payment({ amountMinor })))).decision, 'DENY');
  assert.equal((await h.treasury.destination(h.tenant)).length, 0);
  assert.throws(() => treasurySandboxClient('https://payments.example.test'), /LOCAL_SANDBOX_ONLY/);
});

test('signed export detects wrong anchors, truncation, forged receipts and missing destination evidence', async () => {
  const h = await treasuryFixture(), s = h.signed(), a = await h.treasury.authorize(h.tenant, s);
  await h.treasury.commit(h.tenant, a.mandateId, s);
  const snapshot = await h.treasury.snapshot(h.tenant), bundle = exportTreasuryEvidence(h.tenant, snapshot.events, snapshot.effects, 'sandbox:receipt:v1', h.receiptKeys.privateKey);
  const trusted = new Map([['sandbox:receipt:v1', h.receiptKeys.publicKey]]), expected = structuredClone(bundle.checkpoint);
  assert.equal(verifyTreasuryExport(bundle, trusted, expected), true);
  for (const mutate of [b => b.events.pop(), b => { b.events[0].signature.signature = 'forged'; }, b => { b.effects = []; }]) {
    const changed = structuredClone(bundle); mutate(changed); assert.equal(verifyTreasuryExport(changed, trusted, expected), false);
  }
  assert.equal(verifyTreasuryExport(bundle, new Map([['sandbox:receipt:v1', generateKeyPairSync('ed25519').publicKey]]), expected), false);
});

test('financial monitoring flags shared-limit attempts without granting intervention authority', async () => {
  const h = await treasuryFixture();
  await h.treasury.configure(h.tenant, 'operator', { ...h.policy, version: 'v2', dailyLimit: 5000000, rollingLimit: 5000000 });
  const s = h.signed(h.payment({ policyVersion: 'v2' })), a = await h.treasury.authorize(h.tenant, s);
  await h.treasury.commit(h.tenant, a.mandateId, s);
  for (const agentId of ['agent:1', 'agent:2']) await h.treasury.authorize(h.tenant, h.signed(h.payment({ policyVersion: 'v2', agentId, requestId: 'denied:' + agentId })));
  const replay = await h.treasury.replay(h.tenant), signals = financialSignals(replay.events, h.tenant);
  assert.ok(signals.some(s => s.category === 'COORDINATED_LIMIT_ATTEMPT'));
  assert.ok(signals.every(s => s.intervention === 'REQUIRES_CURRENT_DELEGATED_AUTHORITY'));
  assert.deepEqual(financialSignals(replay.events, 'foreign:tenant'), []);
  assert.equal((await h.treasury.destination(h.tenant)).length, 1);
});

test('revocation wins after a stale dispatch check but before the atomic destination commit', async () => {
  await mkdir('tmp', { recursive: true }); const directory = await mkdtemp('tmp/treasury-stop-race-');
  const persistence = createFileSwarmPersistence(directory), h = await treasuryFixture({ persistence });
  const s = h.signed(), a = await h.treasury.authorize(h.tenant, s);
  let release, reached, held = false;
  const gate = new Promise(resolve => { release = resolve; }), entered = new Promise(resolve => { reached = resolve; });
  const competing = h.make(createSwarmStore({ load: persistence.load, compareAndSwap: async (tenant, version, state) => {
    if (!held && state.financial?.effects.length) { held = true; reached(); await gate; }
    return persistence.compareAndSwap(tenant, version, state);
  } }));
  const commit = competing.commit(h.tenant, a.mandateId, s);
  await entered;
  await h.control.contain(h.tenant, 'operator', { kind: 'agent', id: 'agent:1' }, 'stop before destination commitment');
  release();
  assert.equal((await commit).decision, 'DENY');
  assert.equal((await h.treasury.destination(h.tenant)).length, 0);
  assert.equal((await h.treasury.replay(h.tenant)).valid, true);
});
