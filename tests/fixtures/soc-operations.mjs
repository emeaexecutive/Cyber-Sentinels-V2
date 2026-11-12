import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {fixture,tenant} from './swarm-control.mjs';
import {SOC_AGENTS} from '../../lib/soc/workflow.ts';
import {swarmOperations} from '../../lib/swarm/operations.ts';
import {signAgentMessage} from '../../lib/swarm/agent-message.ts';
import {watchtowerAudience} from '../../lib/swarm/watchtower-signals.ts';
import {hashCanonical} from '../../src/lib/trust-core/hash.ts';
export async function socOperationsFixture(){
 const h=await fixture(),keys=new Map();
 const ops=swarmOperations(h.store,async()=>h.actors.get('operator'),h.deps.now);
 for(const role of ['ALSAMORA','VIACAMP',...Object.values(SOC_AGENTS).map(agent=>agent.id)]){
  await h.add(role);const key=generateKeyPairSync('ed25519');keys.set(role,key);
  await h.control.enrollRuntimeKey(tenant,'operator',role,key.publicKey.export({type:'spki',format:'pem'}));
 }
 async function register(){for(const role of Object.keys(SOC_AGENTS))await ops.command({action:'soc-register',role,ownerId:'security-owner'});}
 function envelope(){
  const warning={eventId:randomUUID().replaceAll('-',''),source:'ALSAMORA',kind:'SYNTHETIC_EXPORT_WARNING',route:'synthetic:customer-export',authorityConferred:false};
  const hop=(sender,payload,nonce=randomUUID().replaceAll('-',''))=>{const claims={domain:'cyber-sentinels:agent-message:v1',tenantId:tenant,swarmId:'swarm:1',senderId:sender,recipientId:'CHIRIVETA',audience:watchtowerAudience,credentialVersion:2,nonce,issuedAt:h.deps.now(),expiresAt:h.deps.now()+30000,payloadDigest:hashCanonical(payload)};return{claims,signature:signAgentMessage(claims,keys.get(sender).privateKey)};};
  const base={warning,origin:hop('ALSAMORA',warning,warning.eventId),relays:[]};return{...base,relays:[hop('VIACAMP',base)]};
 }
 return {h,ops,envelope,register,tenant};
}
