import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import ignore from 'ignore';

test('deployment ignore rules preserve every tracked API route and exclude private artifacts', () => {
  const rules = ignore().add(fs.readFileSync(new URL('../.vercelignore', import.meta.url), 'utf8'));
  const tracked = execFileSync('git', ['ls-files', '-z', '--', 'app/api'], {encoding:'utf8'}).split('\0').filter(Boolean);
  const routes = tracked.filter(path => /\/route\.[cm]?[jt]sx?$/.test(path));
  assert.ok(routes.length > 0);
  assert.deepEqual(routes.filter(path => rules.ignores(path)), [], 'A tracked API handler must not be removed from the deployment');
  for (const path of ['exports/private.json', 'tmp/private.json', '.env.local', 'test-results/credentials.json', 'example-credential-export.json']) {
    assert.equal(rules.ignores(path), true, `Private artifact must remain excluded: ${path}`);
  }
});
