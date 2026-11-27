import { generateKeyPairSync, sign } from 'node:crypto';
import { fixture, tenant, authority } from './swarm-control.mjs';
import { appendSwarmEvent } from '../../lib/swarm/containment.ts';
import { TreasurySandbox, paymentSigningPayload } from '../../lib/treasury/sandbox.ts';

export async function treasuryFixture(options = {}) {
  const h = await fixture(options), keys = new Map(), receiptKeys = generateKeyPairSync('ed25519');
  await h.add('agent:2');
  for (const id of ['agent:1', 'agent:2']) {
    const pair = generateKeyPairSync('ed25519'); keys.set(id, pair);
    await h.control.enrollRuntimeKey(tenant, 'operator', id, pair.publicKey.export({ type: 'spki', format: 'pem' }));
  }
  await h.store.transact(tenant, s => {
    const c = s.collectives['swarm:1']; c.responsiblePrincipalId = 'owner';
    c.executionPolicy = { tasks: [], version: 'v1', allowedTools: ['PAYMENT'], environments: ['sandbox'], resources: ['supplier:approved'], evidenceRefs: ['fixture:enrollment'] };
    appendSwarmEvent(s, h.deps.now(), 'MEMBERSHIP_CHANGED', 'operator', c.id, { syntheticFixture: true, accountablePrincipal: 'owner' });
  });
  const policy = { id: 'treasury:EUR', version: 'v1', transactionLimit: 5000000, dailyLimit: 10000000, rollingLimit: 10000000, rollingMs: 86400000, approvalThreshold: 10000000, mandateTtlMs: 60000, velocityLimit: 20, stopped: false,
    routes: [{ currency: 'EUR', asset: 'FIAT', network: 'MOCK', chainId: '', contract: '', beneficiary: 'supplier:1', destination: 'supplier:approved', provider: 'controlled:sandbox' }] };
  const dependencies = { store: h.store, now: h.deps.now, policy: () => policy, authenticate: h.deps.authenticate,
    approverActive: (t, id) => { const a = h.actors.get(id); return !!a && a.tenantId === t && a.kind === 'human' && !a.controlledBy.length && a.permissions.includes('swarm:approve') && a.expiresAt > h.deps.now(); },
    authority: (s, p) => (options.graph ?? (g => g))({ tenantId: s.tenantId, subjectId: p.agentId, workflowId: 'workflow:1', action: 'PAYMENT', purpose: 'TREASURY_PAYMENT', resource: p.destination, grants: [{ id: authority, tenantId: s.tenantId, grantorId: 'owner', grantorType: 'human', granteeId: p.agentId, granteeType: 'ai_agent', scope: ['PAYMENT'], resourceScope: ['supplier:approved'], maxDelegationDepth: 2, issuedAt: new Date(h.deps.now() - 1000).toISOString(), expiresAt: new Date(h.deps.now() + 3600000).toISOString() }] }),
    signingKey: receiptKeys.privateKey, signingKeyId: 'sandbox:receipt:v1' };
  const make = store => new TreasurySandbox({ ...dependencies, store: store ?? h.store });
  const payment = (overrides = {}) => ({ tenantId: tenant, agentId: 'agent:1', requestId: 'payment:0001', amountMinor: 5000000, ...policy.routes[0], policyVersion: 'v1', expiresAt: h.deps.now() + 60000, environment: 'sandbox', ...overrides });
  const signed = (p = payment(), privateKey = keys.get(p.agentId).privateKey) => ({ payment: p, signature: sign(null, Buffer.from(paymentSigningPayload(p)), privateKey).toString('base64url') });
  return { ...h, policy, keys, receiptKeys, make, treasury: make(), payment, signed, tenant };
}
