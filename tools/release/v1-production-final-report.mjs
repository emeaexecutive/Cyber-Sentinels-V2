import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory='docs/release/v1-production-closure';
const read=async name=>JSON.parse(await readFile(`${directory}/${name}.json`,'utf8'));
const [proof,deployment,isolation,cleanup,validation,migration]=await Promise.all(['customer-zero','deployment','tenant-isolation','key-cleanup','final-validation','production-migration-final'].map(read));
const origin=proof.origin;
const checks=await Promise.all(['/','/api/health','/api/ready','/api/v1/openapi.json','/login','/enterprise-access','/developers/docs','/developers/api-keys'].map(async path=>{
  const response=await fetch(`${origin}${path}`,{redirect:'manual'});
  const contentType=response.headers.get('content-type')??'';
  const result={path,status:response.status,redirect:response.headers.get('location')};
  if(contentType.includes('application/json')) {
    const body=await response.json();
    result.body=path.endsWith('openapi.json')?{openapi:body.openapi,version:body.info?.version,pathCount:Object.keys(body.paths??{}).length}:body;
  }
  return result;
}));
const health=checks.find(row=>row.path==='/api/health');
const readiness=checks.find(row=>row.path==='/api/ready');
assert.equal(health.body.release_version,deployment.meta.githubCommitSha);
assert.equal(readiness.body.runtime.commitSha,deployment.meta.githubCommitSha);
assert.equal(readiness.body.status,'READY');
assert.ok(checks.every(row=>row.status===200||row.status===307));
assert.equal(isolation.result,'PASS');
assert.ok(cleanup.keys.every(key=>key.status==='revoked'));
const s=proof.stages;
assert.equal(s.firstDecision.decision,'REVIEW');assert.equal(s.secondDecision.decision,'DENY');
const blocker='The Production authority policy requires SERVER_VERIFIED_AGENT_CONFIGURATION and SERVER_VERIFIED_MONITORING_HEARTBEAT. Their only implemented producer is the synthetic Staging provider, which is prohibited in Production. The legitimate external request therefore returns REVIEW. No evidence was fabricated and no policy was weakened.';
const summary={generatedAt:new Date().toISOString(),verdict:'NO-GO',v1:'NOT CLOSED',v2EntryGate:'CLOSED',mainSha:deployment.meta.githubCommitSha,sourceFreezeSha:deployment.meta.githubCommitSha,deploymentId:deployment.id,deployedSha:deployment.meta.githubCommitSha,decisionExecutionSha:proof.sourceSha,decisionDeploymentId:proof.deploymentId,evidenceRetrievedOnSha:proof.persistedEvidenceAudit.retrievedOnRuntimeSha,apiVersion:checks.find(row=>row.path.endsWith('openapi.json')).body.version,database:{project:migration.project,migration:'PASS',schema:'PASS',rls:'PASS',rpcSecurity:'PASS',originalEntriesUnchanged:migration.changedExistingEntries.length===0,finalLedgerCount:migration.afterCount},agent:s.agent.agent_id,identity:s.identity.identity,challenge:s.challenge.challenge_id,tenant:s.agent.manifest_context.enterprise_id,authority:s.authorityVersion,action:s.firstTransaction.action,first:{decision:s.firstDecision.decision,transaction:s.firstDecision.transaction_id,receipt:s.firstDecision.receipt_url,replay:s.firstDecision.replay_url,evidence:[...new Set(s.firstReceipt.evidence_references.map(row=>row.reference))],memory:proof.persistedEvidenceAudit.firstMemory},revocation:s.revokedAuthority,second:{decision:s.secondDecision.decision,transaction:s.secondDecision.transaction_id,receipt:s.secondDecision.receipt_url,replay:s.secondDecision.replay_url,evidence:[...new Set(s.secondReceipt.evidence_references.map(row=>row.reference))],memory:proof.persistedEvidenceAudit.secondMemory,identity:s.trustState.identity},negativeChecks:{invalidApiKey:s.invalidApiKey.status,wrongEd25519Key:s.wrongEd25519Key,challengeReplay:s.challengeReplay,missingAuthority:s.missingAuthority,wrongAction:s.wrongAction.decision,revokedAuthority:s.secondDecision.decision,tenantIsolation:isolation.result},outcomeReview:{status:'PARTIAL: required original-ALLOW example blocked',observedOriginal:'REVIEW',laterAdjudication:'DENY',evaluation:'CONTRADICTED',originalDecisionDigestAndReasonsImmutable:true,reviewMemory:proof.persistedEvidenceAudit.reviewMemory},worldId:'IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED',validation,temporaryKeysRevoked:true,unresolvedP0:0,unresolvedP1:1,unresolvedP2:0,severityScope:'Release qualification findings, not a blanket assurance about unexercised paths',blockers:[blocker],limitations:['No ALLOW-to-DENY lifecycle established.','No original-ALLOW outcome review established.','No downstream action or model invocation performed.','Readiness externalControls remains BLOCKED: authoritative control-plane evidence required.','Manual review resolution after revocation returned REVIEW_AUTHORITY_INVALID; no approval occurred.','An additional final-runtime cleanup attempt encountered a client ECONNRESET; it is not counted as a completed proof.']};
await writeFile(`${directory}/baseline-final.json`,JSON.stringify({checkedAt:summary.generatedAt,checks},null,2));
await writeFile(`${directory}/proof-summary.json`,JSON.stringify(summary,null,2));
const text=`# CYBER SENTINELS V1 — PRODUCTION PROOF

**PRODUCTION API = NO-GO. V1 = NOT CLOSED. V2 ENTRY GATE = CLOSED.**

Qualified on ${summary.generatedAt}. ${blocker}

## Exact release provenance

| Field | Recorded result |
| --- | --- |
| PR #80 | Qualified head b72955f09c2ccc5558b53771f7680647a0f734b8; normally merged at 2026-09-09T08:21:38Z |
| Initial merge / freeze | 98c223f7acb709dcfab8d33a435d7e551cfd4c2c |
| Release-critical PR #81 | Native agent evidence UUID routing; merged as 92655fd2f11da622b725050f1f33dcd72f0851d5 |
| Release-critical PR #82 | Owned workspace creation under tenant read policies; merged as ${summary.mainSha} |
| Final MAIN / V1 source freeze | ${summary.mainSha} |
| Production deployment | ${summary.deploymentId} |
| Deployed SHA | ${summary.deployedSha} |
| Decision lifecycle executed on | ${summary.decisionExecutionSha}, deployment ${summary.decisionDeploymentId} |
| Evidence re-read and tenant isolation on | ${summary.mainSha} |
| API version | ${summary.apiVersion} |

Deployment metadata, health release version and readiness runtime SHA agree. The later workspace fix did not change authorization code. Historical transaction provenance remains recorded; it is not relabeled as execution on a later commit. Only release-critical fixes were added after the initial freeze. No new product capability, redesign, policy weakening or competitor wording was introduced.

## Production database

Exact target: **kecgtsfibkypjuaxqbjx**, verified before mutation. The initial 108-entry ledger and schema matched the previously qualified reconciliation plan. All original 108 ledger names and SQL hashes remain unchanged.

The documented aliases 20260901120000, 20260903093116 and 20260904100313 were recorded. Only logical migrations 202609060001, 202609060002 and 20260907120000 were applied. Final ledger: **114** entries; post-release dry run: up to date with no pending migrations.

Migration, schema, RLS and checked RPC security: **PASS**. Public-table RLS remains enabled. All five sensitive RPCs checked deny PUBLIC/anon/authenticated execution and allow service_role. World replay uniqueness, provider/action constraints and workspace foreign key are present. Existing rows violate neither newly added NOT VALID constraint; those constraints were not independently marked validated. See [schema](production-schema-after.json) and [migration audit](production-migration-final.json).

A fresh logical backup of public, auth and migration history was created before mutation. Its custom archive listing was readable and Windows DPAPI encryption roundtrip preserved SHA-256 E6C4C6F15CBD956BFCC207DAC595DF49492AC86F926CB2530AF598D4109DA1D2. The encrypted archive remains outside the repository in the operator's local Production backup directory. No fresh restore rehearsal was performed in this run, and no raw backup or credentials are included here.

## External Customer Zero results

The agent used a separate Node HTTP process and public SDK. Its key was issued through the authenticated owner application's supported API-key surface. Its Ed25519 private key was generated outside the server and never exposed. No service-role key, direct database manipulation, internal server function, mocked response, synthetic Production provider or forced decision was used for Customer Zero.

| Field | Actual Production result |
| --- | --- |
| Agent | ${summary.agent} |
| Tenant | ${summary.tenant} |
| Challenge | ${summary.challenge} |
| Identity | VERIFIED |
| Authority | ${summary.authority.authority_id} |
| Delegator | ${summary.authority.issuer} |
| Approver | ${summary.authority.approver} |
| Action | read_repository |
| Resource | repository:customer-zero-v1-release-evidence |
| Purpose / environment | deployment_evidence_review / production |
| Authority validity | ${summary.authority.valid_from} to ${summary.authority.expires_at} |
| Policy | external-agent-trust-v1 / 0.2.0 |
| Decision #1 | **REVIEW**, with valid scope but missing verified configuration/monitoring evidence |
| Transaction #1 | ${summary.first.transaction} |
| Receipt #1 | [Public API receipt](${summary.first.receipt}) — authenticated access required |
| Replay #1 | [Public API Replay](${summary.first.replay}) — authenticated access required |
| Evidence #1 | ${summary.first.evidence.join(', ')} |
| Memory #1 | ${summary.first.memory} |
| Authority revocation | ${s.revocation.revocation_reference} |
| Revocation time | ${summary.revocation.revoked_at} |
| Action #2 | Same agent, resource, action, purpose and environment |
| Identity after revocation | VERIFIED |
| Decision #2 | **DENY**, including AUTHORITY_REVOKED and CONTRACT_REVOKED |
| Transaction #2 | ${summary.second.transaction} |
| Receipt #2 | [Public API receipt](${summary.second.receipt}) — authenticated access required |
| Replay #2 | [Public API Replay](${summary.second.replay}) — authenticated access required |
| Evidence #2 | ${summary.second.evidence.join(', ')} |
| Memory #2 | ${summary.second.memory}; links previous transaction #1 |

Evidence Graph and Trust Memory were retrieved through supported authenticated application APIs. The original decision, digest and reason codes were checked for immutability. Machine-readable evidence is in [customer-zero.json](customer-zero.json) and [application-evidence.json](application-evidence.json).

## Negative and outcome-review checks

| Check | Result |
| --- | --- |
| Invalid API key | PASS: 401 |
| Wrong Ed25519 key | PASS: 409; no verified proof issued |
| Consumed challenge replay | PASS: 409 |
| Missing authority | PASS: 409 AUTHORITY_NOT_FOUND; no ALLOW |
| Wrong action | PASS: DENY |
| Revoked authority | PASS: DENY while identity remained VERIFIED |
| Cross-tenant isolation | PASS: two real workspaces, own-agent positive controls; cross-tenant agent, transaction, receipt and Replay reads rejected with 404 |
| Decision Outcome Review | PARTIAL: original REVIEW preserved; later DENY / CONTRADICTED persisted in receipt, Replay and Memory |
| Required original ALLOW outcome example | **NOT PROVEN**; same Production evidence blocker |

The outcome review is a user-authorized controlled adjudication after revocation, not an assertion of provider success or downstream execution. Review Memory: ${summary.outcomeReview.reviewMemory}. The application's later manual-review resolution guard rejected an attempted rejection because authority was already revoked; no approval was issued.

Tenant isolation evidence: [tenant-isolation.json](tenant-isolation.json). The second workspace was created through the corrected normal form. Both temporary proof API keys were revoked through the supported API-key application path; [cleanup](key-cleanup.json).

## Validation and limitations

Final local suite: **1,343 PASS, 0 failures, 0 skips**. Lint and typecheck passed. Required CI, Production build, Docker qualification, CodeQL and secret scanning passed. CI skips its Windows-only audit-runner test; that test passed locally. The optional Supabase Preview integration was skipped. Production migration qualification was performed independently.

Health, readiness, OpenAPI, login, enterprise access and developer docs are available. Anonymous API-key access redirects to login as expected. Readiness still reports externalControls BLOCKED / AUTHORITATIVE_CONTROL_PLANE_EVIDENCE_REQUIRED; authorization readiness is not evidence of downstream enforcement. See [final baseline](baseline-final.json).

The first Production deployment exposed a fail-closed 503 from querying a UUID evidence ledger with an agent-prefixed identifier. PR #81 corrected it and the subsequent external decision path returned canonical REVIEW/DENY. The initial failed run is preserved in customer-zero-initial-98c223f-blocked.json. No post-fix 5xx was found in the sampled qualification log window. A later optional cleanup request encountered a client ECONNRESET and is not counted as a completed proof.

World ID remains **IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED**.

Homepage positioning was checked for accuracy. It leads with “Before an AI agent acts, prove it has the authority to do so” and explains actor/action/policy evaluation, ALLOW/REVIEW/DENY and preserved evidence. No redesign or competitor comparison was added.

Observed release findings: **P0 = 0; P1 = 1; P2 = 0**. These counts describe this qualification, not all unexercised behavior. The P1 is the missing legitimate Production evidence path required for the mandatory positive ALLOW lifecycle and original-ALLOW outcome review. Closing it requires real Production provider qualification or a separately scoped implementation; this run did not manufacture evidence or add that capability.

**Actual product proof: AI agent → verified identity → valid bounded authority → REVIEW for missing required evidence → receipt / Replay / Memory → revoke authority → same action → DENY with identity still VERIFIED.**

The required **ALLOW → revoke → DENY** proof is not complete. Therefore **V1 is NOT CLOSED and V2 remains CLOSED**. The [demo narrative](CUSTOMER_ZERO_DEMO.md) states only these observed facts.
`;
await writeFile(`${directory}/PRODUCTION_PROOF.md`,text);
console.log(JSON.stringify({verdict:summary.verdict,mainSha:summary.mainSha,deployment:summary.deploymentId,identity:summary.identity,first:summary.first.decision,second:summary.second.decision,tenantIsolation:isolation.result,keysRevoked:summary.temporaryKeysRevoked}));
