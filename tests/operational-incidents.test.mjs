import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { buildIncidentPackage, validateIncidentRecord, verifyEvidence, verifyObservationClaims, INCIDENT_KINDS } from '../lib/operational-incidents/model.ts';
import { hashCanonical } from '../src/lib/trust-core/hash.ts';
import { stagingControlPlaneQualificationEnabled } from '../lib/public-api/v1/environment.ts';
const tenant=randomUUID(), transaction=randomUUID(), incident=randomUUID(), authority=randomUUID();
const at='2026-09-09T12:00:01.000Z';
test('Staging heartbeat qualification is opt-in and rejects the Production database',()=>{
  const env={CYBER_SENTINELS_ENVIRONMENT:'staging',CONTROL_PLANE_STAGING_QUALIFICATION:'true',NEXT_PUBLIC_SUPABASE_URL:'https://agpyhygpfmppjkxwcpac.supabase.co'};
  assert.equal(stagingControlPlaneQualificationEnabled(env),true);
  assert.equal(stagingControlPlaneQualificationEnabled({...env,NEXT_PUBLIC_SUPABASE_URL:'https://kecgtsfibkypjuaxqbjx.supabase.co'}),false);
  assert.equal(stagingControlPlaneQualificationEnabled({...env,CONTROL_PLANE_STAGING_QUALIFICATION:'false'}),false);
  assert.equal(stagingControlPlaneQualificationEnabled({...env,CYBER_SENTINELS_ENVIRONMENT:'production'}),false);
  assert.equal(stagingControlPlaneQualificationEnabled({...env,NEXT_PUBLIC_SUPABASE_URL:'https://invalid.example',SUPABASE_URL:env.NEXT_PUBLIC_SUPABASE_URL}),false);
});
function fixture() {
  const input={incident:{id:incident,enterprise_id:tenant,canonical_case:{summary:'Unit test only'}},links:[],transactions:[{enterprise_id:tenant,transaction_id:transaction,subject_id:'agent:fixture',decision:'ALLOW',action_purpose:'review_repository',authority_reference:authority,authority_lineage_references:[],requested_at:'2026-09-09T12:00:00.000Z',action_type:'READ',action_resource:'repository:fixture',policy_id:'fixture',policy_version:'1',reason_codes:[],request_digest:'a'.repeat(64),evidence_digest:'b'.repeat(64)}],authorities:[{enterprise_id:tenant,id:authority}],evidence:[],events:[],generatedAt:'2026-09-09T12:02:00.000Z',id:randomUUID()};
  for(const [index,kind] of INCIDENT_KINDS.entries()) {
    const id=randomUUID(), evidenceId=kind==='TRANSACTION_LINK'?null:randomUUID();
    const claims={context:{session:'session:'+index}};
    if(kind==='OUTCOME') Object.assign(claims,{outcome_layer:'runtime',outcome_status:'FAILED'});
    if(kind==='PURPOSE_OBSERVATION') claims.observed_purpose='copy_repository';
    const facts={evidenceType:kind,evidence:claims};
    const evidence={evidence_id:evidenceId,enterprise_id:tenant,subject_id:'agent:fixture',provider_key:index%2?'provider:A':'provider:B',source_type:'PROVIDER_ASSERTION',evidence_classification:'PROVIDER_ASSERTION',normalized_facts:facts,payload_hash:hashCanonical(facts),observed_at:at};
    const record={id,transaction_id:transaction,kind,summary:'Fixture '+kind,observed_at:at,evidence_object_id:evidenceId,evidence_digest:evidenceId?evidence.payload_hash:null,context:claims.context,observed_purpose:claims.observed_purpose??null,outcome_layer:claims.outcome_layer??null,outcome_status:claims.outcome_status??null};
    const digest=hashCanonical(record);
    input.links.push({id,enterprise_id:tenant,incident_id:incident,transaction_id:transaction,chronology_event_id:id,evidence_object_id:evidenceId,relation_type:kind,details:{...record,content_digest:digest},content_digest:digest,received_at:at});
    input.events.push({id,enterprise_id:tenant,incident_id:incident});
    if(evidenceId) input.evidence.push(evidence);
  }
  return input;
}
test('complete attributed chronology exports with a reproducible server digest',()=>{
  const pack=buildIncidentPackage(fixture()); const {integrity_digest,...body}=pack;
  assert.equal(integrity_digest,hashCanonical(body)); assert.equal(pack.states.export,'REGULATORY_EXPORT_READY');
  assert.equal(pack.states.timeline,'INCIDENT_TIMELINE_VERIFIED'); assert.deepEqual(pack.gaps,[]);
});
test('one actor retains distinct provider sources and multiple sessions',()=>{
  const pack=buildIncidentPackage(fixture()); assert.equal(pack.actors.length,1);
  assert.deepEqual(new Set(pack.evidence_references.map(e=>e.provider)),new Set(['provider:A','provider:B']));
  assert.ok(new Set(pack.timeline.map(e=>e.context.dimensions?.find(d=>d.dimension==='session')?.reference)).size>2);
  assert.ok(pack.timeline.every(e=>e.source.independently_verified===false));
});
test('later observed purpose does not rewrite the canonical purpose or ALLOW',()=>{
  const input=fixture(),before=structuredClone(input.transactions); const pack=buildIncidentPackage(input);
  assert.deepEqual(input.transactions,before); assert.equal(pack.decisions[0].declared_purpose,'review_repository');
  const later=pack.timeline.find(e=>e.kind==='PURPOSE_OBSERVATION'); assert.equal(later.observed_purpose,'copy_repository'); assert.equal(later.purpose_drift,'UNRESOLVED');
});
test('correlation never establishes attribution or global authorization',()=>{
  const pack=buildIncidentPackage(fixture()); assert.ok(pack.timeline.every(e=>e.attribution==='NOT_ESTABLISHED'&&e.global_authorization==='NOT_INFERRED'));
});
for(const collection of ['links','transactions','evidence','authorities','events']) test(`cross-tenant ${collection} cannot enter a projection`,()=>{
  const input=fixture(); input[collection][0].enterprise_id=randomUUID(); assert.throws(()=>buildIncidentPackage(input),/Cross-tenant/);
});
test('unknown context remains UNKNOWN',()=>{
  const input=fixture(),link=input.links[0]; link.details.context={}; const content={...link.details}; delete content.content_digest;
  link.details.content_digest=link.content_digest=hashCanonical(content);
  assert.deepEqual(buildIncidentPackage(input).timeline.find(e=>e.id===link.id).context,{status:'UNKNOWN'});
});
test('missing evidence, incomplete chronology and unresolved authority cannot export READY',()=>{
  const input=fixture(); input.evidence=[]; input.authorities=[];
  const pack=buildIncidentPackage(input); assert.equal(pack.states.export,'DRAFT'); assert.equal(pack.states.timeline,'UNVERIFIED'); assert.equal(pack.states.authority,'INCIDENT_AUTHORITY_UNRESOLVED');
});
test('changed normalized facts invalidate evidence and export integrity',()=>{
  const input=fixture(); input.evidence[0].normalized_facts.evidence.context.session='tampered';
  assert.equal(buildIncidentPackage(input).states.export,'DRAFT');
});
test('changed chronology content invalidates its digest',()=>{
  const input=fixture(); input.links[0].details.summary='tampered'; assert.equal(buildIncidentPackage(input).states.export,'DRAFT');
});
test('provider failure after ALLOW is an unresolved contradiction, not a rewritten decision',()=>{
  const pack=buildIncidentPackage(fixture()); assert.equal(pack.contradictions[0].evaluation,'UNRESOLVED'); assert.equal(pack.decisions[0].decision,'ALLOW'); assert.equal(pack.outcomes[0].outcome_layer,'runtime');
});
test('replay sorts timestamps deterministically without mutating input order',()=>{
  const input=fixture(); input.links.reverse(); const ids=input.links.map(e=>e.id); const pack=buildIncidentPackage(input);
  assert.deepEqual(input.links.map(e=>e.id),ids); assert.deepEqual(pack.timeline.map(e=>e.id),[...ids].sort());
});
for(const field of ['verified','REGULATORY_EXPORT_READY','PURPOSE_DRIFT','tenant_id','authority_reference']) test(`caller-forged ${field} is rejected`,()=>{
  assert.throws(()=>validateIncidentRecord({transaction_id:transaction,summary:'test',observed_at:at,[field]:true},true),/Unsupported/);
});
test('outcome layers cannot be collapsed into adjudication',()=>{
  assert.throws(()=>validateIncidentRecord({transaction_id:transaction,kind:'OUTCOME',summary:'test',observed_at:at,evidence_object_id:randomUUID(),evidence_digest:'a'.repeat(64),outcome_layer:'adjudicated',outcome_status:'FAILED'}),/Separate outcome/);
});
test('a heartbeat cannot be relabeled as execution evidence',()=>{
  const input=fixture(); const link=input.links.find(e=>e.relation_type==='EXECUTION_OBSERVATION'); const e=input.evidence.find(e=>e.evidence_id===link.evidence_object_id);
  e.normalized_facts.evidenceType='SERVER_VERIFIED_MONITORING_HEARTBEAT'; assert.throws(()=>verifyObservationClaims(link.details,e),/Evidence type/);
});
test('a caller cannot attach another tenant evidence with a valid digest',()=>{
  const e=fixture().evidence[0]; assert.throws(()=>verifyEvidence(e,randomUUID(),e.subject_id,e.payload_hash),/Resource not found/);
});
test('V1 authorization source has no optional incident dependency',async()=>{
  for(const file of ['../lib/trust-transaction/server.ts','../lib/public-api/v1/runtime.ts','../src/lib/trust-transaction/canonical.ts']) assert.doesNotMatch(await readFile(new URL(file,import.meta.url),'utf8'),/operational-incidents|incident_evidence_links/);
});

test('unresolved authority preserves independent evidence completeness but blocks READY',()=>{
  const input=fixture(); input.authorities=[]; const pack=buildIncidentPackage(input);
  assert.equal(pack.states.evidence_completeness,'INCIDENT_EVIDENCE_COMPLETE');
  assert.equal(pack.states.authority,'INCIDENT_AUTHORITY_UNRESOLVED'); assert.equal(pack.states.export,'DRAFT');
});
test('a missing explicitly linked historical source remains an evidence gap',()=>{
  const input=fixture(); const link=input.links.find(row=>row.relation_type==='TRANSACTION_LINK');
  link.evidence_object_id=randomUUID(); link.details.evidence_object_id=link.evidence_object_id;
  link.details.evidence_digest='a'.repeat(64); const content={...link.details}; delete content.content_digest;
  link.content_digest=hashCanonical(content);link.details.content_digest=link.content_digest;
  const pack=buildIncidentPackage(input);assert.equal(pack.states.export,'DRAFT');
  assert.ok(pack.gaps.includes(`MISSING_EVIDENCE:${link.id}`));
});
test('later evaluation and existing outcome sources retain their original decision',()=>{
  const input=fixture();input.transactions[0].decision_outcome_review={evaluationStatus:'CONTRADICTED',adjudicatedOutcome:'DENY'};
  input.existingOutcomes=[{enterprise_id:tenant,transaction_id:transaction,source_table:'public_api_outcome_submissions',independence:'AGENT_ASSERTED',result:'FAILED'}];
  const pack=buildIncidentPackage(input);assert.equal(pack.authorization_phase[0].decision,'ALLOW');
  assert.equal(pack.evaluation_phase[0].review.adjudicatedOutcome,'DENY');assert.equal(pack.existing_outcome_records[0].independence,'AGENT_ASSERTED');
  input.existingOutcomes[0].enterprise_id=randomUUID();assert.throws(()=>buildIncidentPackage(input),/Cross-tenant/);
});
