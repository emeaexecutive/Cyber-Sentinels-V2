import { enterpriseTrustFabricRepository } from "@/src/lib/trust-fabric/repository";
import { fabricContext,fabricCorrelationId,fabricFailure,fabricResponse } from "@/src/lib/trust-fabric/http";

export async function GET(request:Request){const correlationId=fabricCorrelationId(request);try{const auth=await fabricContext(request);const url=new URL(request.url);const objects=await enterpriseTrustFabricRepository().objects(auth.enterpriseId,url.searchParams.get("subjectType")??undefined,url.searchParams.get("subjectId")??undefined,Number(url.searchParams.get("limit")??100));return fabricResponse({ok:true,objects},200,correlationId);}catch(error){return fabricFailure(error,correlationId);}}
