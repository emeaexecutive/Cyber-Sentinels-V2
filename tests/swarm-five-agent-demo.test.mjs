import assert from 'node:assert/strict';
import test from 'node:test';
import { runScenario, scenarios, validateScenario } from '../tools/swarm/five-agent-demo.mjs';
import { verifySwarmReplay } from '../lib/swarm/containment.ts';
import { projectSwarmReceipt } from '../lib/swarm/evidence-projection.ts';
import { hashCanonical } from '../src/lib/trust-core/hash.ts';

for (const scenario of scenarios) test(`Five-agent demonstration: ${scenario}`, async () => {
  const report = await runScenario(scenario);
  validateScenario(report);
  for (const attempt of report.attempts) {
    assert.equal(attempt.identity.id, attempt.role);
    assert.equal(attempt.delegationChain[0].granteeId, 'Coordinator');
    assert.equal(attempt.delegationChain.at(-1).granteeId, attempt.role);
    assert.ok(['ALLOW', 'REVIEW', 'DENY'].includes(attempt.policyDecision));
    assert.equal(attempt.receiptVerification.replayVerified, true);
    if (scenario !== 'cross-tenant' || attempt.role !== 'Execution') assert.equal(attempt.receiptVerification.verified, true);
  }
  const audit = report.steps.find(s => s.role === 'Audit').output;
  assert.equal(audit.replayVerified, true);
  assert.ok(audit.receiptVerification.every(receipt => receipt.integrityVerified));
  const research = report.steps.find(s => s.role === 'Research');
  const analysis = report.steps.find(s => s.role === 'Analysis');
  assert.equal(analysis.inputDigest, research.outputDigest);
  assert.equal(report.attempts.find(a => a.role === 'Execution').request.action.payloadDigest, analysis.outputDigest);
  const changed = structuredClone(report.state.events);
  changed[0].details.authorityConferred = true;
  assert.equal(verifySwarmReplay(changed, report.tenant), false);
  assert.equal(verifySwarmReplay(report.state.events, 'foreign'), false);
  await assert.rejects(projectSwarmReceipt(changed[0], async () => assert.fail('Tampered evidence projected')), /INTEGRITY/);
  for (const effect of report.destination) {
    const { digest, ...body } = effect;
    assert.equal(digest, hashCanonical(body));
    assert.ok(report.state.leases[effect.leaseId]);
  }
});
