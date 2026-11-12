import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import {LoopSimulation,verifyLoopReplay,loopPolicy} from '../lib/watchtowers/loop-simulation.ts';
async function prepare(){const s=new LoopSimulation();await s.attempt('agent-1','initial');await s.attempt('agent-1','retry');await s.handoff();return s;}
test('fictional failed retries and handoff share final allowance: one ALLOW, one DENY, separately observed one effect',async()=>{
 const s=await prepare();assert.equal(s.snapshot().used,2);const race=await s.race(false);
 assert.deepEqual(race.map(r=>r.decision).sort(),['ALLOW','DENY']);assert.equal(race.find(r=>r.decision==='DENY').reason,'COLLECTIVE_LIMIT_EXCEEDED');
 const snapshot=s.snapshot();assert.equal(snapshot.observed,1);assert.equal(snapshot.used,3);assert.equal(snapshot.estimatedCostMicros,loopPolicy.estimatedSpendCapMicros);
 const observations=snapshot.events.filter(e=>e.kind==='DESTINATION_OBSERVATION');assert.ok(observations.some(e=>e.details.effects===1));assert.ok(observations.some(e=>e.details.deniedRequest&&e.details.effects===0));assert.ok(await verifyLoopReplay(snapshot.events));
 await mkdir('artifacts/execution03-website',{recursive:true});await writeFile('artifacts/execution03-website/loop-final-slot.json',JSON.stringify({environment:'ILLUSTRATIVE BROWSER MODEL',hosted:false,productionGateway:false,race,...snapshot},null,2)+'\n');
});
test('240 further attempts cannot gain slots or destination effects; idempotency preserves original decision',async()=>{
 const s=await prepare();await s.race(false);const replay=await s.attempt('agent-1','final-slot-agent-1','COMPLETE');assert.equal(replay.decision,'ALLOW');
 const attempts=await Promise.all(Array.from({length:240},(_,i)=>s.attempt(i%2?'agent-1':'agent-2',`exhausted-${i}`,'COMPLETE')));assert.ok(attempts.every(d=>d.decision==='DENY'));assert.equal(s.snapshot().observed,1);assert.equal(s.snapshot().used,3);assert.ok(await verifyLoopReplay(s.snapshot().events));
});
test('lost acknowledgement retains UNKNOWN, reconciliation reads destination without retry',async()=>{
 const s=await prepare();const race=await s.race(true);assert.deepEqual(race.map(r=>r.decision).sort(),['ALLOW','DENY']);assert.equal(s.snapshot().observed,null);assert.equal(s.snapshot().unknown.length,1);
 await s.stop();await assert.rejects(s.recover(),/RECONCILE_BEFORE_RECOVERY/);await s.reconcile();await s.recover();assert.equal(s.snapshot().observed,1);assert.equal(s.snapshot().used,3);assert.equal(s.snapshot().unknown.length,0);
 assert.ok(s.snapshot().events.some(e=>e.details.outcome==='UNKNOWN'));assert.ok(s.snapshot().events.some(e=>e.kind==='RECONCILIATION'&&e.details.redispatched===false));assert.equal((await s.attempt('agent-2','post-recovery','COMPLETE')).decision,'DENY');
});
test('emergency stop wins prior to pending race; authorized recovery cannot reset consumed budget',async()=>{
 const s=await prepare();const stop=s.stop();const race=s.race(false);await stop;const decisions=await race;assert.ok(decisions.every(d=>d.decision==='DENY'&&d.reason==='EMERGENCY_STOP_EFFECTIVE'));assert.equal(s.snapshot().observed,null);assert.equal(s.snapshot().used,2);await s.recover();assert.equal(s.snapshot().used,2);assert.equal((await s.attempt('agent-2','fresh-post-recovery','COMPLETE')).decision,'ALLOW');assert.equal(s.snapshot().observed,1);
});
test('tampered evidence fails Replay; fresh reset is a new isolated fictional scenario',async()=>{
 const s=await prepare();await s.race(false);const changed=s.snapshot().events;changed[0].details.decision='DENY';assert.equal(await verifyLoopReplay(changed),false);const fresh=new LoopSimulation();assert.equal(fresh.snapshot().used,0);assert.equal(fresh.snapshot().events.length,0);assert.equal(s.snapshot().used,3);
});
