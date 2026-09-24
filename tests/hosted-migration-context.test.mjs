import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  prepareMigrationContext,
  productionHistoryAliases,
  productionHistoryMarker,
} from '../tools/release/prepare-migration-context.mjs';

const expectedVersions = ['20260819084252', '20260819084329', '20260902083450', '20260903095127', '20260904113046'];
const sqlFiles = directory => fs.readdirSync(directory).filter(name => name.endsWith('.sql')).sort();
const version = filename => filename.split('_')[0];

function removeContext(directory) {
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.match(path.basename(resolved), /^cyber-(?:v1-(?:production|staging)|hosted-history-test)-/);
  fs.rmSync(resolved, { recursive: true, force: true });
}

test('hosted history contains exactly the five documented identities and no executable SQL', () => {
  assert.deepEqual(productionHistoryAliases.map(version), expectedVersions);
  const ledger = JSON.parse(fs.readFileSync('supabase/history/production/ledger-definitions.json', 'utf8'));
  assert.deepEqual(ledger.map(entry => entry.version).sort(), expectedVersions);

  for (const filename of productionHistoryAliases) {
    const marker = fs.readFileSync(`supabase/migrations/${filename}`, 'utf8').replaceAll('\r\n', '\n');
    assert.equal(marker, productionHistoryMarker(filename));
    assert.ok(marker.split(/[\r\n]/).every(line => line === '' || line.startsWith('-- ')));
    assert.ok(!marker.includes('\u0000'));
    const archived = fs.readFileSync(`supabase/history/production/${filename}`, 'utf8');
    assert.notEqual(archived.trim(), '');
    assert.notEqual(marker, archived);
    assert.ok(ledger.some(entry => `${entry.version}_${entry.name}.sql` === filename));
  }
  assert.throws(() => productionHistoryMarker('20990101000000_unknown.sql'), /Unknown Production history alias/);
});

test('prepared contexts preserve canonical bytes and only the selected environment archive', t => {
  const canonical = sqlFiles('supabase/migrations').filter(name => !productionHistoryAliases.includes(name));
  for (const environment of ['production', 'staging']) {
    const result = prepareMigrationContext(environment);
    t.after(() => removeContext(result.workdir));
    assert.equal(result.linked, false);
    assert.equal(result.databaseChanged, false);
    const archived = sqlFiles(`supabase/history/${environment}`);
    const expected = [...canonical, ...archived].sort();
    const directory = path.join(result.workdir, 'supabase/migrations');
    assert.deepEqual(sqlFiles(directory), expected);
    assert.equal(result.migrationCount, expected.length);
    assert.equal(new Set(expected.map(version)).size, expected.length);
    for (const filename of expected) {
      const source = canonical.includes(filename) ? 'supabase/migrations' : `supabase/history/${environment}`;
      assert.deepEqual(fs.readFileSync(path.join(directory, filename)), fs.readFileSync(path.join(source, filename)));
    }
    if (environment === 'production') {
      assert.deepEqual(expected.map(version).sort(), sqlFiles('supabase/migrations').map(version).sort());
      assert.equal(result.migrationCount, 116);
    }
  }
});

test('context preparation rejects executable alias content and unrelated duplicate versions', () => {
  const original = process.cwd();
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'cyber-hosted-history-test-'));
  try {
    fs.mkdirSync(path.join(fixture, 'supabase/migrations'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'supabase/history/production'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'supabase/config.toml'), 'project_id = "history-test"\n');
    process.chdir(fixture);
    const filename = productionHistoryAliases[0];
    fs.writeFileSync(`supabase/migrations/${filename}`, `${productionHistoryMarker(filename)}select 1;\n`);
    assert.throws(() => prepareMigrationContext('production'), /Invalid Production history marker/);
    fs.writeFileSync(`supabase/migrations/${filename}`, productionHistoryMarker(filename));
    assert.throws(() => prepareMigrationContext('production'), /Missing Production history archive/);
    fs.unlinkSync(`supabase/migrations/${filename}`);
    fs.writeFileSync('supabase/migrations/20990101000000_first.sql', '-- fixture\n');
    fs.writeFileSync('supabase/history/production/20990101000000_second.sql', '-- fixture\n');
    assert.throws(() => prepareMigrationContext('production'), /Duplicate migration version: 20990101000000/);
  } finally {
    process.chdir(original);
    removeContext(fixture);
  }
});
