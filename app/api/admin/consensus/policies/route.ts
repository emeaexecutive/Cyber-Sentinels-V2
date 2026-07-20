import { assertConsensusMutation,consensusContext,consensusCorrelationId,consensusFailure,consensusResponse } from "@/src/lib/consensus/http";
import { persistConsensusPolicy } from "@/src/lib/consensus/policy-service";
import { validateConsensusPolicy } from "@/src/lib/consensus/types";

export async function POST(request:Request){const correlationId=consensusCorrelationId(request);try{assertConsensusMutation(request);const auth=await consensusContext(request,["owner","admin"]);const policy=validateConsensusPolicy(await request.json());const saved=await persistConsensusPolicy({enterpriseId:auth.enterpriseId,actorId:auth.user.id,policy,correlationId});return consensusResponse({ok:true,policy:saved},201,correlationId);}catch(error){return consensusFailure(error,correlationId);}}
