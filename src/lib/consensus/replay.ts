import { evaluateConsensus } from "./engine.ts";
import type { ConsensusDecision, ConsensusPolicy, ProviderHealth, ProviderObservation } from "./types.ts";

export function replayConsensus(input: { enterpriseId:string;subjectId:string;workflowId?:string|null;observations:ProviderObservation[];policies:ConsensusPolicy[];health:ProviderHealth[];asOf:string;excludeObservationIds?:string[];providerOutages?:string[];policyOverride?:ConsensusPolicy }) {
  const asOf= new Date(input.asOf).toISOString(); const excluded=new Set(input.excludeObservationIds??[]); const policy=input.policyOverride??[...input.policies].filter((item)=>Date.parse(item.validFrom)<=Date.parse(asOf)).sort((a,b)=>Date.parse(b.validFrom)-Date.parse(a.validFrom))[0];
  if(!policy) throw new Error("No consensus policy was valid at the replay timestamp.");
  const observations=input.observations.filter((item)=>Date.parse(item.receivedAt)<=Date.parse(asOf)&&!excluded.has(item.observationId)); const outage=new Set(input.providerOutages??[]); const health=input.health.filter((item)=>Date.parse(item.observedAt)<=Date.parse(asOf)).map((item)=>outage.has(item.providerKey)?{...item,state:"UNAVAILABLE" as const,reasonCodes:[...item.reasonCodes,"SIMULATED_PROVIDER_OUTAGE"]}:item);
  return evaluateConsensus({enterpriseId:input.enterpriseId,subjectId:input.subjectId,workflowId:input.workflowId,observations,policy,health,evaluatedAt:asOf,simulated:true});
}

export function reconstructConsensusDecision(decision:ConsensusDecision,observations:ProviderObservation[],policy:ConsensusPolicy,health:ProviderHealth[]){return {decision,reconstructed:evaluateConsensus({enterpriseId:decision.enterpriseId,subjectId:decision.subjectId,workflowId:decision.workflowId,observations,policy,health,evaluatedAt:decision.evaluatedAt,priorDecision:decision.priorDecisionId&&decision.priorState?{decisionId:decision.priorDecisionId,state:decision.priorState}:null,simulated:true})};}
