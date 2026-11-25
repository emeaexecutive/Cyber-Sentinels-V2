import test from 'node:test';
import assert from 'node:assert/strict';
import {RestrictedPostgresConnectionAdapter,restrictedPostgresUrl} from '../lib/qualification/restricted-postgres-connection.ts';
const url='postgresql://execution20_gateway_login:synthetic@db.agpyhygpfmppjkxwcpac.supabase.co/postgres';
const command={requestId:'synthetic:request',operation:'qualification.schema.read',tenantId:'synthetic:tenant',subjectId:'synthetic:subject',runId:'synthetic:run',destination:'synthetic:destination',payload:{},issuedAt:new Date().toISOString()};
test('concrete driver pins restricted staging login; Production/admin and URL overrides fail closed',()=>{
 assert.equal(restrictedPostgresUrl(url),url);
 for(const candidate of [url.replace('execution20_gateway_login','postgres'),url.replace('agpyhygpfmppjkxwcpac','kecgtsfibkypjuaxqbjx'),url+'?sslmode=disable',url.replace('/postgres','/another'),url.replace('postgresql:','http:')])assert.throws(()=>restrictedPostgresUrl(candidate),/BINDING_INVALID/);
});
test('driver checks effective privileges before the fixed wrapper and closes its actual connection port',async()=>{
 const queries=[];let closed=0;
 const adapter=new RestrictedPostgresConnectionAdapter(url,()=>({connect:async()=>{},query:async(sql,args)=>{queries.push({sql,args});return{rows:queries.length===1?[{restricted:true}]:[{result:{synthetic:true}}]};},end:async()=>{closed++;}}));
 assert.deepEqual(await adapter.execute(command),{synthetic:true});assert.equal(closed,1);
 assert.match(queries[0].sql,/current_user=session_user/);assert.match(queries[0].sql,/has_function_privilege/);
 assert.match(queries[1].sql,/qualification20.schema_read\(\$1,\$2,\$3,\$4::jsonb,\$5\)/);
 assert.deepEqual(queries[1].args.slice(0,3),[command.tenantId,command.subjectId,command.runId]);
});
test('privilege failure performs zero wrapper calls and still closes the connection',async()=>{
 let calls=0,closed=0;
 const adapter=new RestrictedPostgresConnectionAdapter(url,()=>({connect:async()=>{},query:async()=>{calls++;return{rows:[{restricted:false}]};},end:async()=>{closed++;}}));
 await assert.rejects(adapter.execute(command),/PRIVILEGES_INVALID/);assert.equal(calls,1);assert.equal(closed,1);
});
