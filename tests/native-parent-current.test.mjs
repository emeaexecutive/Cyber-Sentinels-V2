import test from 'node:test';
import assert from 'node:assert/strict';
import { currentNativeDelegationChain } from '../lib/operational-entities/native-delegation-current.ts';
const now=Date.now();
const root={delegation_id:'parent',parent_delegation_id:null,parent_authority_id:'authority',delegator_operational_entity_id:'owner',delegate_operational_entity_id:'coordinator',status:'ACTIVE',revoked_at:null,not_before:new Date(now-2000).toISOString(),expires_at:new Date(now+120000).toISOString(),can_redelegate:true,maximum_delegation_depth:2,data_boundary:'CONFIDENTIAL',delegation_depth:0,permitted_actions:['read','write'],permitted_tools:['tool'],permitted_targets:['repository:a'],environments:['test'],financial_limit:100,execution_limit:10};
const leaf={...root,delegation_id:'leaf',parent_delegation_id:'parent',delegator_operational_entity_id:'coordinator',delegate_operational_entity_id:'agent',delegation_depth:1,financial_limit:50,execution_limit:5};
const valid=rows=>currentNativeDelegationChain(rows,'authority','agent',now);
test('dispatch rechecks parent revocation and recovery using unchanged leaf evidence',()=>{
  const parent={...root};assert.equal(valid([leaf,parent]),true);
  for(const [field,value] of [['status','REVOKED'],['revoked_at',new Date(now).toISOString()],['can_redelegate',false],['parent_authority_id','foreign'],['delegate_operational_entity_id','other'],['not_before','malformed'],['expires_at',new Date(now-1).toISOString()],['financial_limit',10],['execution_limit',1],['permitted_targets',['repository:b']],['maximum_delegation_depth',0],['data_boundary','PUBLIC']]){
    const before=parent[field];parent[field]=value;assert.equal(valid([leaf,parent]),false,field);parent[field]=before;
  }
  assert.equal(valid([leaf,parent]),true);
});
test('missing, cyclic, foreign and depth-expanded lineage fail closed',()=>{
  assert.equal(valid([leaf]),false);
  assert.equal(valid([leaf,{...root,parent_delegation_id:'leaf'}]),false);
  assert.equal(valid([{...leaf,delegation_depth:10},root]),false);
  assert.equal(currentNativeDelegationChain([leaf,root],'foreign','agent',now),false);
  assert.equal(currentNativeDelegationChain([leaf,root],'authority','other',now),false);
});
