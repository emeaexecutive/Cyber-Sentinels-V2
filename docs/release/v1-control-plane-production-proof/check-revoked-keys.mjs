import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory='docs/release/v1-control-plane-production-proof';
const proof=JSON.parse(await readFile(`${directory}/customer-zero.json`,'utf8'));
const isolation=JSON.parse(await readFile(`${directory}/tenant-isolation.json`,'utf8'));
if(process.env.I_CONFIRM_PRODUCTION!=='kecgtsfibkypjuaxqbjx') throw new Error('Production confirmation required');
const results=[];
for(const [label,key,agent] of [['primary',process.env.CYBER_SENTINELS_API_KEY,proof.stages.agent.agent_id],['isolation',process.env.CYBER_SENTINELS_ISOLATION_API_KEY,isolation.stages.agentB.agent_id]]) {
  const response=await fetch(`${proof.origin}/api/v1/agents/${encodeURIComponent(agent)}`,{headers:{authorization:`Bearer ${key}`}});
  const body=await response.json(); assert.equal(response.status,401); assert.equal(body.error.code,'API_KEY_REVOKED');
  results.push({label,httpStatus:response.status,code:body.error.code,requestId:body.request_id,correlationId:body.correlation_id});
}
const output={status:'PASS',checkedAt:new Date().toISOString(),results};
await writeFile(`${directory}/revoked-key-rejection.json`,JSON.stringify(output,null,2));console.log(JSON.stringify(output));
