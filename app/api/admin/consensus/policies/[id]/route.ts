import { assertConsensusMutation,consensusContext,consensusCorrelationId,consensusFailure,consensusResponse,reference } from "@/src/lib/consensus/http";
import { persistConsensusPolicy } from "@/src/lib/consensus/policy-service";
import { validateConsensusPolicy } from "@/src/lib/consensus/types";

export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){const correlationId=consensusCorrelationId(request);try{assertConsensusMutation(request);const auth=await consensusContext(request,["owner","admin"]);const id=reference((await context.params).id,"policyId");const body=await request.json() as Record<string,unknown>;const policy=validateConsensusPolicy({...body,policyId:id});const saved=await persistConsensusPolicy({enterpriseId:auth.enterpriseId,actorId:auth.user.id,policy,correlationId});return consensusResponse({ok:true,policy:saved},200,correlationId);}catch(error){return consensusFailure(error,correlationId);}}
