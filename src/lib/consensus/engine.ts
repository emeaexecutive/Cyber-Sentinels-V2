import { canonicalizeJson } from "../trust-events/canonicalize.ts";
import { sha256Hex } from "../trust-events/hash.ts";
import { detectConsensusConflicts } from "./conflicts.ts";
import { hashConsensusDecision, hashEvidenceSnapshot } from "./decision-lineage.ts";
import { delayedDelivery, freshnessMultiplier } from "./freshness.ts";
import { healthMultiplier } from "./health.ts";
import { assessIndependence } from "./independence.ts";
import { providerCapabilities } from "./provider-capabilities.ts";
import type { ConsensusDecision, ConsensusPolicy, ConsensusTrustState, ProviderHealth, ProviderObservation } from "./types.ts";

const round = (value: number) => Number(Math.max(0, Math.min(1, value)).toFixed(6));
const reason = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
const uuidFromHash=(hash:string)=>`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-${((parseInt(hash[16],16)&3)|8).toString(16)}${hash.slice(17,20)}-${hash.slice(20,32)}`;

export function evaluateConsensus(input: { enterpriseId: string; subjectId: string; workflowId?: string | null; observations: ProviderObservation[]; policy: ConsensusPolicy; health?: ProviderHealth[]; evaluatedAt?: string; priorDecision?: Pick<ConsensusDecision,"decisionId"|"state"> | null; simulated?: boolean; environment?: Record<string,string|undefined> }): ConsensusDecision {
  const evaluatedAt = input.evaluatedAt ? new Date(input.evaluatedAt).toISOString() : new Date().toISOString();
  const capabilities = providerCapabilities(input.environment); const capabilityMap = new Map(capabilities.map((item) => [item.providerKey,item])); const health = new Map((input.health ?? []).map((item)=>[item.providerKey,item]));
  const sorted = [...input.observations].filter((item)=>item.enterpriseId===input.enterpriseId&&item.subjectId===input.subjectId).sort((a,b)=>a.observationId.localeCompare(b.observationId));
  const superseded = new Set(sorted.map((item)=>item.supersedesObservationId).filter(Boolean)); const seenEvidence = new Set<string>();
  const active = sorted.filter((item)=>!superseded.has(item.observationId)); const independence = new Map(assessIndependence(active,capabilities,input.policy.correlationPenalty).map((item)=>[item.observationId,item]));
  const evidence = active.map((observation) => {
    const capability=capabilityMap.get(observation.providerKey); const independent=independence.get(observation.observationId); let ignoredReason:string|null=null;
    if(seenEvidence.has(observation.evidenceDigest)) ignoredReason="DUPLICATE_EVIDENCE"; else seenEvidence.add(observation.evidenceDigest);
    if(!capability) ignoredReason="UNKNOWN_PROVIDER"; else if(!capability.positiveEvidence||capability.baseWeight===0||capability.state!=="ACTIVE") ignoredReason=capability.providerKey==="world_id"?"WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED":"PROVIDER_NOT_POSITIVE_CAPABLE";
    else if(!capability.supportedSignals.includes(observation.signalType)) ignoredReason="UNSUPPORTED_SIGNAL";
    else if(!["PASS","FAIL","REVOKED","BLOCKED"].includes(observation.result)) ignoredReason="NON_CONTRIBUTING_RESULT";
    else if(observation.result==="PASS"&&capability.cryptographicVerificationRequired&&!observation.signatureVerified) ignoredReason="CRYPTOGRAPHIC_VERIFICATION_REQUIRED";
    else if(observation.result==="PASS"&&capability.serverVerificationRequired&&!observation.serverVerified) ignoredReason="SERVER_VERIFICATION_REQUIRED";
    const fresh=capability?freshnessMultiplier(observation,capability.freshnessWindowSeconds,input.policy,evaluatedAt):0;
    if(!ignoredReason&&fresh===0) ignoredReason="STALE_OR_EXPIRED_EVIDENCE";
    const providerHealth=health.get(observation.providerKey)?.state??"UNKNOWN"; const healthWeight=healthMultiplier(providerHealth);
    if(!ignoredReason&&healthWeight===0) ignoredReason="PROVIDER_NOT_OPERATIONAL";
    const crypto=observation.result==="PASS"?(observation.signatureVerified?1:capability?.cryptographicVerificationRequired?0:0.75):1;
    const server=observation.result==="PASS"?(observation.serverVerified?1:capability?.serverVerificationRequired?0:0.9):1;
    const signal=input.policy.signalMultipliers[observation.signalType]??0;
    const magnitude=ignoredReason?0:round((capability?.baseWeight??0)*observation.assurance*observation.quality*crypto*server*fresh*healthWeight*(independent?.multiplier??0)*signal);
    const effectiveWeight=["FAIL","REVOKED","BLOCKED"].includes(observation.result)?-magnitude:magnitude;
    return { observationId:observation.observationId,providerKey:observation.providerKey,result:observation.result,included:!ignoredReason&&magnitude>0,ignoredReason,effectiveWeight,freshnessMultiplier:fresh,independenceMultiplier:independent?.multiplier??0,independenceGroup:independent?.group??null };
  });
  const contributingIds=new Set(evidence.filter((item)=>item.included).map((item)=>item.observationId)); const contributing=active.filter((item)=>contributingIds.has(item.observationId)); const conflicts=detectConsensusConflicts(contributing); const positive=Math.min(1,evidence.filter((item)=>item.effectiveWeight>0).reduce((sum,item)=>sum+item.effectiveWeight,0)); const negative=Math.min(1,Math.abs(evidence.filter((item)=>item.effectiveWeight<0).reduce((sum,item)=>sum+item.effectiveWeight,0)));
  const confidence=Math.round(round(positive-negative)*100); const groups=new Set(evidence.filter((item)=>item.effectiveWeight>0&&item.independenceGroup).map((item)=>item.independenceGroup));
  const mandatory=input.policy.mandatorySignals.every((signal)=>contributing.some((item)=>item.signalType===signal&&item.result==="PASS")); const critical=conflicts.some((item)=>item.severity==="CRITICAL"); const material=conflicts.some((item)=>item.severity==="MATERIAL"); const authoritativeRevocation=contributing.some((item)=>item.result==="REVOKED"&&item.authoritative);
  let state:ConsensusTrustState="INCONCLUSIVE";
  if(authoritativeRevocation) state=input.policy.criticalRevocationOutcome; else if(critical||negative>=input.policy.blockingThreshold) state="BLOCKED"; else if(material) state=input.policy.materialConflictOutcome; else if(mandatory&&confidence>=input.policy.verifiedThreshold&&groups.size>=input.policy.minimumIndependentGroupsVerified) state="VERIFIED"; else if(mandatory&&confidence>=input.policy.trustedThreshold&&groups.size>=input.policy.minimumIndependentGroupsTrusted) state="TRUSTED"; else if(negative>0) state="CHALLENGED";
  const reasonCodes=reason([`CONSENSUS_${state}`,!mandatory?"MANDATORY_EVIDENCE_MISSING":null,groups.size<input.policy.minimumIndependentGroupsVerified?"INDEPENDENT_GROUP_REQUIREMENT_NOT_MET":null,active.some(delayedDelivery)?"DELAYED_PROVIDER_DELIVERY":null,...evidence.map((item)=>item.ignoredReason),...conflicts.map((item)=>item.reasonCode)]);
  const evidenceSnapshotHash=hashEvidenceSnapshot(active.map((item)=>item.observationId)); const idempotencyKey=sha256Hex(canonicalizeJson({enterpriseId:input.enterpriseId,subjectId:input.subjectId,workflowId:input.workflowId??null,policy:`${input.policy.policyId}@${input.policy.version}`,evidenceSnapshotHash}));
  const unsigned:Omit<ConsensusDecision,"decisionHash">={decisionId:uuidFromHash(idempotencyKey),enterpriseId:input.enterpriseId,subjectId:input.subjectId,workflowId:input.workflowId??null,policyId:input.policy.policyId,policyVersion:input.policy.version,evaluatedAt,state,priorState:input.priorDecision?.state??null,confidence,reasonCodes,evidenceSnapshotHash,idempotencyKey,evidence,conflicts,thresholds:{verified:input.policy.verifiedThreshold,trusted:input.policy.trustedThreshold,blocking:input.policy.blockingThreshold,minimumIndependentGroupsVerified:input.policy.minimumIndependentGroupsVerified,minimumIndependentGroupsTrusted:input.policy.minimumIndependentGroupsTrusted},priorDecisionId:input.priorDecision?.decisionId??null,simulated:input.simulated===true};
  return {...unsigned,decisionHash:hashConsensusDecision(unsigned)};
}
