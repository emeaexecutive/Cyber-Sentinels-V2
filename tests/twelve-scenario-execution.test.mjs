import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { executeAuthorizedAction } from '../lib/operational-entities/native-enforcement.ts';

function fixture() {
  const input = { enterpriseId: randomUUID(), transactionId: randomUUID(), operationalEntityId: 'agent:worker', authorityId: randomUUID(), delegationId: randomUUID(), action: { type: 'READ', target: 'project:1', environment: 'test' }, decision: 'ALLOW', decisionDigest: 'a'.repeat(64), idempotencyKey: randomUUID() };
  let time = Date.now(), effects = 0;
  const current = { ...input, authorityActive: true, delegationActive: true, identityVerified: true, ownerConfirmed: true, runtimeContinuity: 'MATCH' };
  const deps = { now: () => new Date(time).toISOString(), loadCurrentState: async () => ({ ...current }), findByIdempotencyKey: async () => null, reserveRequest: async () => ({ created: true }), adapter: { execute: async () => { effects++; return { status: 'ACCEPTED' }; } } };
  return { input, current, deps, effects: () => effects, advance: ms => { time += ms; } };
}

test('09: authority revoked during reservation causes zero tool effects', async () => {
  const h = fixture();
  h.deps.reserveRequest = async () => { h.current.authorityActive = false; return { created: true }; };
  const result = await executeAuthorizedAction(h.input, h.deps);
  assert.equal(h.effects(), 0);
  assert.equal(result.requested, false);
  assert.ok(result.eligibility.reasonCodes.includes('ENFORCEMENT_CANCELLED_AUTHORITY_CHANGED'));
});

test('09: approval expiring during reservation cannot authorize dispatch', async () => {
  const h = fixture(); h.input.action.consequence = 'HIGH';
  const { deriveEnforcementActionDigest } = await import('../lib/operational-entities/native-enforcement.ts');
  h.input.approval = { approvalId: randomUUID(), enterpriseId: h.input.enterpriseId, transactionId: h.input.transactionId, operationalEntityId: h.input.operationalEntityId, actionDigest: deriveEnforcementActionDigest(h.input), approvedBy: randomUUID(), approvedAt: h.deps.now(), expiresAt: new Date(Date.parse(h.deps.now()) + 1000).toISOString(), nonTransferable: true };
  h.deps.reserveRequest = async () => { h.advance(2000); return { created: true }; };
  const result = await executeAuthorizedAction(h.input, h.deps);
  assert.equal(h.effects(), 0); assert.equal(result.requested, false);
  assert.ok(result.eligibility.reasonCodes.includes('HUMAN_APPROVAL_INVALID'));
});

test('10: final current-state outage fails closed before the tool', async () => {
  const h = fixture(); let loads = 0;
  h.deps.loadCurrentState = async () => { if (++loads > 1) throw new Error('state unavailable'); return h.current; };
  await assert.rejects(executeAuthorizedAction(h.input, h.deps), /state unavailable/);
  assert.equal(h.effects(), 0);
});

test('09: approval expiring inside an asynchronous swarm guard also blocks dispatch', async () => {
  const h = fixture(); h.input.action.consequence = 'CRITICAL';
  const { deriveEnforcementActionDigest } = await import('../lib/operational-entities/native-enforcement.ts');
  h.input.approval = { approvalId: randomUUID(), enterpriseId: h.input.enterpriseId, transactionId: h.input.transactionId, operationalEntityId: h.input.operationalEntityId, actionDigest: deriveEnforcementActionDigest(h.input), approvedBy: randomUUID(), approvedAt: h.deps.now(), expiresAt: new Date(Date.parse(h.deps.now()) + 1000).toISOString(), nonTransferable: true };
  h.deps.swarmGuard = { admit: async () => ({ allowed: true, reasonCodes: [] }), dispatch: async () => { h.advance(2000); return { allowed: true, reasonCodes: [] }; } };
  const result = await executeAuthorizedAction(h.input, h.deps);
  assert.equal(result.requested, false); assert.equal(h.effects(), 0);
});

test('02: still-current authorization executes once after both state checks', async () => {
  const h = fixture(); let loads = 0;
  h.deps.loadCurrentState = async () => { loads++; return h.current; };
  assert.equal((await executeAuthorizedAction(h.input, h.deps)).requested, true);
  assert.equal(loads, 2); assert.equal(h.effects(), 1);
});

test('05: REVIEW never reserves or dispatches', async () => {
  const h = fixture(); h.input.decision = 'REVIEW';
  h.deps.reserveRequest = async () => assert.fail('review reserved');
  assert.equal((await executeAuthorizedAction(h.input, h.deps)).requested, false);
  assert.equal(h.effects(), 0);
});
