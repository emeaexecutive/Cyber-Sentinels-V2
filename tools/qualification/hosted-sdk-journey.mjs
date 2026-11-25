import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const args=process.argv.slice(2);
if(!args.includes('--execute')){console.log('PREPARED_NOT_RUN: guarded Agent Gamma SDK registration, Ed25519 proof, authority, ALLOW/REVIEW/DENY, receipt/replay, revocation and attack checks. Requires an approved exact deployment, isolated backend/gateway and synthetic test API key.');process.exit(0);}
const index=args.indexOf('--context');if(index<0)throw Error('Context required');
const c=JSON.parse(fs.readFileSync(args[index+1],'utf8'));
if(c.projectId!=='prj_nLXKcloPF9ZUBsiGAkyVWOJe1OOk'||! /^[a-f0-9]{40}$/.test(c.sourceSha)||c.deploymentSha!==c.sourceSha||!c.executionApproval||!c.backendIsolationVerified||!c.gatewayOrIsolatedBackendReceipt||!c.syntheticFixturesApproved||!c.mutationsApproved||!c.sdkJourneyApproved||c.deploymentId==='dpl_3wen1RKj7B6Ck7Rryk6qnEmTfeUE')throw Error('SDK journey gates absent');
const origin=new URL(c.origin);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!c.verifiedAcceptanceHosts?.includes(origin.hostname)||/cybersentinels\.com$|supabase\.(co|com)$/.test(origin.hostname))throw Error('Target rejected');
const apiKey=process.env.ACCEPTANCE_TEST_API_KEY;if(!apiKey||!/^cs_test_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}$/.test(apiKey))throw Error('Approved synthetic test key required');
const nativeFetch=globalThis.fetch;let requests=0;const receipts=[];
globalThis.fetch=async(input,init={})=>{
 const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(u.origin!==origin.origin||!u.pathname.startsWith('/api/')||++requests>100)throw Error('Request scope rejected');
 const headers=new Headers(init.headers);if(process.env.ACCEPTANCE_VERCEL_SESSION)headers.set('cookie',process.env.ACCEPTANCE_VERCEL_SESSION);
 const r=await nativeFetch(input,{...init,headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
 receipts.push({method:init.method??'GET',path:u.pathname,status:r.status,requestId:r.headers.get('x-request-id')??r.headers.get('x-vercel-id')});if(r.status>=300&&r.status<400)throw Error('Redirect rejected');return r;
};
// The reviewed Gamma example imports only the public SDK. Use its exact source
// and the local pinned SDK without installing packages or modifying the candidate.
const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const actualSha=execFileSync('git',['-c',`safe.directory=${sourceRoot}`,'rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8'}).trim();
if(actualSha!==c.sourceSha)throw Error('SDK source SHA mismatch');
for(const file of ['examples/agent-gamma/gamma.mjs','packages/cyber-sentinels-sdk/src/index.ts']){const sealed=execFileSync('git',['-c',`safe.directory=${sourceRoot}`,'show',`${c.sourceSha}:${file}`],{cwd:sourceRoot});if(!sealed.equals(fs.readFileSync(path.join(sourceRoot,file))))throw Error('SDK source differs from qualified commit');}
let source=fs.readFileSync(path.join(sourceRoot,'examples/agent-gamma/gamma.mjs'),'utf8');
const sourceDigest=crypto.createHash('sha256').update(source).digest('hex');
source=source.replace('"@cyber-sentinels/sdk"',JSON.stringify(pathToFileURL(path.join(sourceRoot,'packages/cyber-sentinels-sdk/src/index.ts')).href));
process.env.CYBER_SENTINELS_API_KEY=apiKey;process.env.CYBER_SENTINELS_BASE_URL=origin.origin;process.env.CYBER_SENTINELS_STAGING_PROJECT_REF='agpyhygpfmppjkxwcpac';process.env.I_CONFIRM_STAGING='I_CONFIRM_STAGING';process.env.GAMMA_RUN_ATTACKS='1';delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const stdout=process.stdout.write.bind(process.stdout);const stages=[];process.stdout.write=(data)=>{const label=String(data).match(/^([A-Z_]+): /)?.[1];if(label)stages.push(label);return true;};
let passed=false;try{await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));passed=true;}catch{process.exitCode=1;}finally{process.stdout.write=stdout;globalThis.fetch=nativeFetch;delete process.env.CYBER_SENTINELS_API_KEY;}
fs.writeFileSync(c.sdkReceiptPath??'sdk-journey-receipt.json',JSON.stringify({sourceSha:c.sourceSha,deploymentId:c.deploymentId,exampleSourceDigest:sourceDigest,status:passed?'SDK_JOURNEY_PASS_NOT_FULL_ACCEPTANCE':'FAIL',stages,requests:receipts,destinationEffects:'not established by SDK HTTP success'},null,2));
stdout(passed?'SDK journey assertions passed; independent destination and UI evidence still required.\n':'SDK journey failed; sanitized HTTP receipt written.\n');
