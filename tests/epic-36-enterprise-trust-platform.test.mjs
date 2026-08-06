import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  assert.ok(existsSync(fullPath), `Expected ${relativePath} to exist`);
  return readFileSync(fullPath, 'utf8');
}

test('Epic 36 introduces the enterprise trust coordination experience and docs', () => {
  const page = read('app/enterprise/trust-platform/page.tsx');
  const docs = [
    'docs/platform/ENTERPRISE_TRUST_PLATFORM.md',
    'docs/platform/ENTERPRISE_COORDINATION.md',
    'docs/platform/EXECUTIVE_MODE.md',
    'docs/platform/DESIGN_PARTNER_MODE.md',
    'docs/platform/INVESTOR_MODE.md',
    'docs/platform/TRUST_REASONING_READINESS.md',
  ];

  assert.match(page, /Enterprise Trust Coordination™/);
  assert.match(page, /Executive Mode/);
  assert.match(page, /Design Partner Mode/);
  assert.match(page, /Investor Mode/);
  assert.doesNotMatch(page, /Trust Learning™|Trust Simulation™|Trust Resilience™/);

  docs.forEach((docPath) => {
    const content = read(docPath);
    assert.match(content, /Epic 36|Enterprise Trust Platform|Trust Reasoning/i);
  });
});
