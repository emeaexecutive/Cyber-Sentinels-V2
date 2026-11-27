import assert from 'node:assert/strict';
import test from 'node:test';
import {generateKeyPairSync,randomUUID,sign,verify} from 'node:crypto';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fixture} from './fixtures/swarm-control.mjs';
import {createSwarmStore} from '../lib/swarm/store.ts';
import {createFileSwarmPersistence} from '../lib/swarm/file-persistence.ts';
import {signAgentMessage} from '../lib/swarm/agent-message.ts';
import {WatchtowerSignals,watchtowerAudience} from '../lib/swarm/watchtower-signals.ts';
import {verifySwarmReplay} from '../lib/swarm/containment.ts';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';
import {canonicalize} from '../src/lib/trust-core/canonicalize.ts';

const now=Date.parse('2026-11-09T12:00:00Z'),results=[];
async function setup(t){
  const directory=await mkdtemp(join(tmpdir(),'watchtower-signals-'));
  t.after(()=>{assert.equal(resolve(dirname(directory)),resolve(tmpdir()));assert.ok(directory.includes('watchtower-signals-'));return rm(directory,{recursive:true,force:true});});
  const persistence=createFileSwarmPersistence(directory),h=await fixture({now,persistence}),keys=new Map();
  for(const id of ['ALSAMORA','VIACAMP','VIACAMP-2','CHIRIVETA']){
    await h.add(id);const key=generateKeyPairSync('ed25519');keys.set(id,key);
    await h.control.enrollRuntimeKey(h.request().enterpriseId,'operator',id,key.publicKey.export({type:'spki',format:'pem'}));
  }
  const tenant=h.request().enterpriseId;
  function hop(sender,recipient,payload,nonce=randomUUID().replaceAll('-',''),overrides={}){
    const claims={domain:'cyber-sentinels:agent-message:v1',tenantId:tenant,swarmId:'swarm:1',senderId:sender,recipientId:recipient,
      audience:watchtowerAudience,credentialVersion:2,nonce,issuedAt:now,expiresAt:now+30000,payloadDigest:hashCanonical(payload),...overrides};
    return{claims,signature:signAgentMessage(claims,keys.get(sender).privateKey)};
  }
  const warning={eventId:randomUUID().replaceAll('-',''),source:'ALSAMORA',kind:'SYNTHETIC_EXPORT_WARNING',route:'synthetic:customer-export',authorityConferred:false};
  const origin=hop('ALSAMORA','CHIRIVETA',warning,warning.eventId),base={warning,origin,relays:[]};
  const envelope={...base,relays:[hop('VIACAMP','CHIRIVETA',base)]};
  return{h,tenant,persistence,hop,base,envelope,signals:new WatchtowerSignals(createSwarmStore(persistence),()=>now)};
}
async function check(t,label,change,expected){const f=await setup(t);const envelope=structuredClone(f.envelope);change?.(envelope,f);const result=await f.signals.receive(f.tenant,envelope);
  assert.equal(result.reason,expected);assert.equal(result.authorityConferred,false);assert.equal(result.investigationOpened,expected==='INVESTIGATION_OPENED');
  const state=(await f.persistence.load(f.tenant)).state;assert.ok(verifySwarmReplay(state.events,f.tenant));assert.equal(Object.keys(state.leases).length,0);assert.equal(Object.keys(state.approvals).length,0);
  results.push({scenario:label,reason:result.reason,accepted:result.accepted,investigations:Number(result.investigationOpened),destinationEffects:0,evidenceDigest:result.evidence.digest});return{f,result};}
test('A genuine enrolled, signed warning opens investigation without execution authority',t=>check(t,'A',null,'INVESTIGATION_OPENED'));
test('B altered warning is rejected with Replay evidence',t=>check(t,'B',e=>{e.warning.route='synthetic:other';},'INVALID_WARNING'));
test('C expired origin is rejected despite a valid fresh relay',t=>check(t,'C',(e,f)=>{e.origin=f.hop('ALSAMORA','CHIRIVETA',e.warning,e.warning.eventId,{issuedAt:now-31000,expiresAt:now-1000});e.relays=[f.hop('VIACAMP','CHIRIVETA',{...e,relays:[]})];},'INVALID_ORIGIN'));
test('D exact replay after reconnect cannot open another investigation',async t=>{const{f}=await check(t,'D-initial',null,'INVESTIGATION_OPENED');const recovered=new WatchtowerSignals(createSwarmStore(f.persistence),()=>now);const result=await recovered.receive(f.tenant,f.envelope);assert.equal(result.reason,'MESSAGE_REPLAY');assert.equal(result.investigationOpened,false);results.push({scenario:'D',reason:result.reason,destinationEffects:0,investigations:0,evidenceDigest:result.evidence.digest});});
test('E forged source key cannot impersonate ALSAMORA',t=>check(t,'E',(e,f)=>{e.origin.signature=f.hop('VIACAMP','CHIRIVETA',e.warning,e.warning.eventId).signature;e.relays=[f.hop('VIACAMP','CHIRIVETA',{...e,relays:[]})];},'INVALID_ORIGIN'));
test('relay cannot add payload fields while retaining the original signature',t=>check(t,'PAYLOAD-TAMPER',(e,f)=>{e.warning.extra='altered';e.relays=[f.hop('VIACAMP','CHIRIVETA',{...e,relays:[]})];},'INVALID_ORIGIN'));
test('F alternate valid relay retains original ID and opens no second investigation',async t=>{const{f}=await check(t,'F-initial',null,'INVESTIGATION_OPENED');const envelope={...f.base,relays:[f.hop('VIACAMP-2','CHIRIVETA',f.base)]};const result=await f.signals.receive(f.tenant,envelope);assert.equal(result.reason,'VALID_ALTERNATE_RELAY');assert.equal(result.evidence.details.eventId,f.envelope.warning.eventId);assert.equal(result.investigationOpened,false);results.push({scenario:'F',reason:result.reason,destinationEffects:0,investigations:0,evidenceDigest:result.evidence.digest});});
test('two authenticated relays preserve the immutable source envelope',async t=>{const f=await setup(t),first=f.hop('VIACAMP','VIACAMP-2',f.base),prefix={...f.base,relays:[first]},second=f.hop('VIACAMP-2','CHIRIVETA',prefix);const result=await f.signals.receive(f.tenant,{...prefix,relays:[first,second]});assert.equal(result.reason,'INVESTIGATION_OPENED');assert.deepEqual(result.evidence.details.envelope.origin,f.base.origin);});
test('a relay cannot reuse its nonce for a different correctly signed warning',async t=>{const f=await setup(t);await f.signals.receive(f.tenant,f.envelope);const warning={...f.base.warning,eventId:randomUUID().replaceAll('-','')},origin=f.hop('ALSAMORA','CHIRIVETA',warning,warning.eventId),base={warning,origin,relays:[]},relay=f.hop('VIACAMP','CHIRIVETA',base,f.envelope.relays[0].claims.nonce);const result=await f.signals.receive(f.tenant,{...base,relays:[relay]});assert.equal(result.reason,'MESSAGE_REPLAY');assert.equal(result.investigationOpened,false);});
test('tampered relay, tenant, timestamp, credential and authority injection fail closed',async t=>{for(const mutate of [e=>{e.relays[0].signature='x'.repeat(86);},e=>{e.origin.claims.tenantId=randomUUID();},e=>{e.origin.claims.issuedAt=now+6000;},e=>{e.origin.claims.credentialVersion=3;},e=>{e.warning.authorityConferred=true;}]){const f=await setup(t),e=structuredClone(f.envelope);mutate(e);const r=await f.signals.receive(f.tenant,e);assert.equal(r.accepted,false);assert.equal(r.investigationOpened,false);}});
test('independent durable store instances arbitrate concurrent replay; evidence tampering is detected',async t=>{const f=await setup(t);const all=await Promise.all(Array.from({length:12},()=>new WatchtowerSignals(createSwarmStore(f.persistence),()=>now).receive(f.tenant,f.envelope)));assert.equal(all.filter(r=>r.investigationOpened).length,1);const state=(await f.persistence.load(f.tenant)).state;assert.ok(verifySwarmReplay(state.events,f.tenant));state.events.at(-1).details.accepted=true;assert.equal(verifySwarmReplay(state.events,f.tenant),false);});
test('CHIRIVETA vetoes unsupported or expired evidence and cannot mint authority',async t=>{const f=await setup(t),proposal={kind:'TEMPORARY_BLOCK',target:'synthetic:customer-export',durationSeconds:300,corroboratingEvidenceRefs:['fixture:runtime','fixture:destination']};assert.equal((await f.signals.review(f.tenant,'unsupported',proposal)).recommendation,'VETO');const received=await f.signals.receive(f.tenant,f.envelope),late=new WatchtowerSignals(createSwarmStore(f.persistence),()=>now+31000);assert.equal((await late.review(f.tenant,received.evidence.digest,proposal)).recommendation,'VETO');const state=(await f.persistence.load(f.tenant)).state;assert.equal(Object.keys(state.approvals).length,0);assert.equal(Object.keys(state.leases).length,0);assert.ok(verifySwarmReplay(state.events,f.tenant));});
test('CHIRIVETA recommends investigation when corroboration is missing and bounds reversible requests',async t=>{const f=await setup(t),received=await f.signals.receive(f.tenant,f.envelope),base={kind:'TEMPORARY_BLOCK',target:'synthetic:customer-export',durationSeconds:300,corroboratingEvidenceRefs:[]};assert.equal((await f.signals.review(f.tenant,received.evidence.digest,base)).recommendation,'INVESTIGATE');const supported={...base,corroboratingEvidenceRefs:['fixture:runtime','fixture:destination']};assert.equal((await f.signals.review(f.tenant,received.evidence.digest,supported)).recommendation,'REQUEST_TEMPORARY_BLOCK');assert.equal((await f.signals.review(f.tenant,received.evidence.digest,{...supported,target:'third-party:uncontrolled'})).recommendation,'VETO');assert.equal((await f.signals.review(f.tenant,received.evidence.digest,{...supported,durationSeconds:301})).recommendation,'VETO');});
test('CHIRIVETA cannot approve its own destructive recommendation',async t=>{const f=await setup(t),received=await f.signals.receive(f.tenant,f.envelope);const review=await f.signals.review(f.tenant,received.evidence.digest,{kind:'DESTRUCTIVE',target:'synthetic:customer-export',corroboratingEvidenceRefs:['fixture:runtime','fixture:destination'],selfApproved:true});assert.equal(review.recommendation,'REQUEST_INDEPENDENT_HUMAN_APPROVAL');assert.equal(review.requiresIndependentHumanApproval,true);assert.equal(review.requiresGateway,true);assert.equal(review.authorityConferred,false);const state=(await f.persistence.load(f.tenant)).state;assert.equal(Object.keys(state.approvals).length,0);assert.equal(Object.keys(state.leases).length,0);});
test.after(async()=>{const manifest={environment:'LOCAL SYNTHETIC FIXTURE',hosted:false,classification:'PARTIAL',cryptography:'Existing Ed25519 agent-message verification; existing file CAS and Swarm Replay',results};const key=generateKeyPairSync('ed25519');const signature=sign(null,Buffer.from(canonicalize(manifest)),key.privateKey).toString('base64url');assert.ok(verify(null,Buffer.from(canonicalize(manifest)),key.publicKey,Buffer.from(signature,'base64url')));await mkdir('artifacts/watchtowers',{recursive:true});await writeFile('artifacts/watchtowers/torch-local.json',JSON.stringify({manifest,signature,publicKey:key.publicKey.export({format:'pem',type:'spki'}),trustAnchor:'Ephemeral local test key; not a Production identity assertion'},null,2)+'\n');});
