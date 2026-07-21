import { architectureContext,architectureCorrelationId,architectureFailure,architectureResponse } from "@/src/lib/trust-architecture/http";
import { trustArchitectureRepository } from "@/src/lib/trust-architecture/repository";
export async function GET(request:Request){const correlationId=architectureCorrelationId(request);try{await architectureContext(request);return architectureResponse({ok:true,domains:await trustArchitectureRepository().domains()},200,correlationId);}catch(error){return architectureFailure(error,correlationId);}}
