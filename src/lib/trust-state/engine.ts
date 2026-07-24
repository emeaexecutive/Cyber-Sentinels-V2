import { hashCanonical, deterministicUuid } from "../trust-core/hash.ts";
import { normalizeReasonCodes } from "../trust-core/reason-codes.ts";
import { isExpired, normalizeUtcTimestamp } from "../trust-core/time.ts";
import { assertPositiveEvidenceEligible, validateEvidenceObject } from "../trust-architecture/evidence.ts";
import type { TrustDecisionContract } from "../trust-architecture/decision-contracts.ts";
import { assertTransition } from "./transitions.ts";
import type { TrustState, TrustStateDecision, TrustStatePolicy, TrustStateRecommendation } from "./types.ts";

function deriveSafeState(input: { recommendation: TrustStateRecommendation; evidence: ReturnType<typeof validateEvidenceObject>[]; decidedAt: string; policy: TrustStatePolicy }): { state: TrustState; reasons: string[] } {
  const reasons=[...input.recommendation.reasonCodes];
  const current=input.evidence.filter((item)=>!isExpired(item.expiresAt,input.decidedAt));
  const positive=current.filter((item)=>item.result==="POSITIVE");
  const revoked=current.some((item)=>item.result==="REVOKED");
  const worldOnly=positive.length>0&&positive.every((item)=>item.sourceKey.toLowerCase()==="world_id");
  if(revoked)return {state:"REVOKED",reasons:[...reasons,"EVIDENCE_REVOKED"]};
  if(["VERIFIED","TRUSTED"].includes(input.recommendation.recommendedState)&&input.evidence.length>0&&current.length===0)return {state:"EXPIRED",reasons:[...reasons,"EVIDENCE_EXPIRED"]};
  if(input.recommendation.recommendedState==="VERIFIED"){
    if(positive.length<input.policy.minimumEvidenceForVerified)return {state:"INCONCLUSIVE",reasons:[...reasons,"EVIDENCE_INSUFFICIENT"]};
    if(worldOnly)return {state:"INCONCLUSIVE",reasons:[...reasons,"WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"]};
  }
  if(input.recommendation.recommendedState==="TRUSTED"&&positive.length<input.policy.minimumEvidenceForTrusted)return {state:"INCONCLUSIVE",reasons:[...reasons,"EVIDENCE_INSUFFICIENT"]};
  if(["VERIFIED","TRUSTED"].includes(input.recommendation.recommendedState)&&positive.length===0)return {state:"INCONCLUSIVE",reasons:[...reasons,"EVIDENCE_INSUFFICIENT"]};
  return {state:input.recommendation.recommendedState,reasons};
}

export function evaluateTrustState(input: { contract: TrustDecisionContract; priorState: TrustState; recommendation: TrustStateRecommendation; evidence: unknown[]; policy: TrustStatePolicy; decidedAt?: string; runtime?: { score: number; evidenceFreshness: string; nextEvaluationAt: string; riskFlags: string[]; sourceEventId: string | null; decisionReasonSummary: string; transitionType: string; assessmentId: string } }): TrustStateDecision {
  const decidedAt=normalizeUtcTimestamp(input.decidedAt??new Date().toISOString(),"decidedAt");
  const evidence=input.evidence.map(validateEvidenceObject);
  const idSnapshot=hashCanonical(evidence.map((item)=>item.evidenceId).sort());
  const detailedSnapshot=hashCanonical(evidence.map((item)=>({evidenceId:item.evidenceId,result:item.result,assuranceLevel:item.assuranceLevel,sourceKey:item.sourceKey,occurredAt:item.occurredAt,expiresAt:item.expiresAt??null,payloadHash:item.payloadHash})).sort((left,right)=>left.evidenceId.localeCompare(right.evidenceId)));
  if(![idSnapshot,detailedSnapshot].includes(input.contract.evidenceSnapshotHash))throw Object.assign(new Error("Evidence snapshot does not match the decision contract."),{code:"EVIDENCE_SNAPSHOT_MISMATCH"});
  for(const item of evidence)assertPositiveEvidenceEligible(item);
  const safe=deriveSafeState({recommendation:input.recommendation,evidence,decidedAt,policy:input.policy});
  assertTransition(input.priorState,safe.state,input.policy.allowRecoveryFromBlocked);
  const unsigned={decisionContractId:input.contract.decisionContractId,enterpriseId:input.contract.enterpriseId,domainKey:input.contract.domainKey,subjectId:input.contract.subjectId,priorState:input.priorState,nextState:safe.state,recommendationId:input.recommendation.recommendationId,policyId:input.policy.policyId,policyVersion:input.policy.policyVersion,confidence:Math.max(0,Math.min(100,Math.round(input.recommendation.confidence))),evidenceSnapshotHash:input.contract.evidenceSnapshotHash,decisionInputHash:input.contract.decisionInputHash,decidedAt,reasonCodes:normalizeReasonCodes([...safe.reasons,"STATE_TRANSITION_APPLIED"]),...(input.runtime?{score:Math.max(0,Math.min(100,Math.round(input.runtime.score))),evidenceFreshness:input.runtime.evidenceFreshness,nextEvaluationAt:normalizeUtcTimestamp(input.runtime.nextEvaluationAt,"nextEvaluationAt"),riskFlags:normalizeReasonCodes(input.runtime.riskFlags),sourceEventId:input.runtime.sourceEventId,decisionReasonSummary:input.runtime.decisionReasonSummary.slice(0,500),transitionType:input.runtime.transitionType,assessmentId:input.runtime.assessmentId}:{}),evidence};
  const stateDecisionId=deterministicUuid(unsigned as unknown as Record<string,unknown>);
  return {...unsigned,stateDecisionId,decisionHash:hashCanonical({...unsigned,stateDecisionId} as unknown as Record<string,unknown>)};
}
