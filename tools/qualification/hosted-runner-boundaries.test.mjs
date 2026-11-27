import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { acceptanceHeaders, boundedResponseJson, sameSealedText, prepareAcceptanceCases, executeAcceptanceCases } from './hosted-runner-boundaries.mjs';

const origin = 'https://synthetic-acceptance.example.test';
const context = { origin, sourceSha: 'a'.repeat(40), deploymentId: 'synthetic-deployment', mutationsApproved: true, allowedMutationCaseIds: ['decision'] };
test('public acceptance headers permit bounded idempotency keys and deny credential/header injection', () => {
  assert.deepEqual(acceptanceHeaders({ 'Idempotency-Key': 'synthetic:retry:1' }), { 'idempotency-key': 'synthetic:retry:1' });
  for (const headers of [{ authorization: 'secret' }, { cookie: 'secret' }, { 'idempotency-key': 'short' }, { 'idempotency-key': 'x'.repeat(121) }, { 'idempotency-key': 'synthetic\r\ninject' }, { host: 'foreign.test' }]) assert.throws(() => acceptanceHeaders(headers));
});
test('runner forwards the actual bounded retry key while keeping credentials and bodies out of receipts', async () => {
  let calls = 0;
  const result = await executeAcceptanceCases(context, [{ id: 'decision', operationId: 'requestTrustDecision', method: 'POST', path: '/api/v1/trust/decisions', syntheticOnly: true, headers: { 'Idempotency-Key': 'synthetic:retry:1' }, secretHeaders: { authorization: 'ACCEPTANCE_API_AUTHORIZATION' }, body: { action: { target: 'synthetic:target' } }, expectedStatuses: [201], expectedFields: { decision: 'ALLOW' } }], {
    env: { ACCEPTANCE_API_AUTHORIZATION: 'Bearer synthetic-secret' }, fetchImpl: async (_url, init) => {
      calls++; assert.equal(init.headers['idempotency-key'], 'synthetic:retry:1'); assert.equal(init.headers.authorization, 'Bearer synthetic-secret');
      return Response.json({ decision: 'ALLOW' }, { status: 201 });
    },
  });
  assert.equal(calls, 1); assert.equal(result.receipts[0].ok, true); assert.equal(result.status, 'HTTP_CASES_PASS_NOT_FULL_JOURNEY');
  assert.equal(JSON.stringify(result).includes('synthetic-secret'), false); assert.match(result.receipts[0].requestDigest, /^[a-f0-9]{64}$/);
});
test('all missing fixture bodies and path bindings fail before any HTTP request', async () => {
  let calls = 0; const options = { fetchImpl: async () => { calls++; return Response.json({}); } };
  const cases = [{ id: 'decision', method: 'POST', path: '/api/v1/agents/{agentId}/proof', syntheticOnly: true, bodyInput: 'submitAgentProof', expectedStatuses: [200] }];
  await assert.rejects(executeAcceptanceCases(context, cases, options), /Approved case body absent/);
  await assert.rejects(executeAcceptanceCases({ ...context, caseInputs: { submitAgentProof: { body: {} } } }, cases, options), /Approved path binding absent/);
  assert.equal(calls, 0);
  const prepared = prepareAcceptanceCases({ ...context, bindings: { agentId: 'agent:real/registered' }, caseInputs: { submitAgentProof: { body: { signature: 'provided-approved-proof' } } } }, cases, new URL(origin));
  assert.equal(prepared[0].url.pathname, '/api/v1/agents/agent%3Areal%2Fregistered/proof');
});
test('chunked response limit cancels without accumulating the rest of an oversized body', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(1024)); }, cancel() { cancelled = true; } }));
  await assert.rejects(boundedResponseJson(response, 1500), /exceeds limit/); assert.equal(cancelled, true);
});
test('Windows CRLF checkout preserves sealed Git source identity but content changes do not', () => {
  assert.equal(sameSealedText(Buffer.from('export const a = 1;\n'), Buffer.from('export const a = 1;\r\n')), true);
  assert.equal(sameSealedText(Buffer.from('export const a = 1;\n'), Buffer.from('export const a = 2;\r\n')), false);
  assert.throws(() => sameSealedText(Buffer.from([255]), Buffer.from('text')));
});
test('existing command-line runner remains offline without execute and preserves explicit status', () => {
  const runner = fileURLToPath(new URL('./hosted-acceptance.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [runner], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).status, 'PREPARED_NOT_RUN');
});
