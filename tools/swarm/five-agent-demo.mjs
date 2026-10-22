import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SwarmContainment, heartbeatMac, swarmRequestDigest, verifySwarmReplay } from '../../lib/swarm/containment.ts';
import { createSwarmStore } from '../../lib/swarm/store.ts';
import { swarmNativeGuard } from '../../lib/swarm/native-guard.ts';
import { executeAuthorizedAction } from '../../lib/operational-entities/native-enforcement.ts';
import { cancellationRuntime, signCancellation, verifyCancellationEvidence } from '../../lib/swarm/cancellation.ts';
import { projectSwarmReceipt } from '../../lib/swarm/evidence-projection.ts';
import { hashCanonical } from '../../src/lib/trust-core/hash.ts';

export const scenarios = ['ALLOW', 'REVIEW', 'DENY', 'revocation', 'budget-exhaustion', 'forged-delegation', 'cross-tenant', 'ambiguous-cancellation', 'missing-evidence'];
export const roles = ['Coordinator', 'Research', 'Analysis', 'Execution', 'Audit'];
const tenant = '10000000-0000-4000-8000-000000000001';
const authority = '10000000-0000-4000-8000-000000000003';
const operations = Object.fromEntries(roles.map(role => [role, role === 'Execution' ? 'REFUND' : role.toUpperCase()]));

/** Entirely local: synthetic policy/identity/destination dependencies, real enforcement controls. */
export async function runScenario(scenario) {
  if (!scenarios.includes(scenario)) throw Error('Unknown scenario');
  const now = Date.parse('2026-10-22T12:00:00Z');
  const snapshots = new Map(), destination = [], steps = [], attempts = [], projections = [];
  const secret = randomBytes(32).toString('hex');
  const actors = new Map(roles.map(id => [id, { id, tenantId: tenant, kind: 'agent', controlledBy: [], permissions: [], credentialVersion: 1, expiresAt: now + 3600000 }]));
  actors.set('operator', { id: 'operator', tenantId: tenant, kind: 'human', controlledBy: [], permissions: ['swarm:manage', 'swarm:contain', 'swarm:audit', 'swarm:reconcile'], expiresAt: now + 3600000 });
  const store = createSwarmStore({
    load: async t => structuredClone(snapshots.get(t) ?? null),
    compareAndSwap: async (t, version, state) => {
      if ((snapshots.get(t)?.version ?? 0) !== version) return false;
      snapshots.set(t, { version: version + 1, state: structuredClone(state) }); return true;
    },
  });
  const deps = {
    store, now: () => now, authenticate: async proof => actors.get(proof) ?? null, heartbeatKey: async () => secret,
    verifyOutcome: async (t, lease, ref) => {
      const receipt = destination.find(r => r.leaseId === lease.id && r.digest === ref && r.tenantId === t);
      if (!receipt) throw Error('UNVERIFIED_LOCAL_DESTINATION');
      return { completed: true, evidenceRef: receipt.digest, spentMinor: receipt.amountMinor };
    },
    resolve: async req => {
      const role = req.operationalEntityId, execution = role === 'Execution';
      const root = { id: authority, tenantId: tenant, grantorId: 'synthetic-enterprise', grantorType: 'organization', granteeId: 'Coordinator', granteeType: 'ai_agent', scope: Object.values(operations), maxDelegationDepth: 2, issuedAt: new Date(now - 60000).toISOString(), expiresAt: new Date(now + 3600000).toISOString() };
      const child = { ...root, id: `10000000-0000-4000-8000-00000000001${roles.indexOf(role)}`, parentGrantId: authority, grantorId: 'Coordinator', grantorType: 'ai_agent', granteeId: role, scope: [operations[role]], maxDelegationDepth: 0 };
      if (execution && scenario === 'forged-delegation') child.grantorId = 'forged-coordinator';
      return {
        decision: execution && ['REVIEW', 'DENY'].includes(scenario) ? scenario : 'ALLOW', policyAvailable: true, providerAvailable: true,
        graph: { tenantId: tenant, subjectId: role, workflowId: 'workflow:demo', action: req.action.type, resource: req.action.target, purpose: 'synthetic-refund', grants: role === 'Coordinator' ? [root] : [root, child] },
        classification: { correlationId: `task:${role}`, resource: 'synthetic:customer', operation: operations[role], units: 1, limit: 100, mandatoryRestriction: false, sensitive: false, transfer: 'NONE', transferPermitted: false, policyVersion: 'demo:v1', evidenceRefs: ['synthetic-policy:v1'], ...(execution ? { budget: { id: 'refund-budget', currency: 'EUR', amountMinor: 100, limitMinor: 100, maxParallel: 1 } } : {}) },
      };
    },
  };
  const control = new SwarmContainment(deps);
  const collective = { id: 'swarm:demo', entityType: 'AGENT_SWARM', objective: 'synthetic-refund', workflowId: 'workflow:demo', originalAuthority: authority, state: 'ACTIVE', maxMembers: 5, orchestratorId: 'Coordinator', responsiblePrincipalId: 'operator' };
  for (const id of roles) {
    await control.register(tenant, 'operator', collective, { id, swarmId: collective.id, parentId: id === 'Coordinator' ? null : 'Coordinator', credentialVersion: 1, state: 'ACTIVE', heartbeatAt: 0, heartbeatSequence: 0, expiresAt: now + 3600000 });
    const claims = { tenantId: tenant, memberId: id, version: 1, sequence: 1, at: now };
    await control.heartbeat(tenant, id, claims, heartbeatMac(secret, claims));
  }
  async function run(role, input, work, suffix = '1') {
    const req = { requestId: `${role}:${suffix}`, enterpriseId: tenant, transactionId: '10000000-0000-4000-8000-000000000002', operationalEntityId: role, authorityId: authority, delegationId: `10000000-0000-4000-8000-00000000001${roles.indexOf(role)}`, action: { type: operations[role], target: 'synthetic:customer', environment: 'test', consequence: 'LOW', payloadDigest: hashCanonical(input) }, decision: 'ALLOW', actionDigest: hashCanonical(input), decisionDigest: hashCanonical({ policy: 'demo:v1' }), idempotencyKey: `${role}:${suffix}`, requestedAt: new Date(now).toISOString() };
    let output = null, error = null;
    let result;
    try {
      result = await executeAuthorizedAction(req, {
        now: () => new Date(now).toISOString(), findByIdempotencyKey: async () => null,
        loadCurrentState: async () => ({ enterpriseId: tenant, operationalEntityId: role, authorityId: authority, delegationId: req.delegationId, authorityActive: true, delegationActive: true, identityVerified: true, ownerConfirmed: true, runtimeContinuity: 'MATCH' }),
        reserveRequest: async () => ({ created: true }), requireSwarmGuard: true, swarmGuard: swarmNativeGuard(control, tenant, role),
        adapter: { execute: async () => {
          output = await work(req);
          steps.push({ role, inputDigest: hashCanonical(input), output, outputDigest: hashCanonical(output), leaseId: swarmRequestDigest(req) });
          return { status: 'ACCEPTED', adapterReference: `local:${role}`, acknowledgedAt: new Date(now).toISOString(), executionClaim: null, runtimeObservation: null, destinationObservation: null, reasonCodes: [] };
        } },
      });
    } catch (e) { if (scenario !== 'cross-tenant' || role !== 'Execution' || e.message !== 'SWARM_AUTHENTICATION_DENIED') throw e; error = e.message; }
    const resolved = await deps.resolve(req);
    attempts.push({ role, identity: structuredClone(actors.get(role)), delegationChain: resolved.graph.grants, policyDecision: resolved.decision, request: req, requested: result?.requested ?? false, error, result: result ?? null });
    return { req, output, requested: result?.requested ?? false };
  }
  const plan = await run('Coordinator', { objective: 'refund eligible synthetic order' }, async () => ({ customer: 'synthetic:customer', order: 'synthetic:order', tasks: roles.slice(1) }));
  const research = await run('Research', plan.output, async () => ({ ...plan.output, paidMinor: 100, duplicateCharge: true, source: 'synthetic-ledger:v1' }));
  const analysis = await run('Analysis', research.output, async () => ({ customer: research.output.customer, refundMinor: research.output.duplicateCharge ? research.output.paidMinor : 0, evidenceDigest: hashCanonical(research.output) }));
  if (scenario === 'revocation') await control.contain(tenant, 'operator', { kind: 'agent', id: 'Execution' }, 'synthetic credential revocation');
  if (scenario === 'cross-tenant') {
    actors.get('Execution').tenantId = 'foreign-tenant';
    await assert.rejects(control.evidence(tenant, 'Execution'), /SWARM_AUTHENTICATION_DENIED/);
  }
  const execute = req => {
    const body = { tenantId: tenant, leaseId: swarmRequestDigest(req), amountMinor: analysis.output.refundMinor, customer: analysis.output.customer };
    const receipt = { ...body, digest: hashCanonical(body) }; destination.push(receipt); return receipt;
  };
  const execution = await run('Execution', analysis.output, execute);
  let cancellation = null;
  if (execution.requested && !['ambiguous-cancellation', 'missing-evidence'].includes(scenario)) await control.outcome(tenant, 'operator', swarmRequestDigest(execution.req), execution.output.digest);
  if (scenario === 'missing-evidence') {
    await assert.rejects(control.outcome(tenant, 'operator', swarmRequestDigest(execution.req), null), /UNVERIFIED_LOCAL_DESTINATION/);
    await run('Execution', analysis.output, execute, 'missing-evidence-retry');
  }
  if (scenario === 'budget-exhaustion') await run('Execution', analysis.output, execute, 'overflow');
  if (scenario === 'ambiguous-cancellation') {
    const keys = generateKeyPairSync('ed25519');
    const runtime = cancellationRuntime({ store, now: deps.now, authenticate: () => deps.authenticate('operator'), key: async () => ({ publicKey: keys.publicKey, tenantId: tenant, issuerId: 'operator', swarmIds: [collective.id], expiresAt: now + 60000, revoked: false }), runtimeKey: () => secret });
    const command = { domain: 'tenente:cancellation:v1', tenantId: tenant, swarmId: collective.id, taskId: 'task:Execution', executionId: swarmRequestDigest(execution.req), reason: 'synthetic lost acknowledgement', issuer: 'operator', keyId: 'demo:ephemeral', nonce: 'demo:cancel:123456789', issuedAt: now, expiresAt: now + 30000, correlationId: 'demo:cancel' };
    const receipt = await runtime.deliver(tenant, signCancellation(command, keys.privateKey));
    cancellation = { receipt, signatureVerified: verifyCancellationEvidence(receipt, secret), publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString() };
    await run('Execution', analysis.output, execute, 'after-cancel');
  }
  await run('Audit', { attempts, destination }, async () => {
    const journal = await control.evidence(tenant, 'operator');
    const receiptVerification = destination.map(({ digest, ...body }) => ({
      digest, integrityVerified: digest === hashCanonical(body),
      reconciled: journal.some(event => event.kind === 'DESTINATION_RECONCILED' && event.details.evidenceRef === digest),
    }));
    return { receiptVerification, replayVerified: verifySwarmReplay(journal, tenant), observedLocalEffects: destination.length, journalHead: journal.at(-1).digest, cancellationStatus: cancellation?.receipt.details.cancellationStatus ?? null };
  });
  const state = await store.transact(tenant, s => structuredClone(s));
  for (const attempt of attempts) {
    const lease = state.leases[swarmRequestDigest(attempt.request)];
    const receipts = state.events.filter(event => event.details.requestDigest === swarmRequestDigest(attempt.request) || (lease && event.details.leaseId === lease.id));
    attempt.executionOutcome = lease?.state ?? 'NOT_DISPATCHED';
    attempt.receiptVerification = { count: receipts.length, verified: receipts.length > 0 && receipts.every(({ digest, ...body }) => digest === hashCanonical(body)), replayVerified: verifySwarmReplay(state.events, tenant) };
  }
  for (const event of state.events) await projectSwarmReceipt(event, async (table, row) => projections.push({ table, row }));
  return { scenario, tenant, agents: roles, steps, attempts, destination, cancellation, state, projections, replayVerified: verifySwarmReplay(state.events, tenant) };
}

export function validateScenario(report) {
  const { scenario, attempts, destination, state } = report;
  assert.equal(report.replayVerified, true);
  assert.deepEqual(Object.keys(state.members), roles);
  assert.deepEqual(report.steps.filter(s => s.role !== 'Execution').map(s => s.role), ['Coordinator', 'Research', 'Analysis', 'Audit']);
  const expected = ['ALLOW', 'budget-exhaustion', 'ambiguous-cancellation', 'missing-evidence'].includes(scenario);
  assert.equal(destination.length, expected ? 1 : 0);
  assert.equal(attempts.find(a => a.role === 'Execution').requested, expected);
  if (['budget-exhaustion', 'ambiguous-cancellation'].includes(scenario)) assert.equal(attempts.filter(a => a.role === 'Execution').at(-1).requested, false);
  const reasons = state.events.flatMap(e => e.details.reasons ?? []);
  const required = { REVIEW: 'CANONICAL_REVIEW', DENY: 'CANONICAL_DENY', revocation: 'CREDENTIAL_REVOKED', 'forged-delegation': 'AUTHORITY_INVALID' }[scenario];
  if (required) assert.ok(reasons.includes(required), required);
  if (scenario === 'cross-tenant') assert.ok(attempts.find(a => a.role === 'Execution').result.eligibility.reasonCodes.includes('SWARM_ADMISSION_UNAVAILABLE'));
  if (scenario === 'budget-exhaustion') {
    assert.equal(state.budgets['refund-budget'].spentMinor, 100);
    assert.ok(reasons.includes('SHARED_BUDGET_EXCEEDED'));
  }
  if (scenario === 'missing-evidence') {
    assert.equal(state.budgets['refund-budget'].reservedMinor, 100);
    assert.equal(state.budgets['refund-budget'].spentMinor, 0);
    assert.equal(attempts.find(a => a.role === 'Execution').executionOutcome, 'UNKNOWN');
    assert.equal(attempts.filter(a => a.role === 'Execution').at(-1).requested, false);
    assert.ok(state.events.some(e => e.kind === 'OUTCOME_EVIDENCE_REJECTED'));
    assert.equal(report.steps.find(s => s.role === 'Audit').output.receiptVerification[0].reconciled, false);
  }
  if (scenario === 'ambiguous-cancellation') {
    assert.equal(report.cancellation.receipt.details.cancellationStatus, 'CANCELLATION_UNCONFIRMED');
    assert.equal(report.cancellation.receipt.details.externalRollbackClaimed, false);
    assert.equal(report.cancellation.signatureVerified, true);
    assert.equal(state.budgets['refund-budget'].reservedMinor, 100);
    assert.ok(reasons.includes('SWARM_TASK_CANCELLED'));
  }
  assert.ok(report.projections.some(p => p.table === 'operational_entity_native_replay_events'));
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = resolve('artifacts/swarm-demo');
  await mkdir(output, { recursive: true });
  const results = [];
  for (const scenario of scenarios) {
    const report = await runScenario(scenario); validateScenario(report);
    const content = JSON.stringify(report, null, 2) + '\n';
    await writeFile(resolve(output, `${scenario}.json`), content);
    results.push({ scenario, passed: true, effects: report.destination.length, receipts: report.state.events.length, evidenceDigest: hashCanonical(report) });
    console.log(`${scenario}: PASS (${report.destination.length} local effects)`);
  }
  await writeFile(resolve(output, 'summary.json'), JSON.stringify({ schemaVersion: 1, mode: 'synthetic-local', results, passed: results.length, failed: 0 }, null, 2) + '\n');
  console.log(`Evidence: ${output}`);
}


