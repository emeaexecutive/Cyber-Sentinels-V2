import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {compareSchemas} from '../tools/release/schema-equivalence.mjs';
test('schema comparison tolerates SQL formatting but preserves literal values and case',()=>{
 const base={functions:[{schema:'public',name:'check_state',args:'',definition:"SELECT 'APPROVED' -- comment\n"}]};
 assert.equal(compareSchemas(base,{functions:[{...base.functions[0],definition:"select 'APPROVED'"}]}).result,'PASS');
 assert.equal(compareSchemas(base,{functions:[{...base.functions[0],definition:"select 'approved'"}]}).result,'FAIL');
});
test('view definitions, ownership, RLS and grants are release-significant',()=>{
 const table={schema:'public',name:'records',owner:'postgres',rls:true,acl:'{authenticated=r/postgres}',view:'select id from tenant_records'};
 for(const patch of [{owner:'authenticated'},{rls:false},{acl:'{authenticated=rw/postgres}'},{view:'select id from all_records'}])assert.equal(compareSchemas({tables:[table]},{tables:[{...table,...patch}]}).result,'FAIL');
});
test('a managed helper name alone cannot exempt an unreviewed function body',()=>{
 assert.equal(compareSchemas({functions:[{schema:'public',name:'rls_auto_enable',args:'',definition:'select true'}]},{functions:[]}).result,'FAIL');
 assert.equal(compareSchemas({functions:[{schema:'public',name:'append_trust_event_v1',args:'jsonb,uuid,uuid'}]},{functions:[]}).result,'FAIL');
});
test('reviewed AND grouping equivalence cannot hide changed limits or validation state',()=>{
 const equivalents=JSON.parse(fs.readFileSync(new URL('../tools/release/reviewed-schema-equivalences.json',import.meta.url),'utf8'));
 for(const e of equivalents){
  const base={schema:e.schema,table:e.table,name:e.name,type:'c',validated:true,definition:e.definitions[0]};
  const variant={...base,definition:e.definitions[1]};
  assert.equal(compareSchemas({constraints:[base]},{constraints:[variant]}).result,'PASS');
  assert.equal(compareSchemas({constraints:[base]},{constraints:[{...variant,validated:false}]}).result,'FAIL');
  assert.equal(compareSchemas({constraints:[base]},{constraints:[{...variant,definition:variant.definition.replace(/300|100/,'999')}]}).result,'FAIL');
 }
});
