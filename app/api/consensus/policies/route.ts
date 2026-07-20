import { consensusContext,consensusCorrelationId,consensusFailure,consensusResponse } from "@/src/lib/consensus/http";
import { defaultConsensusPolicy } from "@/src/lib/consensus/policy";
import { consensusRepository } from "@/src/lib/consensus/repository";

export async function GET(request:Request){const correlationId=consensusCorrelationId(request);try{const auth=await consensusContext(request);const policies=await consensusRepository().policies(auth.enterpriseId);return consensusResponse({ok:true,policies:policies.length?policies:[defaultConsensusPolicy]},200,correlationId);}catch(error){return consensusFailure(error,correlationId);}}
