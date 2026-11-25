import fs from 'node:fs';
import { executeAcceptanceCases } from './hosted-runner-boundaries.mjs';
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
const result=await executeAcceptanceCases(c,cases);
fs.writeFileSync(c.receiptPath??'hosted-acceptance-receipt.json',JSON.stringify(result,null,2));process.exitCode=result.status==='FAIL'?1:0;
