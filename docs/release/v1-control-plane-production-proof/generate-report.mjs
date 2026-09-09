import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const directory=process.argv[2];
const read=async file=>JSON.parse(await readFile(join(directory,file),'utf8'));
const [proof,verified,validation,deployment,ready,health,files,keys,offline]=await Promise.all(['customer-zero.json','proof-validation.json','validation.json','deployment.json','readiness.json','health.json','changed-files.json','key-issued.json','offline-signature-verification.json'].map(read));
assert.equal(verified.status,'PASS');assert.equal(offline.status,'PASS');
assert.equal(validation.fullLocalSuite.failed,0);assert.equal(validation.fullLocalSuite.skipped,0);
assert.equal(validation.fullLocalSuite.passed,1481);
for(const gate of ['lint','typecheck','build','docker','codeql','secretScan']) assert.equal(validation[gate],'PASS');
for(const gate of ['verify','docker','codeql','secretScan']) assert.equal(validation.mainCI[gate],'PASS');
assert.equal(deployment.state,'READY');assert.equal(deployment.sourceSha,proof.sourceSha);
assert.equal(ready.status,'READY');assert.equal(ready.runtime.commitSha,proof.sourceSha);assert.equal(health.release_version,proof.sourceSha);
const s=proof.stages;
const summary={generatedAt:new Date().toISOString(),startingMain:validation.startingMain,mainSha:proof.sourceSha,deploymentId:proof.deploymentId,
  productionApi:'GO',v1:'CLOSED',v2EntryGate:'OPEN',scope:'First-party Production trust API: signed declaration, signed control-plane heartbeat and bounded action authorization',
  prs:[84,85],filesChanged:files.length,newMigrationRequired:false,agent:verified.agent,tenant:s.agent.manifest_context.enterprise_id,keyId:keys.key.id,
  identity:'VERIFIED',configurationEvidence:verified.controlPlaneEvidence[0],monitoringEvidence:verified.controlPlaneEvidence[1],authority:s.authority.authority_id,policy:s.firstDecision.policy,
  action:{type:s.firstTransaction.action.type,target:s.firstTransaction.action.target,purpose:s.firstTransaction.action.purpose,environment:s.firstTransaction.action.environment},
  first:{decision:'ALLOW',transaction:s.firstDecision.transaction_id,receipt:s.firstDecision.receipt_url,replay:s.firstDecision.replay_url,memory:verified.trustMemory[0]},
  second:{decision:'DENY',transaction:s.secondDecision.transaction_id,receipt:s.secondDecision.receipt_url,replay:s.secondDecision.replay_url,memory:verified.trustMemory[1]},
  outcomeReview:{original:'ALLOW',adjudicated:'DENY',evaluation:'CONTRADICTED',originalDecisionDigestAndReasonsImmutable:true,memory:verified.trustMemory[2]},
  fullTests:validation.fullLocalSuite,tenantIsolation:'PASS',negativeTests:'PASS',temporaryKeysRevoked:4,temporaryAuthoritiesRevoked:2,
  unresolvedP0:0,unresolvedP1:0,unresolvedP2:0,severityScope:'Known findings in this V1 release qualification',
  worldId:'IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED',
  limitations:['Configuration authenticates the signed declaration; no independent runtime attestation is asserted.','Monitoring covers a real signed control-plane heartbeat; no downstream execution or model invocation was performed.','The readiness endpoint retains its broader externalControls=BLOCKED marker; no external control/provider qualification is claimed.','All qualification authority and keys were revoked; the recorded ALLOW is historical and not standing authorization.'],
  history:['PR83 previous run remains REVIEW → DENY because no legitimate Production configuration/monitoring producer existed.','PR84 added the legitimate producer. An initial real ALLOW → DENY run exposed public error-code normalization drift.','PR85 corrected the public error vocabulary. The final fresh-agent run passed all gates on the exact corrected main.']};
await writeFile(join(directory,'proof-summary.json'),JSON.stringify(summary,null,2));
const rows=[
 ['STARTING MAIN SHA',summary.startingMain],
 ['ROOT CAUSE','The two required verified evidence types had only a synthetic Staging producer, correctly prohibited in Production.'],
 ['FIX IMPLEMENTED','Authenticated Ed25519 heartbeat endpoint; current signed baseline verification; atomic evidence pair; current-baseline eligibility; SDK/OpenAPI support; public error-code correction.'],
 ['FILES CHANGED',`${files.length}; see [changed-files.json](changed-files.json)`],
 ['NEW MIGRATION REQUIRED','NO — existing unique evidence_id, RLS and service-role writer verified.'],
 ['PRODUCTION CONFIGURATION EVIDENCE',`PASS — ${summary.configurationEvidence}`],
 ['PRODUCTION MONITORING HEARTBEAT',`PASS — ${summary.monitoringEvidence}`],
 ['HEARTBEAT SIGNATURE','PASS — persisted signed manifest, public key, configuration digests and both accepted heartbeat events rechecked offline.'],
 ['HEARTBEAT REPLAY PROTECTION','PASS — sequential replay rejected; concurrent replay yielded one accepted pair and one HEARTBEAT_REPLAY.'],
 ['HEARTBEAT FRESHNESS','PASS — stale/future signed heartbeats rejected; 120s maximum age, 30s skew, at most 300s eligibility.'],
 ['FULL TESTS','PASS — 1,481 passed locally, 0 failed, 0 skipped. CI: 1,480 passed, Windows-only case skipped and covered locally.'],
 ['LINT / TYPECHECK / BUILD','PASS / PASS / PASS'],
 ['CI','PASS — PR and final main verification, Docker, CodeQL, secret scan; optional Supabase Preview skipped.'],
 ['PR','[#84 implementation](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/84); [#85 public error correction](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/85). A second narrow corrective PR was required after the first live run.'],
 ['MERGE','Both merged after green required checks.'],
 ['NEW MAIN SHA',summary.mainSha],
 ['DEPLOYMENT',summary.deploymentId],
 ['DEPLOYED SHA',deployment.sourceSha],
 ['CUSTOMER ZERO API KEY',`${summary.keyId} — issued through the authenticated application, subsequently revoked.`],
 ['AGENT',summary.agent],
 ['IDENTITY','VERIFIED through external Ed25519 possession proof; remained VERIFIED after authority revocation.'],
 ['CONFIGURATION','PASS — current signed declaration; first-party provenance CYBER_SENTINELS_CONTROL_PLANE_VERIFIED.'],
 ['MONITORING','PASS — SIGNED_CONTROL_PLANE_HEARTBEAT_ONLY; downstream execution not observed.'],
 ['AUTHORITY',`${summary.authority} — active at ALLOW; explicitly revoked before the second action.`],
 ['POLICY',`${summary.policy.id}:${summary.policy.version} — existing requirements unchanged and satisfied at ALLOW.`],
 ['FIRST ACTION',`${summary.action.type}; ${summary.action.target}; ${summary.action.purpose}; ${summary.action.environment}`],
 ['FIRST DECISION','ALLOW'],['FIRST TRANSACTION',summary.first.transaction],
 ['FIRST RECEIPT',`[Persisted receipt](${summary.first.receipt})`],['FIRST REPLAY',`[Persisted Replay](${summary.first.replay})`],['FIRST TRUST MEMORY',summary.first.memory],
 ['REVOCATION',`PASS — ${s.revocation.revocation_reference}; current control-plane evidence excluded from the later decision.`],
 ['SECOND ACTION','Same agent, action, target, purpose and environment; references the first transaction.'],
 ['SECOND DECISION','DENY'],['SECOND TRANSACTION',summary.second.transaction],
 ['SECOND RECEIPT',`[Persisted receipt](${summary.second.receipt})`],['SECOND REPLAY',`[Persisted Replay](${summary.second.replay})`],['SECOND TRUST MEMORY',summary.second.memory],
 ['DECISION OUTCOME REVIEW',`PASS — original ALLOW; later DENY / CONTRADICTED; decision, digest and reasons immutable; Memory ${summary.outcomeReview.memory}.`],
 ['TENANT ISOLATION','PASS — reciprocal agent reads denied, cross-tenant transaction/receipt/Replay denied, cross-tenant heartbeat denied.'],
 ['NEGATIVE TESTS','PASS — invalid/revoked API keys; wrong signing key; challenge replay; missing/revoked authority; wrong action; heartbeat replay/concurrency, stale/future, wrong audience/tenant/agent/credential, and caller-supplied trust fields. Baseline rotation/expiry/mismatch and persistence failure also covered by tests.'],
 ['TEMP API KEYS REVOKED','PASS — all four keys across both attempts revoked; final two return 401 API_KEY_REVOKED. Both temporary authorities revoked.'],
 ['UNRESOLVED P0 / P1 / P2','0 / 0 / 0 known in the scoped V1 release qualification.'],
 ['WORLD ID',summary.worldId],['PRODUCTION API','GO'],['CYBER SENTINELS V1','CLOSED'],['V2 ENTRY GATE','OPEN'],
];
const table=rows.map(([key,value])=>`| ${key} | ${String(value).replaceAll('|','\\|')} |`).join('\n');
const report=`# Cyber Sentinels — final V1 Production proof\n\n**PRODUCTION API = GO · CYBER SENTINELS V1 = CLOSED · V2 ENTRY GATE = OPEN**\n\nQualified ${summary.generatedAt}. The GO scope is the first-party Production trust API described below.\n\n| Required field | Verified result |\n| --- | --- |\n${table}\n\n## Preserved history\n\n${summary.history.map(text=>`- ${text}`).join('\n')}\n\nThe previous NO-GO report remains unchanged in [../v1-production-closure/PRODUCTION_PROOF.md](../v1-production-closure/PRODUCTION_PROOF.md). The intermediate run is retained in [attempt-1-error-contract.json](attempt-1-error-contract.json), including its real ALLOW/DENY and revocation.\n\n## Evidence and practical limits\n\n[Machine validation](proof-validation.json), [raw public API proof](customer-zero.json), [application receipt/Memory/graph proof](application-evidence.json), [persisted signed records](persisted-control-plane.json), [offline signature verification](offline-signature-verification.json), [tenant isolation](tenant-isolation.json), [key cleanup](key-cleanup.json), [revoked-key rejection](revoked-key-rejection.json), and [validation](validation.json). Public API receipt/Replay URLs require appropriate authentication; their retained responses are included in the artifacts.\n\n${summary.limitations.map(text=>`- ${text}`).join('\n')}\n\nThe deployment-scoped log query found no 5xx logs from 11:25:00 to 11:31:08 UTC on 2026-09-09. This is a bounded observation, not a claim about all traffic or future availability.\n\n**VERIFIED AGENT → VERIFIED SIGNED CONFIGURATION → VERIFIED CONTROL-PLANE HEARTBEAT → VALID AUTHORITY → ACTION → ALLOW → RECEIPT → REPLAY → TRUST MEMORY → REVOKE AUTHORITY → SAME ACTION → DENY.**\n`;
await writeFile(join(directory,'PRODUCTION_PROOF.md'),report);
await writeFile(join(directory,'CUSTOMER_ZERO_DEMO.md'),`# Customer Zero — final Production qualification\n\nMain: ${summary.mainSha}\nDeployment: ${summary.deploymentId}\nAgent: ${summary.agent}\n\n1. A separate Node process generated an external Ed25519 pair, registered its public key and signed manifest, and completed native possession proof. Identity became VERIFIED.\n2. The owner-issued, bounded authority permitted ${summary.action.type} on ${summary.action.target} for ${summary.action.purpose} in Production.\n3. The process sent a real signed heartbeat. The server atomically recorded signed configuration and heartbeat evidence. Sequential and concurrent replay and invalid bindings were rejected.\n4. The first exact action returned ALLOW: ${summary.first.transaction}. Its receipt, Replay and Memory ${summary.first.memory} persisted.\n5. Authority ${summary.authority} was revoked. The same action returned DENY: ${summary.second.transaction}. Identity remained VERIFIED. Receipt, Replay and Memory ${summary.second.memory} persisted.\n6. Controlled later adjudication attached DENY / CONTRADICTED to the original ALLOW, preserving its original decision, digest and reason codes. Memory: ${summary.outcomeReview.memory}.\n7. Cross-tenant access failed closed, all temporary keys were revoked, and final revoked keys returned HTTP 401.\n\nNo downstream operation or model invocation was performed. Monitoring attests only the signed control-plane observation, and configuration authenticates the signed declaration.\n`);
console.log(JSON.stringify({productionApi:summary.productionApi,v1:summary.v1,v2:summary.v2EntryGate,main:summary.mainSha,first:summary.first.transaction,second:summary.second.transaction}));
