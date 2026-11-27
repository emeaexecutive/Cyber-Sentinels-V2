// Schema/privilege metadata only. No customer table rows are selected.
import fs from 'node:fs';
let sql=fs.readFileSync('tools/release/effective-application-schema.sql','utf8');
sql=sql.replaceAll("('public','private')","('public','private','auth','storage','supabase_migrations','session_security')");
sql=sql.replace('select jsonb_build_object(',"select jsonb_build_object('ledger',(select jsonb_agg(jsonb_build_object('version',version,'name',name) order by version) from supabase_migrations.schema_migrations),");
sql=sql.replace("'indexes',(select jsonb_agg(x order by x.schemaname,x.tablename,x.indexname) from (select n.nspname schemaname,t.relname tablename,i.relname indexname,pg_get_indexdef(i.oid) indexdef,k.indisvalid valid,k.indisready ready", "'indexes',(select jsonb_agg(x order by x.schema,x.table,x.name) from (select n.nspname schema,t.relname \"table\",i.relname name,pg_get_indexdef(i.oid) definition,k.indisvalid valid,k.indisready ready");
fs.writeFileSync('tools/qualification/execution03-application-catalog.sql',sql);
