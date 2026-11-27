import assert from 'node:assert/strict';
import test from 'node:test';
import { checkUsageLimit } from '../lib/billing/checkUsageLimit.ts';

const user = { id: 'billing-fixture-user', email: 'usage-fixture@example.test' };

function database(count, error = null, plan = 'free') {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(table);
      const query = {
        select() { return query; },
        eq() { return query; },
        order() { return query; },
        limit() { return query; },
        async maybeSingle() { return { data: { plan, status: 'active' }, error: null }; },
        then(resolve, reject) { return Promise.resolve({ count, error }).then(resolve, reject); },
      };
      return query;
    },
  };
}

for (const feature of ['passport', 'evidence_upload']) {
  test(`${feature} denies usage when its database count fails or is unavailable`, async () => {
    for (const [count, error] of [[0, { message: 'synthetic timeout', code: '57014' }], [null, null]]) {
      const result = await checkUsageLimit(database(count, error), user, feature);
      assert.equal(result.ok, false);
      assert.equal(result.current, null);
      assert.equal(result.code, 'USAGE_LOOKUP_UNAVAILABLE');
    }
  });
}

test('valid zero usage remains allowed and an exhausted passport allowance is denied', async () => {
  assert.equal((await checkUsageLimit(database(0), user, 'passport')).ok, true);
  const exhausted = await checkUsageLimit(database(1), user, 'passport');
  assert.equal(exhausted.ok, false);
  assert.equal(exhausted.current, 1);
  assert.equal(exhausted.code, undefined);
});

test('an unlimited subscription does not issue a count query', async () => {
  const db = database(null, { message: 'must not be queried' }, 'enterprise');
  assert.equal((await checkUsageLimit(db, user, 'passport')).ok, true);
  assert.deepEqual(db.calls, ['subscriptions']);
});
