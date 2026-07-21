import { architectureContext,architectureCorrelationId,architectureFailure,architectureResponse } from "@/src/lib/trust-architecture/http";
import { trustArchitectureRepository } from "@/src/lib/trust-architecture/repository";
export async function GET(request:Request){const correlationId=architectureCorrelationId(request);try{const auth=await architectureContext(request);return architectureResponse({ok:true,health:await trustArchitectureRepository().health(auth.enterpriseId)},200,correlationId);}catch(error){return architectureFailure(error,correlationId);}}
