import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {hashCanonical} from '../../src/lib/trust-core/hash.ts';

export const torchSourceSha='202117ae82a48a7f8d536c29d5d700e8fbf11c70';
const root=resolve(process.env.WATCHTOWER_SIGNAL_SOURCE??'../watchtower-runtime-clean-20261109');
assert.equal(execFileSync('git',['-c',`safe.directory=${root}`,'-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),torchSourceSha,'Pinned Torch checkout required');
execFileSync('git',['-c',`safe.directory=${root}`,'-C',root,'diff','--exit-code','HEAD','--','lib/swarm','src/lib/trust-core','lib/core']);
const load=path=>import(pathToFileURL(join(root,path)).href);
const [{WatchtowerSignals,watchtowerAudience},{SwarmContainment,verifySwarmReplay},{createSwarmStore},{createFileSwarmPersistence},{signAgentMessage,verifyAgentMessage}]=await Promise.all([
  load('lib/swarm/watchtower-signals.ts'),load('lib/swarm/containment.ts'),load('lib/swarm/store.ts'),load('lib/swarm/file-persistence.ts'),load('lib/swarm/agent-message.ts'),
]);

/** Test-only composition of the actual pinned Torch modules; no copied policy engine. */
export async function verifiedSignalReview(f,t){
  const directory=await mkdtemp(join(tmpdir(),'watchtower-river-signal-'));
  t.after(()=>{assert.equal(resolve(dirname(directory)),resolve(tmpdir()));assert.ok(directory.includes('watchtower-river-signal-'));return rm(directory,{recursive:true,force:true});});
  const persistence=createFileSwarmPersistence(directory),store=createSwarmStore(persistence),keys=new Map(),issuedAt=Date.now();
  const control=new SwarmContainment({store,now:()=>Date.now(),authenticate:async()=>({id:f.actor,tenantId:f.tenant,kind:'human',controlledBy:[],permissions:['swarm:manage'],expiresAt:issuedAt+3600000}),
    resolve:async()=>{throw Error('Warning composition must not evaluate execution policy');},heartbeatKey:async()=>{throw Error('Not used');},verifyOutcome:async()=>{throw Error('Not used');}});
  const collective={id:'swarm:river-fixture',entityType:'AGENT_SWARM',objective:'protect synthetic export',workflowId:'river-fixture',originalAuthority:f.input.authorityId,state:'ACTIVE',maxMembers:3};
  for(const id of ['ALSAMORA','VIACAMP','CHIRIVETA']){
    await control.register(f.tenant,'human-fixture',collective,{id,swarmId:collective.id,parentId:null,credentialVersion:1,state:'ACTIVE',heartbeatAt:0,heartbeatSequence:0,expiresAt:issuedAt+3600000});
    const pair=generateKeyPairSync('ed25519');keys.set(id,pair);await control.enrollRuntimeKey(f.tenant,'human-fixture',id,pair.publicKey.export({type:'spki',format:'pem'}));
  }
  function hop(sender,payload,nonce=randomUUID().replaceAll('-','')){
    const claims={domain:'cyber-sentinels:agent-message:v1',tenantId:f.tenant,swarmId:collective.id,senderId:sender,recipientId:'CHIRIVETA',audience:watchtowerAudience,credentialVersion:2,nonce,issuedAt,expiresAt:issuedAt+30000,payloadDigest:hashCanonical(payload)};
    return{claims,signature:signAgentMessage(claims,keys.get(sender).privateKey)};
  }
  const warning={eventId:randomUUID().replaceAll('-',''),source:'ALSAMORA',kind:'SYNTHETIC_EXPORT_WARNING',route:f.input.action.target,authorityConferred:false,detectionReference:f.detectionReference};
  const origin=hop('ALSAMORA',warning,warning.eventId),prefix={warning,origin,relays:[]},relay=hop('VIACAMP',prefix);
  const signals=new WatchtowerSignals(store,()=>Date.now()),received=await signals.receive(f.tenant,{...prefix,relays:[relay]});assert.equal(received.accepted,true);
  const reviewed=await signals.review(f.tenant,received.evidence.digest,{kind:'TEMPORARY_BLOCK',target:f.input.action.target,durationSeconds:300,corroboratingEvidenceRefs:[f.detectionReference,'fixture:runtime-observation:'+f.tx]});
  assert.equal(reviewed.recommendation,'REQUEST_TEMPORARY_BLOCK');assert.equal(reviewed.authorityConferred,false);assert.equal(reviewed.requiresGateway,true);
  const snapshot=(await persistence.load(f.tenant)).state;assert.ok(verifySwarmReplay(snapshot.events,f.tenant));assert.equal(Object.keys(snapshot.approvals).length,0);assert.equal(Object.keys(snapshot.leases).length,0);
  assert.ok(verifyAgentMessage(origin.claims,origin.signature,warning,keys.get('ALSAMORA').publicKey.export({type:'spki',format:'pem'}),issuedAt));
  assert.ok(verifyAgentMessage(relay.claims,relay.signature,prefix,keys.get('VIACAMP').publicKey.export({type:'spki',format:'pem'}),issuedAt));
  const publicKeys=Object.fromEntries([...keys].map(([id,pair])=>[id,pair.publicKey.export({type:'spki',format:'pem'})]));
  // Keep registry enrollment metadata in the local evidence vault, not in a public
  // website fixture. No secret-scanner exception or encoded credential is used.
  await mkdir('artifacts/watchtowers/local-registry-replay',{recursive:true});
  await writeFile(`artifacts/watchtowers/local-registry-replay/${f.tx}.json`,JSON.stringify({tenant:f.tenant,sourceSha:torchSourceSha,publicKeys,events:snapshot.events,fullReplayVerified:true},null,2)+'\n');
  const events=snapshot.events.filter(event=>['WATCHTOWER_WARNING','CHIRIVETA_REVIEW'].includes(event.kind));
  const registryAnchor=events[0].previousHash;
  for(const [index,event]of events.entries()){const{digest,...body}=event;assert.equal(digest,hashCanonical(body));assert.equal(event.previousHash,index===0?registryAnchor:events[index-1].digest);}
  return{sourceSha:torchSourceSha,originalEventId:warning.eventId,detectionReference:f.detectionReference,warningEvidenceDigest:received.evidence.digest,reviewEvidenceDigest:reviewed.evidence.digest,recommendation:reviewed.recommendation,authorityConferred:false,
    publicKeys,replayVerified:true,signatureReplayVerified:true,replayTime:issuedAt,replayHead:snapshot.events.at(-1).digest,registryAnchor,replayExportScope:'WARNING_REVIEW_SUFFIX; full registry Replay verified and retained locally',events};
}
