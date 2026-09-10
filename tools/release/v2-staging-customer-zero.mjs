const evidenceDirectory = process.env.V2_EVIDENCE_DIRECTORY ?? 'docs/v2/qualification';
// External public API proof. No service-role credentials or database clients.
import { request } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import { CyberSentinels, signManifest, signChallenge, signHeartbeat } from '../../packages/cyber-sentinels-sdk/src/index.ts';
import { hashCanonical } from '../../src/lib/trust-core/hash.ts';
const directory=process.env.V2_PRIVATE_DIRECTORY, origin='https://localhost:3443';
if(process.env.V2_STAGING_PROJECT!=='agpyhygpfmppjkxwcpac'||!directory||process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Public-client-only Staging proof required');
const accounts=JSON.parse(await readFile(`${directory}/issued-keys-credential-export.json`,'utf8'));
const http=await request.newContext({ignoreHTTPSErrors:true});
const proof={project:'agpyhygpfmppjkxwcpac',origin,classification:'SCRIPTED_STAGING_QUALIFICATION; no downstream execution or model invocation',started_at:new Date().toISOString(),stages:{},negatives:[]};
const redact=(key,value)=>/^(api_key|signature|private_key|access_token|refresh_token|execution_authorization)$/.test(key)&&value!==null?'[OMITTED]':value;
const save=()=>writeFile(`${evidenceDirectory}/customer-zero.json`,JSON.stringify(proof,redact,2));
const record=async(name,value)=>{proof.stages[name]=value;await save();console.log(JSON.stringify({stage:name,status:'RECORDED',decision:value?.decision}));return value;};
const localFetch=async(url,init={})=>{
 if(new URL(String(url)).origin!==origin)throw new Error('Non-local network target rejected');
 const response=await http.fetch(String(url),{method:init.method,headers:Object.fromEntries(new Headers(init.headers)),data:init.body,timeout:120000});
 return new Response(await response.body(),{status:response.status(),headers:response.headers()});
};
const cs=new CyberSentinels({apiKey:accounts[0].api_key,baseUrl:origin,fetch:localFetch,timeoutMs:120000});
const other=new CyberSentinels({apiKey:accounts[1].api_key,baseUrl:origin,fetch:localFetch,timeoutMs:120000});
const negative=async(name,fn,status)=>{try{await fn();throw new Error(`${name} unexpectedly accepted`);}catch(e){if(e.status!==status)throw e;proof.negatives.push({name,status:e.status,code:e.code});await save();}};
let agent,authority;
try {
 const keys=await webcrypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
 const jwk=await webcrypto.subtle.exportKey('jwk',keys.publicKey);Object.assign(jwk,{kid:`v2-${crypto.randomUUID()}`,alg:'EdDSA',use:'sig',key_ops:['verify']});
 agent=await record('agent',await cs.agents.register({display_name:'V2_STAGING_CUSTOMER_ZERO',entity_type:'AI_AGENT',owner_reference:'owner:v2-staging-fixture',runtime:{environment:'staging',framework:'custom'},model:{provider:'not_invoked',identifier:'scripted-evidence-client'}}));
 const credential=await record('credential',await cs.agents.registerCredential(agent.agent_id,{public_jwk:jwk,kid:jwk.kid,algorithm:'Ed25519',expires_at:new Date(Date.now()+7200000).toISOString()}));
 const claims={manifest_version:'1.0',operational_entity_id:agent.operational_entity_id,entity_type:'AI_AGENT',owner_reference:agent.manifest_context.accountable_owner_id,model:{provider:'not_invoked',identifier:'scripted-evidence-client',version:'v2'},runtime:{framework:'custom',runtime_type:'node',region:'local-staging-qualification',version:process.version,workload_identifier:'v2-customer-zero',deployment_identifier:null,build_digest:null},environment:'staging',declared_capabilities:['read_repository'],credential_id:credential.credential_id,issued_at:new Date().toISOString(),expires_at:new Date(Date.now()+7000000).toISOString(),nonce:crypto.randomUUID().replaceAll('-','')};
 await record('manifest',await cs.agents.registerManifest(agent.agent_id,await signManifest(claims,keys.privateKey)));
 const challenge=await cs.agents.issueChallenge(agent.agent_id);
 const signature=await signChallenge(challenge,agent.manifest_context.enterprise_id,credential.credential_id,keys.privateKey);
 const identity=await record('identity',await cs.agents.submitProof(agent.agent_id,signature));assert.equal(identity.identity,'VERIFIED');
 await negative('challenge replay',()=>cs.agents.submitProof(agent.agent_id,signature),409);
 const action={type:'read_repository',target:'repository:v2-staging-qualification',purpose:'incident_evidence_qualification',environment:'staging'};
 authority=await record('authority',await cs.authority.grant(agent.agent_id,{action:action.type,target:action.target,purpose:action.purpose,environment:action.environment,expires_at:new Date(Date.now()+6000000).toISOString(),data_boundary:'INTERNAL',execution_limit:10}));
 const beat=await signHeartbeat({agent_id:agent.agent_id,credential_id:credential.credential_id,event_id:crypto.randomUUID().replaceAll('-',''),issued_at:new Date().toISOString(),environment:'staging',authority_id:authority.authority_id,policy_id:'external-agent-trust-v1',policy_version:'0.2.0'},accounts[0].tenant,`${origin}/api/v1`,keys.privateKey);
 await record('heartbeat',await cs.agents.heartbeat(agent.agent_id,beat));
 await negative('heartbeat replay',()=>cs.agents.heartbeat(agent.agent_id,beat),409);
 const first=await record('firstDecision',await cs.trust.authorize({operational_entity_id:agent.operational_entity_id,action,idempotency_key:`v2-${crypto.randomUUID()}`}));
 assert.equal(first.decision,'ALLOW');
 const original=await record('originalTransaction',await cs.trust.getTransaction(first.transaction_id));
 await record('originalReceipt',await cs.trust.getReceipt(first.transaction_id));
 await record('originalReplay',await cs.trust.getReplay(first.transaction_id));
 proof.v1WithoutOptionalV2Context='PASS: no incident, observation, outcome or provider context submitted before ALLOW';await save();
 const observations=[];
 for(const [index,kind] of ['EXECUTION_OBSERVATION','OUTCOME','DETECTION','INTERVENTION','CONTAINMENT','REMEDIATION','PURPOSE_OBSERVATION'].entries()) {
  const at=new Date().toISOString();
  const evidence={context:{session:`staging-session-${index%2}`,api_tool:'scripted-client',infrastructure:'local-test-runtime'}};
  if(kind==='OUTCOME')Object.assign(evidence,{outcome_layer:'runtime',outcome_status:'FAILED'});
  if(kind==='PURPOSE_OBSERVATION')evidence.observed_purpose='reported_content_copy';
  const stored=await cs.evidence.submit({provider:{key:'self',class:'APPLICATION_SIGNAL',event_id:crypto.randomUUID(),finding:'STAGING_FIXTURE_REPORTED'},type:kind,subject:{type:'AI_AGENT',id:agent.agent_id},evidence,occurred_at:at});
  observations.push({transaction_id:first.transaction_id,kind,summary:`Scripted Staging ${kind.toLowerCase()} report; no real downstream operation`,observed_at:at,evidence_object_id:stored.evidence_id,evidence_digest:stored.evidence_digest,...evidence});
 }
 await record('observations',observations);
 const opened=await record('incident',await cs.incidents.open({transaction_id:first.transaction_id,summary:'Staging operational evidence qualification',observed_at:new Date().toISOString()}));
 const id=opened.incident_id;
 await negative('tenant B cannot read tenant A incident',()=>other.incidents.get(id),404);
 await negative('tenant B cannot attach evidence',()=>other.incidents.append(id,observations[0]),404);
 await negative('tenant B cannot export incident',()=>other.incidents.export(id),404);
 await negative('unknown transaction',()=>cs.incidents.open({transaction_id:crypto.randomUUID(),summary:'invalid reference',observed_at:new Date().toISOString()}),404);
 await negative('caller forged verification',()=>cs.incidents.append(id,{...observations[0],verified:true}),400);
 await negative('wrong evidence digest',()=>cs.incidents.append(id,{...observations[0],evidence_digest:'0'.repeat(64)}),400);
 const incomplete=await record('incompleteIncident',await cs.incidents.get(id)); assert.equal(incomplete.states.export,'DRAFT');
 for(const observation of observations)await cs.incidents.append(id,observation);
 await record('revocation',await cs.authority.revoke(agent.agent_id,authority.authority_id,'Staging regression: revoke bounded test authority'));
 const second=await record('secondDecision',await cs.trust.authorize({operational_entity_id:agent.operational_entity_id,action,context:{previous_transaction_id:first.transaction_id},idempotency_key:`v2-revoked-${crypto.randomUUID()}`}));assert.equal(second.decision,'DENY');
 const pack=await record('export',await cs.incidents.export(id));
 assert.equal(pack.package.states.export,'REGULATORY_EXPORT_READY');
 const {integrity_digest,...content}=pack.package; assert.equal(hashCanonical(content),integrity_digest);
 await record('incidentReplay',await cs.incidents.replay(id));
 const after=await record('originalAfterIncident',await cs.trust.getTransaction(first.transaction_id));
 assert.equal(after.decision,original.decision);assert.deepEqual(after.digests,original.digests);
 proof.result='PASS';
} catch(error) {proof.result='BLOCKED';proof.error={message:error.message,code:error.code,status:error.status};process.exitCode=1;}
finally {proof.completed_at=new Date().toISOString();await save();await http.dispose();console.log(JSON.stringify({result:proof.result,error:proof.error}));}
