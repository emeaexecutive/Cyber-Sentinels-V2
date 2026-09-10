const evidenceDirectory = process.env.V2_EVIDENCE_DIRECTORY ?? 'docs/v2/qualification';
import { request } from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=process.env.V2_PRIVATE_DIRECTORY;
if(process.env.V2_STAGING_PROJECT!=='agpyhygpfmppjkxwcpac'||!dir)throw Error('Staging target required');
const accounts=JSON.parse(await readFile(`${dir}/staging-session-credential-export.json`,'utf8'));
const keys=JSON.parse(await readFile(`${dir}/issued-keys-credential-export.json`,'utf8'));
const result={project:process.env.V2_STAGING_PROJECT,keys:[]};
for(const key of keys){
 const account=accounts.find(a=>a.tenant===key.tenant);
 const http=await request.newContext({baseURL:'https://localhost:3443',ignoreHTTPSErrors:true,storageState:{cookies:account.cookies.map(c=>({...c,expires:-1})),origins:[]}});
 try{
 const revoked=await http.patch('/api/developer/api-keys',{headers:{'x-enterprise-id':key.tenant},data:{key_id:key.key_id,action:'revoke'}});
 assert.equal(revoked.status(),200);const body=await revoked.json();assert.equal(body.key.status,'revoked');
 const denied=await http.get('/api/v1/incidents/c355c3f6-814b-4aeb-821f-4fbac26f0f9b',{headers:{authorization:`Bearer ${key.api_key}`}});
 assert.equal(denied.status(),401);const failure=await denied.json();
 result.keys.push({key_id:key.key_id,status:'REVOKED',subsequentRequestStatus:401,error:failure.error});
 }finally{await http.dispose();}
}
result.status='PASS';await writeFile(`${evidenceDirectory}/key-cleanup.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));