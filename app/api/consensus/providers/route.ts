import { consensusContext,consensusCorrelationId,consensusFailure,consensusResponse } from "@/src/lib/consensus/http";
import { consensusProviderRegistry } from "@/src/lib/consensus/provider-registry";

export async function GET(request:Request){const correlationId=consensusCorrelationId(request);try{await consensusContext(request);return consensusResponse({ok:true,registry:consensusProviderRegistry()},200,correlationId);}catch(error){return consensusFailure(error,correlationId);}}
