import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync('app/api/trust/transactions/[transactionId]/receipt/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

test('portable Receipt exposes decision-time approval references without raw model observations', async () => {
  const approval = { status: 'APPROVED', evidenceReference: 'evidence:controlled-approval', evidenceDigest: 'a'.repeat(64), approvalAuthority: 'operator:qualification' };
  const loaded = { exports: {} };
  const load = id => {
    if (id === '@/lib/supabase/server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'fixture-user' } } }) } }) };
    if (id === '@/lib/protected-workflows/server') return { loadProtectedWorkflowReceiptContext: async () => null };
    if (id === '@/lib/trust-transaction/server') return {
      CanonicalTransactionError: class extends Error {},
      loadCanonicalTrustTransactionHistory: async () => ({ receipt: { transactionId: 'fixture-transaction', enterpriseId: 'fixture-tenant', decision: 'ALLOW', evidence: [], authorityLineageReferences: [], decisionTimeSnapshot: { modelApproval: approval, modelStateIntegrity: { rawFixtureObservation: 'must-not-be-exported' } } } }),
    };
    return require(id);
  };
  new Function('require', 'module', 'exports', source)(load, loaded, loaded.exports);
  const response = await loaded.exports.GET(new Request('https://staging.cybersentinels.com/api/trust/transactions/fixture/receipt'), { params: Promise.resolve({ transactionId: 'fixture-transaction' }) });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.modelApproval, approval);
  assert.ok(!JSON.stringify(body).includes('must-not-be-exported'));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
