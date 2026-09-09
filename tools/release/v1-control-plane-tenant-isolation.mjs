import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { CyberSentinels } from '../../packages/cyber-sentinels-sdk/src/index.ts';
const directory='docs/release/v1-control-plane-production-proof';
const main=JSON.parse(await readFile(`${directory}/customer-zero.json`,'utf8'));
if(process.env.I_CONFIRM_PRODUCTION!=='kecgtsfibkypjuaxqbjx'||process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('External public clients only');
const a=new CyberSentinels({apiKey:process.env.CYBER_SENTINELS_API_KEY,baseUrl:main.origin});
const b=new CyberSentinels({apiKey:process.env.CYBER_SENTINELS_ISOLATION_API_KEY,baseUrl:main.origin});
const proof={origin:main.origin,startedAt:new Date().toISOString(),stages:{}};
const save=()=>writeFile(`${directory}/tenant-isolation.json`,JSON.stringify(proof,null,2));
const record=async(name,value)=>{proof.stages[name]=value;await save();return value;};
const reject=async(name,operation)=>{
  try{await operation();throw new Error(`${name} leaked another tenant's resource`);}catch(error){assert.equal(error.status,404);await record(name,{status:error.status,code:error.code,rejected:true});}
};
try {
  const agentB=await record('agentB',await b.agents.register({display_name:'CUSTOMER_ZERO_V1_ISOLATION_AGENT_20260909',entity_type:'AI_AGENT',owner_reference:'owner:customer-zero-isolation',runtime:{environment:'production',framework:'custom'},model:{provider:'not_invoked',identifier:'tenant-isolation-http-client'}}));
  proof.tenantA=main.stages.agent.manifest_context.enterprise_id;
  proof.tenantB=agentB.manifest_context.enterprise_id;
  assert.notEqual(proof.tenantA,proof.tenantB);
  await record('ownAgentA',await a.agents.get(main.stages.agent.agent_id));
  await record('ownAgentB',await b.agents.get(agentB.agent_id));
  await reject('tenantAReadingAgentB',()=>a.agents.get(agentB.agent_id));
  await reject('tenantBReadingAgentA',()=>b.agents.get(main.stages.agent.agent_id));
  await reject('tenantBHeartbeatForAgentA',()=>b.agents.heartbeat(main.stages.agent.agent_id,{agent_id:main.stages.agent.agent_id}));
  await reject('tenantBReadingTransactionA',()=>b.trust.getTransaction(main.stages.firstDecision.transaction_id));
  await reject('tenantBReadingReceiptA',()=>b.trust.getReceipt(main.stages.firstDecision.transaction_id));
  await reject('tenantBReadingReplayA',()=>b.trust.getReplay(main.stages.firstDecision.transaction_id));
  proof.result='PASS';
}catch(error){proof.result='FAIL';proof.error={message:error.message,code:error.code,status:error.status};process.exitCode=1;}
finally{proof.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({result:proof.result,tenantA:proof.tenantA,tenantB:proof.tenantB,error:proof.error}));}
