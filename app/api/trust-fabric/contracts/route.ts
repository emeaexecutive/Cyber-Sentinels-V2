import { enterpriseTrustFabricRepository } from "@/src/lib/trust-fabric/repository";
import { fabricContext,fabricCorrelationId,fabricFailure,fabricResponse,readFabricJson } from "@/src/lib/trust-fabric/http";
import { validateTrustContract } from "@/src/lib/trust-fabric/validation";

export async function GET(request:Request){const correlationId=fabricCorrelationId(request);try{const auth=await fabricContext(request);const contracts=await enterpriseTrustFabricRepository().contracts(auth.enterpriseId);return fabricResponse({ok:true,contracts},200,correlationId);}catch(error){return fabricFailure(error,correlationId);}}
export async function POST(request:Request){const correlationId=fabricCorrelationId(request);try{const body=await readFabricJson(request);const auth=await fabricContext(request,["owner","admin"]);const contract=validateTrustContract(body,auth.enterpriseId);const persistence=await enterpriseTrustFabricRepository().persistContract(auth.enterpriseId,auth.user.id,contract,correlationId);return fabricResponse({ok:true,contract,persistence},201,correlationId);}catch(error){return fabricFailure(error,correlationId);}}
