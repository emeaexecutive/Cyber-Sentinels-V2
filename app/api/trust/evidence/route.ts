import { boundedLimit, continuousTrustContext, continuousTrustCorrelationId, continuousTrustFailure, continuousTrustReference, continuousTrustResponse } from "@/src/lib/continuous-trust/http";
import { continuousTrustRepository } from "@/src/lib/continuous-trust/repository";
import { TrustGraphService } from "@/src/core/trust/graph";
import { trustGraphBody, trustGraphContext, trustGraphCorrelationId, trustGraphFailure, trustGraphResponse, trustGraphUuid } from "@/src/core/trust/graph/http";
import { createTrustGraphRepository } from "@/src/core/trust/repositories/supabase";

export const dynamic = "force-dynamic";
export async function GET(request: Request) { const correlationId = continuousTrustCorrelationId(request); try { const auth = await continuousTrustContext(request); const params = new URL(request.url).searchParams; const subjectId = params.get("subjectId") ? continuousTrustReference(params.get("subjectId"), "subjectId") : null; const before = params.get("before"); if (before && !Number.isFinite(Date.parse(before))) throw Object.assign(new Error("before must be an ISO timestamp."), { status: 400, code: "CURSOR_INVALID" }); const limit = boundedLimit(request); const rows = await continuousTrustRepository().listEvidence(auth.enterpriseId, subjectId, limit, before); const evidence = rows.slice(0, limit); return continuousTrustResponse({ ok: true, evidence, page: { limit, hasMore: rows.length > limit, nextCursor: rows.length > limit ? String(evidence.at(-1)?.received_at ?? "") : null } }, 200, correlationId); } catch (error) { return continuousTrustFailure(error, correlationId); } }

export async function POST(request: Request) {
  const correlationId = trustGraphCorrelationId(request);
  try {
    const auth = await trustGraphContext(request, true, ["owner", "admin", "reviewer"]);
    const body = await trustGraphBody(request);
    const evidence = await new TrustGraphService(
      createTrustGraphRepository(auth.supabase),
    ).attachEvidence(
      { tenantId: auth.enterpriseId, actorId: auth.user.id, correlationId },
      {
        entityId: trustGraphUuid(body.entityId, "entityId"),
        source: String(body.source ?? ""),
        provider: String(body.provider ?? ""),
        evidenceType: String(body.evidenceType ?? ""),
        confidence: Number(body.confidence),
        metadata: (body.metadata as Record<string, string | number | boolean | null>) ?? {},
      },
    );
    return trustGraphResponse({ ok: true, evidence }, 201, correlationId);
  } catch (error) {
    return trustGraphFailure(error, correlationId);
  }
}
