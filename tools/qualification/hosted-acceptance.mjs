import fs from 'node:fs';
import crypto from 'node:crypto';
// Offline by default. A case file supplies reviewed exact contract payloads and assertions.
// Never run against the historical acceptance deployment or its unknown backend.
const args=process.argv.slice(2);
if (!args.includes('--execute')) {
 console.log(JSON.stringify({status:'PREPARED_NOT_RUN',required:['--execute --context context.json --cases cases.json','independently verified exact source/deployment SHA','approved isolated backend or restricted gateway proof','approved synthetic tenant/subject fixtures and mutation scope','authenticated access with existing authorized session; no new bypass creation'],journey:['normal signup and login','owner API key issuance in two tenants','OpenAPI exact contract','agent credential/manifest/challenge/proof','authority and decision ALLOW/DENY/REVIEW','independent review and single-use native dispatch','receipt/replay/outcome','rotation and revocation','bounded rate and malformed cases','EN/ES and destination effect evidence']},null,2));process.exit(0);
}
function file(flag){const i=args.indexOf(flag);if(i<0||!args[i+1])throw Error('Missing '+flag);return JSON.parse(fs.readFileSync(args[i+1],'utf8'));}
const c=file('--context'), cases=file('--cases');
if(c.projectId!=='prj_nLXKcloPF9ZUBsiGAkyVWOJe1OOk'||!c.executionApproval||!c.backendIsolationVerified||!c.gatewayOrIsolatedBackendReceipt||!c.syntheticFixturesApproved)throw Error('Execution gates absent');
if(!/^[a-f0-9]{40}$/.test(c.sourceSha)||c.sourceSha!==c.deploymentSha||c.deploymentId==='dpl_3wen1RKj7B6Ck7Rryk6qnEmTfeUE')throw Error('Exact deployment proof absent or historical deployment');
const base=new URL(c.origin);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('Invalid target');
if(!c.verifiedAcceptanceHosts?.includes(base.hostname)||/cybersentinels\.com$|supabase\.(co|com)$/.test(base.hostname))throw Error('Target not approved');
if(!Array.isArray(cases)||!cases.length||cases.length>100)throw Error('Bounded case list required');
const receipts=[];let failed=false;
for(const item of cases){
 if(!item.id||!item.path?.startsWith('/api/')||item.path.startsWith('//')||!Array.isArray(item.expectedStatuses))throw Error('Invalid case');
 const u=new URL(item.path,base);if(u.origin!==base.origin)throw Error('Foreign origin');
 const method=item.method??'GET';if(!['GET','POST','PATCH'].includes(method))throw Error('Method forbidden');
 if(method!=='GET'&&(!c.mutationsApproved||!item.syntheticOnly||!c.allowedMutationCaseIds?.includes(item.id)))throw Error('Mutation scope absent');
 const headers={'accept':'application/json','x-correlation-id':crypto.randomUUID()};
 // Secret variable names are supplied by reviewed cases; values are never persisted.
 for(const [name,variable] of Object.entries(item.secretHeaders??{})){
  if(!['authorization','cookie','x-vercel-protection-bypass'].includes(name.toLowerCase())||!/^ACCEPTANCE_[A-Z0-9_]+$/.test(variable)||!process.env[variable])throw Error('Missing scoped access');headers[name]=process.env[variable];
 }
 if(item.body!==undefined)headers['content-type']='application/json';
 const t=Date.now();let status=null,ok=false,error=null,requestId=null,bodyDigest=null;
 try{
  const r=await fetch(u,{method,headers,body:item.body===undefined?undefined:JSON.stringify(item.body),redirect:'manual',signal:AbortSignal.timeout(15000)});status=r.status;requestId=r.headers.get('x-request-id')??r.headers.get('x-vercel-id');
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>1000000)throw Error('Response exceeds limit');bodyDigest=crypto.createHash('sha256').update(bytes).digest('hex');
  if(status>=300&&status<400)throw Error('Redirect refused');
  const body=JSON.parse(bytes.toString('utf8'));ok=item.expectedStatuses.includes(status);
  for(const [key,value]of Object.entries(item.expectedFields??{})){const actual=key.split('.').reduce((o,k)=>o?.[k],body);if(JSON.stringify(actual)!==JSON.stringify(value))ok=false;}
  if(!ok)error='ASSERTION_FAILED';
 }catch{error='REQUEST_OR_RESPONSE_REJECTED';ok=false;}
 receipts.push({id:item.id,sourceSha:c.sourceSha,deploymentId:c.deploymentId,time:new Date().toISOString(),method,path:u.pathname,status,requestId,bodyDigest,ok,error,elapsedMs:Date.now()-t,destinationEffects:'requires independent observer receipt'});if(!ok){failed=true;break;}
}
fs.writeFileSync(c.receiptPath??'hosted-acceptance-receipt.json',JSON.stringify({status:failed?'FAIL':'HTTP_CASES_PASS_NOT_FULL_JOURNEY',receipts},null,2));process.exitCode=failed?1:0;
