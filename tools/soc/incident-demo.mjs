import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createSocFixture} from '../../tests/fixtures/soc-control.mjs';
import {tenant} from '../../tests/fixtures/swarm-control.mjs';
import {createSwarmStore} from '../../lib/swarm/store.ts';
import {SwarmContainment,verifySwarmReplay} from '../../lib/swarm/containment.ts';
import {GovernedSoc,SOC_AGENTS} from '../../lib/soc/workflow.ts';
import {measureDetection} from './detection-dataset.mjs';

// Repeatable synthetic destination. The observer independently reads a file
// after dispatch; neither an ALLOW decision nor an adapter acknowledgment is an outcome.
const cleanups=[];let destinationFile;
try {
 const f=await createSocFixture({after(fn){cleanups.push(fn);}},{
  execute:async request=>{assert.equal(request.operationalEntityId,SOC_AGENTS.TENENTE.id);await writeFile(destinationFile,JSON.stringify({requestId:request.requestId,idempotencyKey:request.idempotencyKey,target:request.action.target,synthetic:true,blockedUntil:f.h.deps.now()+60000}),{flag:'wx'});},
  observe:async request=>{const effect=JSON.parse(await readFile(destinationFile,'utf8'));assert.equal(effect.idempotencyKey,request.idempotencyKey);assert.equal(effect.target,'synthetic:customer-export');assert.equal(effect.synthetic,true);return 'destination:verified';},
 });
 const directory=resolve('artifacts/soc');await mkdir(directory,{recursive:true});
 // Persist the effect beside the fixture's private local snapshots, then export
 // only non-secret evidence and independent observations.
 const state=await f.persistence.load(tenant);assert.ok(state);
 destinationFile=join(directory,`destination-${Date.now()}.json`);
 const alert=await f.ready(),request=f.request(),response=await f.soc.respond(tenant,'operator',alert.digest,request);
 assert.equal(response.details.outcome,'COMPLETED');
 const recoveredStore=createSwarmStore(f.persistence),recoveredControl=new SwarmContainment({...f.h.deps,store:recoveredStore});
 const recovered=new GovernedSoc({...f.deps,store:recoveredStore,control:recoveredControl});
 const snapshot=await recovered.snapshot(tenant,'operator'),journal=(await f.persistence.load(tenant)).state.events;
 assert.ok(verifySwarmReplay(journal,tenant));assert.equal(snapshot.alerts.length,1);assert.equal(f.observations(),1);
 const detectionQuality=await measureDetection(f.soc,tenant,f.envelope);
 assert.deepEqual(detectionQuality.counts,{truePositive:2,falsePositive:1,trueNegative:1,falseNegative:0});
 const manifest={classification:'VERIFIED LOCAL — SYNTHETIC ONLY',hosted:false,model:{invoked:false,reason:'MODEL_NOT_CONFIGURED',costUsd:0},alertDigest:alert.digest,response,independentDestinationObservation:JSON.parse(await readFile(destinationFile,'utf8')),recovery:{newStoreInstance:true,replayVerified:true,eventCount:journal.length},quality:snapshot.quality,detectionQuality,consoleTimeline:snapshot.timeline,journal,limits:{temporaryBlockSeconds:60,scope:'synthetic:customer-export',externalExpiryEnforcement:'Fixture timestamp only; real provider TTL conformance remains unqualified'}};
 await writeFile(join(directory,'incident.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({artifact:'artifacts/soc/incident.json',outcome:response.details.outcome,replayVerified:true,model:'NOT_CONFIGURED',destinationEffects:f.effects.size}));
} finally {for(const fn of cleanups.reverse())await fn();}
