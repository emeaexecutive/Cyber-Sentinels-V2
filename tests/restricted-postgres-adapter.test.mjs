import assert from 'node:assert/strict';
import test from 'node:test';
import { RestrictedPostgresAdapter } from '../lib/qualification/restricted-postgres-adapter.ts';
test('adapter uses six constant wrappers and bound parameters, never caller SQL',async()=>{
 const calls=[];const adapter=new RestrictedPostgresAdapter({query:async(sql,parameters)=>{calls.push({sql,parameters});return{rows:[{result:{synthetic:true}}]};}});
 const c={requestId:'request:synthetic-1',operation:'qualification.agent.register',tenantId:'tenant:a',subjectId:'subject:a',runId:'run:a',destination:'synthetic:a',payload:{agentId:"synthetic:a'; select 1; --"},issuedAt:new Date().toISOString()};
 await adapter.execute(c);assert.match(calls[0].sql,/^select qualification20.agent_register\(\$1,\$2,\$3,\$4::jsonb,\$5\)/);
 assert.equal(calls[0].sql.includes('select 1'),false);assert.match(calls[0].parameters[3],/select 1/);
 await assert.rejects(adapter.execute({...c,operation:'__proto__'}),/DENIED/);assert.equal(calls.length,1);
});
