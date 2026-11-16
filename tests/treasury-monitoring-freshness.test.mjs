import assert from 'node:assert/strict';
import test from 'node:test';
import { financialSignals } from '../lib/treasury/intelligence.ts';

test('monitoring expires silent-tenant denials against observation time', () => {
  const now = 1800000000000;
  const event = (at, actorId = 'agent:a', tenantId = 'tenant:a') => ({
    tenantId, actorId, at, kind: 'FINANCIAL_DENY', subjectId: 'request:a',
    digest: 'fixture-evidence', details: { reasons: ['DAILY_LIMIT'] },
  });
  const events = [event(now - 60000), event(now - 1, 'agent:b')];
  assert.ok(financialSignals(events, 'tenant:a', now).some(s => s.category === 'COORDINATED_LIMIT_ATTEMPT'));
  assert.deepEqual(financialSignals(events, 'tenant:a', now + 60001), []);
  assert.deepEqual(financialSignals([event(now + 1), event(NaN), event(now, 'agent:c', 'foreign')], 'tenant:a', now), []);
  assert.deepEqual(financialSignals(events, 'tenant:a', NaN), []);
});
