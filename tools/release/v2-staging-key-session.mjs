import { request } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const directory=process.env.V2_PRIVATE_DIRECTORY;
if(process.env.V2_STAGING_PROJECT!=='agpyhygpfmppjkxwcpac'||!directory)throw new Error('Explicit Staging qualification target required');
const accounts=JSON.parse(await readFile(`${directory}/staging-session-credential-export.json`,'utf8'));
const issued=[];
for(const account of accounts) {
 const context=await request.newContext({baseURL:'https://localhost:3443',ignoreHTTPSErrors:true,storageState:{cookies:account.cookies.map(cookie=>({...cookie,expires:-1})),origins:[]}});
 try {
  const response=await context.post('/api/developer/api-keys',{headers:{'x-enterprise-id':account.tenant},data:{label:'V2_STAGING_CUSTOMER_ZERO',environment:'test',expires_at:new Date(Date.now()+4*3600000).toISOString(),scopes:['agents:write','agents:verify','authority:read','authority:write','trust:request','trust:read','evidence:write','outcomes:write','review:read','review:write','incidents:read','incidents:write','evidence:export'],authority_management_boundary:{actions:['read_repository'],target_prefixes:['repository:v2-staging-qualification'],purposes:['incident_evidence_qualification'],environments:['staging'],max_ttl_seconds:7200}}});
  const body=await response.json();
  if(response.status()!==201||!body.api_key)throw new Error(`Key issuance failed ${response.status()}: ${body.error??'unknown'}`);
  issued.push({tenant:account.tenant,user_id:account.user_id,key_id:body.key.id,client_id:body.key.client_id,api_key:body.api_key});
  await writeFile(`${directory}/issued-keys-credential-export.json`,JSON.stringify(issued));
  console.log(JSON.stringify({status:'ISSUED',tenant:account.tenant,key_id:body.key.id,client_id:body.key.client_id}));
 } finally {await context.dispose();}
}
