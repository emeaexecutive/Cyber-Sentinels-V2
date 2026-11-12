import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {verify,createHash} from 'node:crypto';
import {canonicalize} from '../../src/lib/trust-core/canonicalize.ts';

const destination='lib/watchtowers/local-evidence.json',generated='lib/watchtowers/recorded-evidence.ts';
function validate(bundle){
  assert.equal(bundle.manifest.hosted,false);
  assert.equal(bundle.trustAnchor,'Ephemeral local test key; not a Production identity assertion');
  assert.ok(!JSON.stringify(bundle).includes('PRIVATE KEY'));
  assert.ok(verify(null,Buffer.from(canonicalize(bundle.manifest)),bundle.publicKey,Buffer.from(bundle.signature,'base64url')),'Local fixture signature invalid');
}
let data;
if(process.argv.includes('--check'))data=JSON.parse(readFileSync(destination,'utf8'));
else{
  const [torchFile,riverFile,torchSha,riverSha]=process.argv.slice(2);
  assert.ok(torchFile&&riverFile&&/^[a-f0-9]{40}$/.test(torchSha)&&/^[a-f0-9]{40}$/.test(riverSha),'Pass signed Torch/River bundle paths and exact source SHAs');
  data={classification:'ILLUSTRATIVE SIMULATION',hosted:false,torchSha,riverSha,torch:JSON.parse(readFileSync(torchFile,'utf8')),river:JSON.parse(readFileSync(riverFile,'utf8'))};
}
validate(data.torch);validate(data.river);
assert.equal(data.classification,'ILLUSTRATIVE SIMULATION');assert.equal(data.hosted,false);
for(const id of ['A','B','C','D','E','F'])assert.ok(data.torch.manifest.results.some(r=>r.scenario===id),'Missing Torch '+id);
for(const [id,count] of [['A',1],['B',1],['C',0],['D',0],['E',1],['F',1],['G',1]])assert.equal(data.river.manifest.tests.find(r=>r.scenario===id)?.effects,count,'River fixture outcome '+id);
for(const [id,count,probe]of[['H-ALLOW',1,423],['H-DENY',0,200]]){const row=data.river.manifest.tests.find(r=>r.scenario===id);assert.equal(row?.effects,count);assert.equal(row?.exportAfter,probe);assert.equal(row?.signalTrace.replayVerified,true);assert.equal(row?.signalTrace.signatureReplayVerified,true);assert.equal(row?.signalTrace.sourceSha,data.torchSha);assert.ok(row.signalTrace.events.every(event=>['WATCHTOWER_WARNING','CHIRIVETA_REVIEW'].includes(event.kind)),'Registry enrollment snapshots must remain local');}
const output='// Generated from signed LOCAL fixture bundles. Never a runtime authorisation decision.\nexport const recordedEvidence = '+JSON.stringify(data,null,2)+' as const;\n';
if(process.argv.includes('--check'))assert.equal(readFileSync(generated,'utf8').replaceAll('\r\n','\n'),output,'Generated local evidence drift');
else{writeFileSync(destination,JSON.stringify(data,null,2)+'\n');writeFileSync(generated,output);}
console.log(JSON.stringify({verified:true,hosted:false,torchSha:data.torchSha,riverSha:data.riverSha,bundleDigest:createHash('sha256').update(canonicalize(data)).digest('hex')}));
