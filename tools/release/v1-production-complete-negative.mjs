// Continue the same external agent's real Production run without inventing ALLOW.
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { CyberSentinels } from '../../packages/cyber-sentinels-sdk/src/index.ts';
const path='docs/release/v1-production-closure/customer-zero.json';
const evidence=JSON.parse(await readFile(path,'utf8'));
const key=process.env.CYBER_SENTINELS_API_KEY;
if(process.env.I_CONFIRM_PRODUCTION!=='kecgtsfibkypjuaxqbjx'||!/^cs_live_/.test(key??'')||process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Legitimate Production public API credentials required');
const cs=new CyberSentinels({apiKey:key,baseUrl:evidence.origin,timeoutMs:60000});
const redact=(name,value)=>/^(api_key|private_key|signature|idempotency_key|execution_authorization|token|access_token|refresh_token)$/.test(name)&&value!==null?'[OMITTED]':value;
const save=()=>writeFile(path,JSON.stringify(evidence,redact,2));
const record=async(stage,value)=>{evidence.stages[stage]=value;await save();console.log(JSON.stringify({stage,decision:value.decision,status:value.status,identity:value.identity}));return value;};
const {agent,authority,firstDecision,firstTransaction}=evidence.stages;
const action=firstTransaction.action;
const requestAction={type:action.type,target:action.target,purpose:action.purpose,environment:action.environment};
assert.equal(firstDecision.decision,'REVIEW');
try {
  const wrong=await record('wrongAction',await cs.trust.authorize({operational_entity_id:agent.operational_entity_id,action:{...requestAction,type:'write_repository'},idempotency_key:`cz-wrong-${randomUUID()}`}));
  assert.notEqual(wrong.decision,'ALLOW');
  await record('revocation',await cs.authority.revoke(agent.agent_id,authority.authority_id,'Customer Zero qualification: revoke the bounded read authority after the preserved REVIEW decision.'));
  const revoked=await record('revokedAuthority',await cs.authority.getVersion(agent.agent_id,authority.authority_id));assert.equal(revoked.status,'REVOKED');
  const second=await record('secondDecision',await cs.trust.authorize({operational_entity_id:agent.operational_entity_id,action:requestAction,context:{previous_transaction_id:firstDecision.transaction_id},idempotency_key:`cz-revoked-${randomUUID()}`}));
  assert.equal(second.decision,'DENY');assert.equal(second.execution_authorization,null);
  await record('secondTransaction',await cs.trust.getTransaction(second.transaction_id));
  await record('secondReceipt',await cs.trust.getReceipt(second.receipt_id));
  await record('secondReplay',await cs.trust.getReplay(second.replay_id));
  await record('agentAfterRevocation',await cs.agents.get(agent.agent_id));
  await record('trustState',await cs.agents.getTrustState(agent.agent_id));
  evidence.result='REVIEW_TO_DENY_VERIFIED_ALLOW_GATE_BLOCKED';
  evidence.blockers=['Production required SERVER_VERIFIED_AGENT_CONFIGURATION and SERVER_VERIFIED_MONITORING_HEARTBEAT have no implemented Production producer; the available producer is synthetic Staging only.','Required ALLOW-to-DENY and original-ALLOW outcome review not established.'];
} catch(error){evidence.result='BLOCKED';evidence.continuationError={message:error.message,code:error.code,status:error.status};process.exitCode=1;}
finally{evidence.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({result:evidence.result,error:evidence.continuationError}));}
