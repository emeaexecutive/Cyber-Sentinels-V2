import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const directory=process.argv[2];
const read=async name=>JSON.parse(await readFile(join(directory,name),'utf8'));
const proof=await read('customer-zero.json'), app=await read('application-evidence.json');
const s=proof.stages, a=app.stages;
assert.equal(proof.result,'EXTERNAL_AUTHORIZATION_AND_REVOCATION_PASS');
assert.equal(s.identity.identity,'VERIFIED');
assert.equal(s.heartbeat.provenance,'CYBER_SENTINELS_CONTROL_PLANE_VERIFIED');
assert.deepEqual(s.heartbeat.evidence_types,['SERVER_VERIFIED_AGENT_CONFIGURATION','SERVER_VERIFIED_MONITORING_HEARTBEAT']);
assert.equal(s.firstDecision.decision,'ALLOW'); assert.equal(s.secondDecision.decision,'DENY');
assert.equal(s.firstTransaction.decision,'ALLOW'); assert.equal(s.secondTransaction.decision,'DENY');
const consumedControlPlaneEvidence=s.heartbeatConcurrentReplay.evidence.evidence_references;
for(const id of consumedControlPlaneEvidence) {
  assert.ok(s.firstReceipt.evidence_references.some(row=>row.reference===id));
  assert.ok(!s.secondReceipt.evidence_references.some(row=>row.reference===id));
}
for (const field of ['type','purpose','target','environment']) assert.equal(s.firstTransaction.action[field],s.secondTransaction.action[field]);
assert.equal(s.firstTransaction.agent_id,s.secondTransaction.agent_id);
assert.equal(s.revokedAuthority.status,'REVOKED'); assert.equal(s.trustState.identity,'VERIFIED'); assert.equal(s.trustState.authority,'REVOKED');
assert.equal(a.originalReceiptBefore.body.decision,'ALLOW'); assert.equal(a.originalReceiptAfter.body.decision,'ALLOW');
assert.equal(a.originalReceiptAfter.body.decisionDigest,a.originalReceiptBefore.body.decisionDigest);
assert.equal(a.originalReceiptAfter.body.decisionOutcomeReview.originalDecision,'ALLOW');
assert.equal(a.originalReceiptAfter.body.decisionOutcomeReview.adjudicatedOutcome,'DENY');
assert.equal(a.originalReceiptAfter.body.decisionOutcomeReview.evaluationStatus,'CONTRADICTED');
for (const replay of [s.firstReplay,s.secondReplay]) {
  assert.ok(replay.events.length>0);
  const times=replay.events.map(event=>Date.parse(event.timestamp));
  assert.ok(times.every(Number.isFinite));
  assert.deepEqual(times,[...times].sort((a,b)=>a-b));
}
const memory=a.trustMemory.body.timeline.memory;
const first=memory.find(row=>row.memory_type==='CANONICAL_TRUST_TRANSACTION'&&row.source_id===s.firstDecision.transaction_id);
const second=memory.find(row=>row.memory_type==='CANONICAL_TRUST_TRANSACTION'&&row.source_id===s.secondDecision.transaction_id);
const review=memory.find(row=>row.memory_type==='DECISION_OUTCOME_REVIEW'&&row.source_id===s.firstDecision.transaction_id);
assert.equal(first.summary.originalDecision,'ALLOW'); assert.equal(second.summary.originalDecision,'DENY');
assert.equal(second.summary.previousTransactionId,s.firstDecision.transaction_id); assert.ok(review);
assert.ok(Date.parse(first.occurred_at)<Date.parse(second.occurred_at));
const isolation=await read('tenant-isolation.json'), cleanup=await read('key-cleanup.json');
assert.equal(isolation.result,'PASS'); assert.notEqual(isolation.tenantA,isolation.tenantB);
assert.equal(cleanup.keys.length,2); assert.ok(cleanup.keys.every(key=>key.status==='revoked'&&key.httpStatus===200));
const firstCleanup=await read('attempt-1-key-cleanup.json');
assert.equal(firstCleanup.keys.length,2); assert.ok(firstCleanup.keys.every(key=>key.status==='revoked'&&key.httpStatus===200));
assert.equal((await read('revoked-key-rejection.json')).status,'PASS');
assert.equal((await read('offline-signature-verification.json')).status,'PASS');
const result={status:'PASS',verifiedAt:new Date().toISOString(),sourceSha:proof.sourceSha,deploymentId:proof.deploymentId,agent:s.agent.agent_id,
  firstTransaction:s.firstDecision.transaction_id,firstDecision:'ALLOW',secondTransaction:s.secondDecision.transaction_id,secondDecision:'DENY',
  authority:s.authority.authority_id,authorityRevoked:true,identityAfterRevocation:'VERIFIED',originalDecisionImmutable:true,
  outcomeReview:'CONTRADICTED',replayChronology:true,trustMemory:[first.memory_id,second.memory_id,review.memory_id],tenantIsolation:true,temporaryKeysRevoked:true,temporaryKeyCount:4,
  controlPlaneEvidence:consumedControlPlaneEvidence,initialHeartbeatEvidence:s.heartbeat.evidence_references,revokedControlPlaneEvidenceExcluded:true,monitoringScope:'SIGNED_CONTROL_PLANE_HEARTBEAT_ONLY',downstreamExecutionObserved:false};
await writeFile(join(directory,'proof-validation.json'),JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
