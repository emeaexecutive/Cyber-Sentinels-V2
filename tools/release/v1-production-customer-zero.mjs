// External HTTP client. No database client, service-role key, or server imports.
import { createHash, webcrypto } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { CyberSentinels, signChallenge, signManifest } from '../../packages/cyber-sentinels-sdk/src/index.ts';

const origin = 'https://www.cybersentinels.com';
const key = process.env.CYBER_SENTINELS_API_KEY;
if (process.env.I_CONFIRM_PRODUCTION !== 'kecgtsfibkypjuaxqbjx' || !/^cs_live_/.test(key ?? '')) throw new Error('Explicit Production target and legitimate live API key required');
if (process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Database credentials are forbidden in this client');
const directory = 'docs/release/v1-production-closure';
await mkdir(directory, { recursive: true });
if (!/^[a-f0-9]{40}$/.test(process.env.V1_SOURCE_SHA ?? '') || !process.env.V1_DEPLOYMENT_ID) throw new Error('Exact release provenance required');
const evidence = { sourceSha: process.env.V1_SOURCE_SHA, deploymentId: process.env.V1_DEPLOYMENT_ID, origin, client: 'Separate Node HTTP process; scripted Customer Zero, no downstream operation or model invocation', startedAt: new Date().toISOString(), stages: {}, http: [] };
const redact = (name, value) => /^(api_key|private_key|signature|idempotency_key|execution_authorization|token|access_token|refresh_token)$/.test(name) && value !== null ? '[OMITTED]' : value;
const save = () => writeFile(`${directory}/customer-zero.json`, JSON.stringify(evidence, redact, 2));
const record = async (stage, value) => { evidence.stages[stage] = value; await save(); console.log(JSON.stringify({stage,status:'RECORDED',decision:value?.decision,identity:value?.identity})); return value; };
const cs = new CyberSentinels({ apiKey:key,baseUrl:origin,timeoutMs:60000,onResponse: metadata => evidence.http.push(metadata) });
const action = {type:'read_repository',target:'repository:customer-zero-v1-release-evidence',purpose:'deployment_evidence_review',environment:'production'};
const negative = async (name, operation) => {
  try { await operation(); throw new Error(`${name} unexpectedly succeeded`); }
  catch(error) {
    if (!Number.isInteger(error.status) || error.status < 400 || error.status >= 500) throw error;
    return record(name,{status:error.status,code:error.code,rejected:true});
  }
};
try {
  const ready = await fetch(`${origin}/api/ready`).then(async response=>({status:response.status,body:await response.json()}));
  assert.equal(ready.status,200); assert.equal(ready.body.status,'READY'); assert.equal(ready.body.runtime.commitSha,evidence.sourceSha); await record('readiness',ready);
  const invalid = await fetch(`${origin}/api/v1/agents/not-an-agent`,{headers:{authorization:'Bearer invalid-customer-zero-key'}});
  assert.equal(invalid.status,401); await record('invalidApiKey',{status:invalid.status,body:await invalid.json()});
  const keys=await webcrypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
  const jwk=await webcrypto.subtle.exportKey('jwk',keys.publicKey); jwk.kid=`cz-${webcrypto.randomUUID()}`; jwk.alg='EdDSA'; jwk.use='sig'; jwk.key_ops=['verify'];
  const agent=await record('agent',await cs.agents.register({display_name:'CUSTOMER_ZERO_AGENT_V1_PRODUCTION_20260909',entity_type:'AI_AGENT',owner_reference:'owner:customer-zero-v1',runtime:{environment:'production',framework:'custom'},model:{provider:'not_invoked',identifier:'scripted-authorization-client'}}));
  const credential=await record('credential',await cs.agents.registerCredential(agent.agent_id,{public_jwk:jwk,kid:jwk.kid,algorithm:'Ed25519',expires_at:new Date(Date.now()+3600000).toISOString()}));
  const claims={manifest_version:'1.0',operational_entity_id:agent.operational_entity_id,entity_type:'AI_AGENT',owner_reference:agent.manifest_context.accountable_owner_id,model:{provider:'not_invoked',identifier:'scripted-authorization-client',version:'v1'},runtime:{framework:'custom',runtime_type:'node',region:'external',version:process.version,workload_identifier:'customer-zero-v1-process',deployment_identifier:evidence.sourceSha,build_digest:createHash('sha256').update('customer-zero-v1-production-20260909').digest('hex')},environment:'production',declared_capabilities:['read_repository'],credential_id:credential.credential_id,issued_at:new Date().toISOString(),expires_at:new Date(Date.now()+3600000).toISOString(),nonce:Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('base64url')};
  await record('manifest',await cs.agents.registerManifest(agent.agent_id,await signManifest(claims,keys.privateKey)));
  const wrongKeys=await webcrypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
  const wrongChallenge=await cs.agents.issueChallenge(agent.agent_id);
  await negative('wrongEd25519Key',async()=>cs.agents.submitProof(agent.agent_id,await signChallenge(wrongChallenge,agent.manifest_context.enterprise_id,credential.credential_id,wrongKeys.privateKey)));
  const challenge=await record('challenge',await cs.agents.issueChallenge(agent.agent_id));
  const proof=await signChallenge(challenge,agent.manifest_context.enterprise_id,credential.credential_id,keys.privateKey);
  const identity=await record('identity',await cs.agents.submitProof(agent.agent_id,proof)); assert.equal(identity.identity,'VERIFIED');
  await negative('challengeReplay',()=>cs.agents.submitProof(agent.agent_id,proof));
  try {
    const missing=await record('missingAuthority',await cs.trust.authorize({operational_entity_id:agent.operational_entity_id,action,idempotency_key:`cz-missing-${webcrypto.randomUUID()}`})); assert.notEqual(missing.decision,'ALLOW');
  } catch(error) {
    if(error.status!==409 || error.code!=='AUTHORITY_NOT_FOUND') throw error;
    await record('missingAuthority',{status:error.status,code:error.code,rejected:true,decision:null});
  }
  const authority=await record('authority',await cs.authority.grant(agent.agent_id,{action:action.type,target:action.target,purpose:action.purpose,environment:action.environment,expires_at:new Date(Date.now()+3500000).toISOString(),data_boundary:'INTERNAL',execution_limit:10}));
  await record('authorityVersion',await cs.authority.getVersion(agent.agent_id,authority.authority_id));
  const first=await record('firstDecision',await cs.trust.authorize({operational_entity_id:agent.operational_entity_id,action,idempotency_key:`cz-allow-${webcrypto.randomUUID()}`}));
  await record('firstTransaction',await cs.trust.getTransaction(first.transaction_id));
  await record('firstReceipt',await cs.trust.getReceipt(first.receipt_id));
  await record('firstReplay',await cs.trust.getReplay(first.replay_id));
  assert.equal(first.decision,'ALLOW','Preserve a real non-ALLOW; never force success');
  const wrong=await record('wrongAction',await cs.trust.authorize({operational_entity_id:agent.operational_entity_id,action:{...action,type:'write_repository'},idempotency_key:`cz-wrong-${webcrypto.randomUUID()}`})); assert.notEqual(wrong.decision,'ALLOW');
  await record('revocation',await cs.authority.revoke(agent.agent_id,authority.authority_id,'Customer Zero authorization lifecycle: revoke the bounded read authority.'));
  const revoked=await record('revokedAuthority',await cs.authority.getVersion(agent.agent_id,authority.authority_id)); assert.equal(revoked.status,'REVOKED');
  const second=await record('secondDecision',await cs.trust.authorize({operational_entity_id:agent.operational_entity_id,action,context:{previous_transaction_id:first.transaction_id},idempotency_key:`cz-revoked-${webcrypto.randomUUID()}`}));
  await record('secondTransaction',await cs.trust.getTransaction(second.transaction_id));
  await record('secondReceipt',await cs.trust.getReceipt(second.receipt_id));
  await record('secondReplay',await cs.trust.getReplay(second.replay_id));
  assert.equal(second.decision,'DENY'); assert.equal(second.execution_authorization,null);
  await record('agentAfterRevocation',await cs.agents.get(agent.agent_id));
  await record('trustState',await cs.agents.getTrustState(agent.agent_id));
  evidence.result='EXTERNAL_AUTHORIZATION_AND_REVOCATION_PASS';
} catch(error) { evidence.result='BLOCKED';evidence.error={name:error.name,message:error.message,code:error.code,status:error.status};process.exitCode=1; }
finally {evidence.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({result:evidence.result,error:evidence.error}));}
