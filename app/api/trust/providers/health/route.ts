import { boundedLimit, continuousTrustContext, continuousTrustCorrelationId, continuousTrustFailure, continuousTrustResponse } from "@/src/lib/continuous-trust/http";
import { continuousTrustRepository } from "@/src/lib/continuous-trust/repository";

export async function GET(request: Request) { const correlationId = continuousTrustCorrelationId(request); try { const auth = await continuousTrustContext(request); const providers = await continuousTrustRepository().providerHealth(auth.enterpriseId, boundedLimit(request, 50, 200)); return continuousTrustResponse({ ok: true, providers, measured: providers.length > 0 }, 200, correlationId); } catch (error) { return continuousTrustFailure(error, correlationId); } }
