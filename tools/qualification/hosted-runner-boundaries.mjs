import crypto from 'node:crypto';

const publicHeaders = new Set(['idempotency-key', 'x-enterprise-id']);
export function acceptanceHeaders(values = {}) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw Error('Invalid case headers');
  const result = {};
  for (const [rawName, value] of Object.entries(values)) {
    const name = rawName.toLowerCase();
    if (!publicHeaders.has(name) || typeof value !== 'string') throw Error('Case header not permitted');
    if (name === 'idempotency-key' && !/^[A-Za-z0-9_.:-]{8,120}$/.test(value)) throw Error('Invalid idempotency key');
    if (name === 'x-enterprise-id' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw Error('Invalid enterprise header');
    if (Object.hasOwn(result, name)) throw Error('Duplicate case header');
    result[name] = value;
  }
  return result;
}

export async function boundedResponseJson(response, maximumBytes = 1_000_000) {
  const reader = response.body?.getReader();
  if (!reader) throw Error('Response body absent');
  const parts = []; let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) { await reader.cancel(); throw Error('Response exceeds limit'); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(parts);
  const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  return { value, digest: crypto.createHash('sha256').update(bytes).digest('hex') };
}

/** Git text files may be checked out as CRLF on Windows; other content changes still fail. */
export function sameSealedText(blob, checkout) {
  const decode = bytes => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replace(/\r\n/g, '\n');
  return decode(blob) === decode(checkout);
}

export function prepareAcceptanceCases(context, cases, base) {
  if (!Array.isArray(cases) || !cases.length || cases.length > 100) throw Error('Bounded case list required');
  const ids = new Set();
  return cases.map(item => {
    if (!item.id || ids.has(item.id) || typeof item.path !== 'string' || !item.path.startsWith('/api/')
      || item.path.startsWith('//') || !Array.isArray(item.expectedStatuses) || !item.expectedStatuses.length
      || item.expectedStatuses.some(code => !Number.isInteger(code) || code < 100 || code > 599)) throw Error('Invalid case');
    ids.add(item.id);
    const input = item.bodyInput === undefined ? null : context.caseInputs?.[item.bodyInput];
    if (item.bodyInput !== undefined && (!input || typeof input !== 'object' || !Object.hasOwn(input, 'body'))) throw Error('Approved case body absent: ' + item.id);
    const path = item.path.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_token, name) => {
      const binding = context.bindings?.[name];
      if (typeof binding !== 'string' || !binding.length || binding.length > 240) throw Error('Approved path binding absent: ' + name);
      return encodeURIComponent(binding);
    });
    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith('/api/')) throw Error('Foreign origin');
    const method = item.method ?? 'GET';
    if (!['GET', 'POST', 'PATCH'].includes(method)) throw Error('Method forbidden');
    if (method !== 'GET' && (!context.mutationsApproved || !item.syntheticOnly || !context.allowedMutationCaseIds?.includes(item.id))) throw Error('Mutation scope absent');
    const headers = acceptanceHeaders({ ...item.headers, ...input?.headers });
    return { ...item, url, method, body: input ? input.body : item.body, headers };
  });
}

export async function executeAcceptanceCases(context, cases, options = {}) {
  const base = new URL(context.origin);
  const prepared = prepareAcceptanceCases(context, cases, base);
  const env = options.env ?? process.env;
  // Resolve all secret names before the first request. Values remain in memory only.
  for (const item of prepared) {
    for (const [name, variable] of Object.entries(item.secretHeaders ?? {})) {
      if (!['authorization', 'cookie', 'x-vercel-protection-bypass'].includes(name.toLowerCase())
        || !/^ACCEPTANCE_[A-Z0-9_]+$/.test(variable) || !env[variable]) throw Error('Missing scoped access');
    }
  }
  const receipts = [];
  for (const item of prepared) {
    const headers = { accept: 'application/json', 'x-correlation-id': crypto.randomUUID(), ...item.headers };
    for (const [name, variable] of Object.entries(item.secretHeaders ?? {})) headers[name] = env[variable];
    if (item.body !== undefined) headers['content-type'] = 'application/json';
    const serialized = item.body === undefined ? undefined : JSON.stringify(item.body);
    const started = Date.now(); let status = null, requestId = null, bodyDigest = null, ok = false, error = null;
    try {
      const response = await (options.fetchImpl ?? fetch)(item.url, { method: item.method, headers, body: serialized, redirect: 'manual', signal: AbortSignal.timeout(15000) });
      status = response.status; requestId = response.headers.get('x-request-id') ?? response.headers.get('x-vercel-id');
      if (status >= 300 && status < 400) throw Error('Redirect refused');
      const parsed = await boundedResponseJson(response); bodyDigest = parsed.digest;
      ok = item.expectedStatuses.includes(status);
      for (const [key, expected] of Object.entries(item.expectedFields ?? {})) {
        const actual = key.split('.').reduce((value, field) => value && typeof value === 'object' && Object.hasOwn(value, field) ? value[field] : undefined, parsed.value);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) ok = false;
      }
      if (!ok) error = 'ASSERTION_FAILED';
    } catch { error = 'REQUEST_OR_RESPONSE_REJECTED'; }
    receipts.push({ id: item.id, operationId: item.operationId ?? null, sourceSha: context.sourceSha, deploymentId: context.deploymentId,
      time: new Date().toISOString(), method: item.method, path: item.url.pathname, expectedStatuses: item.expectedStatuses,
      status, requestId, bodyDigest, requestDigest: crypto.createHash('sha256').update(serialized ?? '').digest('hex'),
      ok, error, elapsedMs: Date.now() - started, destinationEffects: 'requires independent observer receipt' });
    if (!ok) break;
  }
  return { status: receipts.some(row => !row.ok) ? 'FAIL' : 'HTTP_CASES_PASS_NOT_FULL_JOURNEY', receipts };
}
