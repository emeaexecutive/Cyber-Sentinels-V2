import { consensusContext,consensusCorrelationId,consensusFailure,consensusResponse,reference } from "@/src/lib/consensus/http";
import { consensusRepository } from "@/src/lib/consensus/repository";

export async function GET(request:Request,context:{params:Promise<{subjectId:string}>}){const correlationId=consensusCorrelationId(request);try{const auth=await consensusContext(request);const subjectId=reference((await context.params).subjectId,"subjectId");const decisions=await consensusRepository().subjectDecisions(auth.enterpriseId,subjectId);return consensusResponse({ok:true,subjectId,decisions},200,correlationId);}catch(error){return consensusFailure(error,correlationId);}}
