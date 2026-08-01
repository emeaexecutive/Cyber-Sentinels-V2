import { fabricContext,fabricCorrelationId,fabricFailure,fabricResponse } from "@/src/lib/trust-fabric/http";
import { enterpriseTrustFabricRepository } from "@/src/lib/trust-fabric/repository";
export async function GET(request:Request){const correlationId=fabricCorrelationId(request);try{const auth=await fabricContext(request);const overview=await enterpriseTrustFabricRepository().overview(auth.enterpriseId);return fabricResponse({ok:true,overview},200,correlationId);}catch(error){return fabricFailure(error,correlationId);}}
