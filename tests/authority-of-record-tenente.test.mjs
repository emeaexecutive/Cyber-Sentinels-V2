import assert from 'node:assert/strict';
import test from 'node:test';
import {generateKeyPairSync, randomUUID} from 'node:crypto';
import {evaluateDelegatedAction} from '../lib/operational-entities/delegated-authority.ts';
import {executeAuthorizedAction, deriveEnforcementActionDigest} from '../lib/operational-entities/native-enforcement.ts';
import {actionRequestDigest, approvedActionMatches, normalizeExactActionScope, safeExecutionParameters} from '../lib/trust-transaction/action-envelope.ts';
import {signAuthorityReceipt, verifyAuthorityReceipt} from '../lib/trust-receipts/authority-signature.ts';
import {hashCanonical} from '../src/lib/trust-core/hash.ts';
import {executeCanonicalTrustTransaction} from '../src/lib/trust-transaction/canonical.ts';
import {harness} from './fixtures/opengraph-canonical.mjs';
import {composeOpenGraphRequest} from '../src/lib/opengraph/workflow.ts';

import {authorityFixture} from './fixtures/authority-of-record.mjs';

test('unqualified public exact-tool requests remain REVIEW and never reach the legacy relay',async()=>{
 const input=composeOpenGraphRequest({subjectId:'10000000-0000-4000-8000-000000000003',operationalEntityId:'10000000-0000-4000-8000-000000000004',purpose:'read_metadata',environment:'sandbox',targetUrl:'https://example.com/docs',tool:'opengraph.site',idempotencyKey:'exact-tool-unqualified'}, {requestedAt:'2026-09-24T10:00:00.000Z',purposeLineage:{observedPurpose:'read_metadata',purposeEvidence:['fixture:purpose']},targetScope:{domains:['example.com'],subdomains:[],urls:[],deniedDomains:[]}});
 input.managedControl.authorization={decision:'REVIEW',reasonCodes:['EXACT_TOOL_EXECUTION_PATH_REQUIRED']};
 const h=harness(input);const receipt=await executeCanonicalTrustTransaction(input,h.deps);
 assert.equal(receipt.decision,'REVIEW');assert.ok(receipt.reasonCodes.includes('EXACT_TOOL_EXECUTION_PATH_REQUIRED'));assert.ok(!h.calls.includes('requestExternalExecution'));
});

test('TENENTE valid current authority allows and exposes traversable canonical graph',()=>{const r=evaluateDelegatedAction(authorityFixture());assert.equal(r.decision,'ALLOW');assert.equal(r.authorityGraph.valid,true);});
for(const [name,change] of [
 ['revoked parent',f=>f.parentAuthority.revokedAt=f.now], ['expired parent',f=>f.parentAuthority.expiresAt=f.now],
 ['revoked delegation',f=>f.delegation.revokedAt=f.now],['expired delegation',f=>f.delegation.expiresAt=f.now],
 ['suspended delegation',f=>f.delegation.status='SUSPENDED'],['pending delegation',f=>f.delegation.status='PENDING'],
 ['wrong resource',f=>f.action.target='customer:2'],['wrong tool',f=>f.action.tool='payroll'],['wrong environment',f=>f.action.environment='production'],
 ['value above limit',f=>f.action.financialAmount=1000],['NaN amount',f=>f.action.financialAmount=NaN],['negative amount',f=>f.action.financialAmount=-1],
 ['execution count invalid',f=>f.action.executionCount=0],['child expansion',f=>f.delegation.scope={...f.delegation.scope,financialLimit:1000}],
 ['prohibited delegation',f=>f.parentAuthority.canDelegate=false],['changed policy',f=>f.parentAuthority.policyVersion='2'],
 ['wrong tenant',f=>f.delegateIdentity.enterpriseId=randomUUID()],['forged principal',f=>f.acceptance.delegateOperationalEntityId='attacker'],
 ['unconfirmed owner',f=>f.delegateIdentity.ownerState='UNKNOWN'],['future authority',f=>f.parentAuthority.notBefore=f.parentAuthority.expiresAt],
 ['unverified actor',f=>f.delegateIdentity.status='FAILED'],['missing parent chain',f=>{f.delegation.parentDelegationId=randomUUID();f.delegation.depth=2;}],
]) test(`TENENTE denies ${name}`,()=>{const f=authorityFixture();change(f);if(name==='NaN amount')assert.throws(()=>evaluateDelegatedAction(f),/non-finite/);else assert.equal(evaluateDelegatedAction(f).decision,'DENY');});
test('TENENTE unknown runtime requests REVIEW',()=>{const f=authorityFixture();f.delegateIdentity.runtimeBinding='UNKNOWN';assert.equal(evaluateDelegatedAction(f).decision,'REVIEW');});
test('TENENTE checks ancestor revocation and child containment at action time',()=>{
 const f=authorityFixture();const ancestor={...f.delegation,canRedelegate:true};
 f.delegation={...ancestor,delegationId:randomUUID(),parentDelegationId:ancestor.delegationId,delegatorOperationalEntityId:ancestor.delegateOperationalEntityId,delegateOperationalEntityId:'agent:sub',depth:2,canRedelegate:false};
 f.delegateIdentity.operationalEntityId='agent:sub';f.acceptance.delegationId=f.delegation.delegationId;f.acceptance.delegateOperationalEntityId='agent:sub';f.ancestorDelegations=[ancestor];
 assert.equal(evaluateDelegatedAction(f).decision,'ALLOW');ancestor.revokedAt=f.now;assert.equal(evaluateDelegatedAction(f).decision,'DENY');
});
test('review scope includes exact tool, parameters, amount, currency and environment',()=>{
 const scope=normalizeExactActionScope({tool:'refund',provider:'controlled',payload_digest:hashCanonical({amount:100}),data_scope:['customer:1'],amount_minor:10000,currency:'EUR'});
 const request={operationalEntityId:'agent:worker',action:{type:'REFUND',target:'customer:1',environment:'test',exact_scope:scope},decisionType:null,context:null};
 const digest=actionRequestDigest(request);
 assert.equal(approvedActionMatches(digest,{...request,context:{human_approval_reference:'approved:1'}}),true);
 assert.equal(actionRequestDigest({...request,context:{}}),hashCanonical({...request,context:{}}));
 assert.equal(approvedActionMatches(actionRequestDigest({...request,context:{}}),{...request,context:{human_approval_reference:'approved:1'}}),true);
 for(const [field,value] of [['tool','payroll'],['payload_digest','f'.repeat(64)],['amount_minor',100000],['currency','USD']]) assert.notEqual(actionRequestDigest({...request,action:{...request.action,exact_scope:{...scope,[field]:value}}}),digest);
 assert.notEqual(actionRequestDigest({...request,action:{...request.action,environment:'production'}}),digest);
 assert.throws(()=>normalizeExactActionScope({...scope,amount_minor:NaN}));assert.throws(()=>normalizeExactActionScope({...scope,admin:true}));
});
test('executable payload rejects secret fields, cycles and invalid values',()=>{assert.throws(()=>safeExecutionParameters({nested:{api_key:'never-store'}}));assert.throws(()=>safeExecutionParameters({value:Infinity}));assert.deepEqual(safeExecutionParameters({customer:'customer:1'}),{customer:'customer:1'});});
test('receipt Ed25519 signature is tenant-bound, tamper-evident and requires a pinned trust anchor',()=>{
 const keys=generateKeyPairSync('ed25519'), receipt={decision:'ALLOW',action:{amount:100},outcome:'UNKNOWN'}, context={tenantId:'tenant:1',receiptId:'transaction:1',keyId:'platform:1',privateKey:keys.privateKey};
 const proof=signAuthorityReceipt(receipt,context), verifier={...context,trustedKeys:new Map([['platform:1',keys.publicKey]])};
 assert.equal(verifyAuthorityReceipt(receipt,proof,verifier),true);
 for(const changed of [{...receipt,decision:'DENY'},{...receipt,action:{amount:1000}},{...receipt,outcome:'CONFIRMED'}])assert.equal(verifyAuthorityReceipt(changed,proof,verifier),false);
 assert.equal(verifyAuthorityReceipt(receipt,proof,{...verifier,tenantId:'tenant:2'}),false);
 assert.equal(verifyAuthorityReceipt(receipt,{...proof,keyId:'attacker'},verifier),false);
 assert.equal(verifyAuthorityReceipt(receipt,{...proof,algorithm:'none'},verifier),false);
});
test('DENY and unresolved REVIEW never invoke an execution dependency',async()=>{
 for(const decision of ['DENY','REVIEW']){
 const input={enterpriseId:randomUUID(),transactionId:randomUUID(),operationalEntityId:'agent:worker',authorityId:randomUUID(),delegationId:randomUUID(),action:{type:'REFUND',target:'customer:1',environment:'test'},decision,decisionDigest:'a'.repeat(64),idempotencyKey:'test-key'};
 const forbidden=async()=>assert.fail('Blocked decision invoked execution dependency');
 const r=await executeAuthorizedAction(input,{loadCurrentState:forbidden,findByIdempotencyKey:forbidden,reserveRequest:forbidden,adapter:{execute:forbidden}});assert.equal(r.requested,false);
 }
});
test('idempotency cannot substitute a different transaction or payload',async()=>{
 const input={enterpriseId:randomUUID(),transactionId:randomUUID(),operationalEntityId:'agent:worker',authorityId:randomUUID(),delegationId:randomUUID(),action:{type:'REFUND',target:'customer:1',environment:'test',payloadDigest:'a'.repeat(64)},decision:'ALLOW',decisionDigest:'b'.repeat(64),idempotencyKey:'one-use'};
 const prior={...input,requestId:randomUUID(),requestedAt:new Date().toISOString(),actionDigest:deriveEnforcementActionDigest(input)};
 const deps={findByIdempotencyKey:async()=>({request:prior,result:null}),loadCurrentState:async()=>assert.fail(),reserveRequest:async()=>assert.fail(),adapter:{execute:async()=>assert.fail()}};
 assert.equal((await executeAuthorizedAction(input,deps)).duplicate,true);
 await assert.rejects(executeAuthorizedAction({...input,transactionId:randomUUID()},deps),{code:'ENFORCEMENT_IDEMPOTENCY_CONFLICT'});
 await assert.rejects(executeAuthorizedAction({...input,action:{...input.action,payloadDigest:'c'.repeat(64)}},deps),{code:'ENFORCEMENT_IDEMPOTENCY_CONFLICT'});
});
