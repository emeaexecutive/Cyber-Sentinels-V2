// Run with node --import=tsx. Contracts and field requirements come from actual source.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { publicApiOpenApi } from '../../lib/public-api/v1/openapi.ts';

const methods = new Set(['get', 'post', 'patch', 'put', 'delete']);
const cases = [];
for (const [path, operations] of Object.entries(publicApiOpenApi.paths)) {
  for (const [method, operation] of Object.entries(operations)) {
    if (!methods.has(method)) continue;
    const successful = Object.keys(operation.responses ?? {}).filter(status => /^2\d\d$/.test(status)).map(Number);
    if (!successful.length) throw Error('No contract success response: ' + operation.operationId);
    cases.push({
      id: 'positive-' + operation.operationId,
      operationId: operation.operationId,
      method: method.toUpperCase(), path,
      syntheticOnly: true,
      secretHeaders: {
        authorization: path.startsWith('/api/v1/workloads/') ? 'ACCEPTANCE_WORKLOAD_AUTHORIZATION' : 'ACCEPTANCE_API_AUTHORIZATION',
        cookie: 'ACCEPTANCE_VERCEL_SESSION',
      },
      expectedStatuses: successful,
      ...(operation.requestBody?.required ? { bodyInput: operation.operationId } : {}),
      contractRequirements: {
        scopes: operation['x-required-scopes'] ?? [],
        parameters: operation.parameters ?? [],
        requestSchema: operation.requestBody?.content?.['application/json']?.schema ?? null,
      },
    });
  }
}
if (cases.length !== 31 || new Set(cases.map(item => item.operationId)).size !== 31) throw Error('Current 31-operation contract changed');
fs.writeFileSync(new URL('hosted-positive-cases.template.json', import.meta.url), JSON.stringify(cases, null, 2) + '\n');
const sources = ['../../lib/public-api/v1/openapi.ts', '../../lib/public-api/v1/contracts.ts', '../../lib/operational-incidents/openapi.ts'];
fs.writeFileSync(new URL('hosted-positive-contract.json', import.meta.url), JSON.stringify({
  status: 'PREPARED_NOT_RUN_REQUIRES_ACTUAL_APPROVED_INPUTS',
  operationCount: cases.length,
  sources: sources.map(source => ({ path: source, normalizedSha256: crypto.createHash('sha256').update(fs.readFileSync(new URL(source, import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex') })),
  inputs: 'Supply actual resource IDs in context.bindings and cryptographic/provider/request bodies plus required Idempotency-Key values in context.caseInputs[operationId]. No example or fabricated body is treated as a successful test.',
  executionOrder: 'The manifest retains contract order, not provisioning order. Select approved cases against existing actual fixtures; run SDK registration/identity/authority journey before resource reads and revocations.',
  independentEffects: 'HTTP status success is not destination prevention, persistence, SDK parity or full enterprise acceptance.',
}, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PREPARED_NOT_RUN', operations: cases.length, hostedRequests: 0 }));
