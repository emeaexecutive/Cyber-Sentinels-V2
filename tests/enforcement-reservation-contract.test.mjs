import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
import * as core from '../lib/operational-entities/native-enforcement.ts';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';

test('server reservation transmits the material payload digest required by the database contract',async()=>{
  const enterpriseId=randomUUID(),transactionId=randomUUID(),evaluationId=randomUUID(),authorityId=randomUUID(),delegationId=randomUUID();
  const digest=hashCanonical({supplier:'synthetic:1',operation:'read'});
  const rows={
    native_enforcement_decision_bindings:{decision_digest:'b'.repeat(64)},
    operational_entity_delegated_action_evaluations:{delegation_id:delegationId},
    canonical_trust_transactions:{decision:'ALLOW',action_type:'READ',action_resource:'repository:a',action_environment:'test',request_digest:digest},
    operational_entity_authority_delegations:{parent_authority_id:authorityId},
  };
  let captured;
  const db={from(table){const chain={select(){return chain;},eq(){return chain;},async maybeSingle(){return {data:rows[table],error:null};}};return chain;},
    async rpc(name,args){assert.equal(name,'reserve_native_enforcement_request_v1');captured=args.p_request;return {data:{requestState:'CANCELLED_AUTHORITY_CHANGED',reasonCodes:[]},error:null};}};
  const require=createRequire(import.meta.url);
  const mocks={
    'server-only':{},'@/lib/supabase/service-role':{createServiceRoleClient:()=>db},
    '@/lib/public-api/v1/webhook-delivery':{emitPublicApiWebhookEvent:()=>assert.fail('No webhook should be emitted')},
    '@/src/lib/trust-core/hash':{hashCanonical},
    './native-enforcement':{...core,executeAuthorizedAction:async(input,deps)=>{
      await deps.reserveRequest({...input,requestId:randomUUID(),actionDigest:core.deriveEnforcementActionDigest(input),requestedAt:new Date().toISOString()});
      return {requested:false,request:null,eligibility:{reasonCodes:[]}};
    }},
  };
  const js=ts.transpileModule(readFileSync('lib/operational-entities/native-enforcement-server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const testModule={exports:{}};
  new Function('require','module','exports',js)(id=>mocks[id]??require(id),testModule,testModule.exports);
  await testModule.exports.requestNativeEnforcement({enterpriseId,role:'owner',user:{id:randomUUID()}},'agent:synthetic',{transactionId,evaluationId,idempotencyKey:'synthetic:reservation-contract'});
  assert.equal(captured.payloadDigest,digest,'Database compares this with canonical_trust_transactions.request_digest');
  assert.equal(captured.transactionId,transactionId);assert.equal(captured.evaluationId,evaluationId);
  assert.equal(captured.operationalEntityId,'agent:synthetic');
});
