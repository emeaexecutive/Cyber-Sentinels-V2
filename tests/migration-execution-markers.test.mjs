import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { compileMigration, isHistoricalMigrationMarker } from '../tools/release/migration-execution.mjs';
import { productionHistoryAliases } from '../tools/release/prepare-migration-context.mjs';
import path from 'node:path';
import { assertRehearsalDataDirectory } from '../tools/qualification/local-postgres-fence.mjs';

test('all five committed Production markers cannot generate DDL or fake ledger entries', () => {
  assert.equal(productionHistoryAliases.length, 5);
  for (const name of productionHistoryAliases) {
    const source = fs.readFileSync('supabase/migrations/' + name, 'utf8');
    assert.equal(isHistoricalMigrationMarker(source), true);
    assert.throws(() => compileMigration(source, name, []), /HISTORICAL_PRODUCTION_MARKER_NOT_EXECUTABLE/);
    // Appending executable SQL must not turn a provenance marker into a migration.
    assert.throws(() => compileMigration(source + '\ncreate table should_never_run(id int);', name, []), /HISTORICAL_PRODUCTION_MARKER_NOT_EXECUTABLE/);
  }
});

test('seven forward candidates contain executable SQL, not Production markers', () => {
  const manifest = JSON.parse(fs.readFileSync('docs/qualification/EXECUTION06-MIGRATION-CANDIDATES.json', 'utf8'));
  assert.equal(manifest.forwardCandidates.length, 7);
  for (const entry of manifest.forwardCandidates) {
    const source = fs.readFileSync(entry.path, 'utf8');
    assert.equal(isHistoricalMigrationMarker(source), false);
    assert.match(compileMigration(source, entry.path.split('/').at(-1), []), /MIGRATION_LEDGER_BASELINE_CHANGED/);
  }
});

test('local rehearsal skips markers without changing the ledger, then records only real DDL', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec('create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])');
  for (const name of productionHistoryAliases) {
    const source = fs.readFileSync('supabase/migrations/' + name, 'utf8');
    if (isHistoricalMigrationMarker(source)) continue;
    await db.exec(compileMigration(source, name, []));
  }
  assert.equal((await db.query('select count(*)::int as n from supabase_migrations.schema_migrations')).rows[0].n, 0);
  const name = '20990101000000_local_synthetic_probe.sql';
  await db.exec(compileMigration('create table public.execution06_local_probe(id int primary key);', name, []));
  assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations')).rows, [{ version: '20990101000000' }]);
  assert.equal((await db.query("select to_regclass('public.execution06_local_probe')::text as name")).rows[0].name, 'execution06_local_probe');
  const rehearsal = fs.readFileSync('tools/qualification/execution03-database-rehearsal.mjs', 'utf8');
  assert.match(rehearsal, /SKIPPED_PRODUCTION_HISTORY_MARKER/);
});

test('a local PostgreSQL port cannot authorize writes to a different data directory', () => {
  const workspace = process.cwd(), expected = path.resolve(workspace, 'tmp/pg-execution03/data');
  assert.equal(assertRehearsalDataDirectory(expected, workspace).dataDirectoryVerified, true);
  for (const actual of ['', null, path.resolve(workspace, '../other-worktree/tmp/pg-execution03/data'), path.resolve(workspace, 'tmp/pg-execution03/data-other')]) {
    assert.throws(() => assertRehearsalDataDirectory(actual, workspace), /ISOLATED_DATA_DIRECTORY_REQUIRED/);
  }
});
