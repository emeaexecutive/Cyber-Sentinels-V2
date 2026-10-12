// Compile reviewed historical SQL into one DDL + ledger transaction. No I/O.
export const sqlLiteral = value => "'"+String(value).replaceAll("'","''")+"'";
export function compileMigration(source,name,priorVersions) {
  if(!/^\d+_[a-z0-9_]+\.sql$/.test(name)||!priorVersions.every(v=>/^\d+$/.test(v))) throw Error('Invalid migration identity');
  const controls=source.match(/^\s*(?:begin|commit|rollback);\s*$/gim)??[];
  if(controls.length&&(controls.length!==2||controls[0].trim().toLowerCase()!=='begin;'||controls[1].trim().toLowerCase()!=='commit;')) throw Error('Unreviewed transaction boundary: '+name);
  const body=controls.length?source.replace(/^\s*begin;\s*$/im,'').replace(/^\s*commit;\s*$/im,''):source;
  const version=name.split('_')[0],short=name.slice(version.length+1,-4);
  const expected='ARRAY['+[...priorVersions].sort().map(sqlLiteral).join(',')+']::text[]';
  return `BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='10min';
SELECT pg_advisory_xact_lock(hashtextextended('cyber-sentinels-reviewed-migrations',0));
DO $cs_baseline$ BEGIN
  IF (SELECT coalesce(array_agg(version::text ORDER BY version),'{}'::text[]) FROM supabase_migrations.schema_migrations) IS DISTINCT FROM ${expected} THEN
    RAISE EXCEPTION 'MIGRATION_LEDGER_BASELINE_CHANGED';
  END IF;
END $cs_baseline$;
${body}
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES (${sqlLiteral(version)},${sqlLiteral(short)},ARRAY[${sqlLiteral(source)}]);
COMMIT;
`;
}
