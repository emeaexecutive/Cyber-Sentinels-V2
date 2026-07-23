import { boundedLimit, continuousTrustContext, continuousTrustCorrelationId, continuousTrustFailure, continuousTrustReference, continuousTrustResponse } from "@/src/lib/continuous-trust/http";
import { continuousTrustRepository } from "@/src/lib/continuous-trust/repository";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { const correlationId = continuousTrustCorrelationId(request); try { const auth = await continuousTrustContext(request); const value = new URL(request.url).searchParams.get("subjectId"); const subjectId = value ? continuousTrustReference(value, "subjectId") : null; const limit = boundedLimit(request); const events = await continuousTrustRepository().events(auth.enterpriseId, subjectId, limit); return continuousTrustResponse({ ok: true, events, page: { limit, hasMore: events.length === limit } }, 200, correlationId); } catch (error) { return continuousTrustFailure(error, correlationId); } }
