import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fixture,tenant} from './swarm-control.mjs';
import {GovernedSoc,SOC_AGENTS} from '../../lib/soc/workflow.ts';
import {SocModelBudget} from '../../lib/soc/model-budget.ts';
import {createFileSwarmPersistence} from '../../lib/swarm/file-persistence.ts';
import {signAgentMessage} from '../../lib/swarm/agent-message.ts';
import {watchtowerAudience} from '../../lib/swarm/watchtower-signals.ts';
import {hashCanonical} from '../../src/lib/trust-core/hash.ts';

export async function createSocFixture(t,options={}) {
 const directory=await mkdtemp(join(tmpdir(),'soc-workflow-'));
 t.after(()=>{assert.equal(resolve(dirname(directory)),resolve(tmpdir()));assert.ok(directory.includes('soc-workflow-'));return rm(directory,{recursive:true,force:true});});
 const persistence=createFileSwarmPersistence(directory), h=await fixture({persistence}),keys=new Map(),effects=new Map();
 h.policy.classification.operation='BLOCK_SYNTHETIC_ACTION';h.policy.classification.resource='synthetic:customer-export';
 h.graph(g=>{g.grants[0].scope=['BLOCK_SYNTHETIC_ACTION'];});
 for(const role of ['ALSAMORA','VIACAMP',...Object.values(SOC_AGENTS).map(x=>x.id)]) {
  await h.add(role);const key=generateKeyPairSync('ed25519');keys.set(role,key);
  await h.control.enrollRuntimeKey(tenant,'operator',role,key.publicKey.export({type:'spki',format:'pem'}));
  h.actors.get(role).credentialVersion=2;await h.beat(role);
 }
 let observations=0;
 const destination={execute:async request=>{effects.set(request.idempotencyKey,(effects.get(request.idempotencyKey)??0)+1);if(options.execute)await options.execute(request);},observe:async request=>{observations++;assert.equal(effects.get(request.idempotencyKey),1);return options.observe?options.observe(request):'destination:verified';}};
 const modelBudget=options.investigate?new SocModelBudget({store:h.store,now:h.deps.now},{approved:true,environment:'test',tenantId:tenant,scope:'synthetic-model-budget',policyVersion:'fixture-v1',provider:'fixture',model:'mocked-transport',windowMs:60000,maxWindowCalls:10,maxTotalCalls:10,maxAttemptsPerInvestigation:1,maxParallel:1,maxDurationMs:15000,maxInputBytes:32768,maxOutputTokens:1800,maxWindowSpendMicros:100,maxTotalSpendMicros:100,reserveMicrosPerCall:10}):undefined;
 const deps={store:h.store,control:h.control,authenticate:h.deps.authenticate,now:h.deps.now,destination,destinationTimeoutMs:options.timeoutMs??100,investigate:options.investigate,modelBudget};
 const soc=new GovernedSoc(deps);
 for(const role of Object.keys(SOC_AGENTS))await soc.registerAgent(tenant,'operator',role,'security-owner');
 function envelope(warningOverrides={}){
  const warning={eventId:randomUUID().replaceAll('-',''),source:'ALSAMORA',kind:'SYNTHETIC_EXPORT_WARNING',route:'synthetic:customer-export',authorityConferred:false,...warningOverrides};
  const hop=(sender,recipient,payload,nonce=randomUUID().replaceAll('-',''))=>{const claims={domain:'cyber-sentinels:agent-message:v1',tenantId:tenant,swarmId:'swarm:1',senderId:sender,recipientId:recipient,audience:watchtowerAudience,credentialVersion:2,nonce,issuedAt:h.deps.now(),expiresAt:h.deps.now()+30000,payloadDigest:hashCanonical(payload)};return{claims,signature:signAgentMessage(claims,keys.get(sender).privateKey)};};
  const base={warning,origin:hop('ALSAMORA','CHIRIVETA',warning,warning.eventId),relays:[]};return{...base,relays:[hop('VIACAMP','CHIRIVETA',base)]};
 }
 const request=(key=randomUUID())=>({...h.request('TENENTE',key),action:{type:'BLOCK_SYNTHETIC_ACTION',target:'synthetic:customer-export',environment:'test',consequence:'LOW'}});
 async function alert(){const received=await soc.ingest(tenant,'operator',envelope());assert.equal(received.accepted,true);return received.alert;}
 async function ready(){const a=await alert();await soc.investigate(tenant,'operator',a.digest);return a;}
 return {h,soc,deps,persistence,keys,effects,envelope,request,alert,ready,observations:()=>observations};
}

