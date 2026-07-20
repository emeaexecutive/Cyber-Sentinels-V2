import { consensusContext,consensusCorrelationId,consensusFailure,consensusResponse,reference } from "@/src/lib/consensus/http";
import { consensusRepository } from "@/src/lib/consensus/repository";

export async function GET(request:Request,context:{params:Promise<{id:string}>}){const correlationId=consensusCorrelationId(request);try{const auth=await consensusContext(request);const id=reference((await context.params).id,"decisionId");const decision=await consensusRepository().decision(auth.enterpriseId,id);if(!decision)return consensusResponse({ok:false,code:"DECISION_NOT_FOUND",error:"Consensus decision was not found."},404,correlationId);return consensusResponse({ok:true,decision},200,correlationId);}catch(error){return consensusFailure(error,correlationId);}}
