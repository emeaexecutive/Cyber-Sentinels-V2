import {
  boundedLimit,
  continuousTrustContext,
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustReference,
  continuousTrustResponse,
} from "@/src/lib/continuous-trust/http";
import { continuousTrustSignalRepository } from "@/src/lib/continuous-trust/signal-repository";

export async function GET(request: Request, context: { params: Promise<{ entityId: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await continuousTrustContext(request);
    const entityId = continuousTrustReference((await context.params).entityId, "entityId");
    const limit = boundedLimit(request, 100, 500);
    const before = new URL(request.url).searchParams.get("before");
    if (before && !Number.isFinite(Date.parse(before))) {
      throw Object.assign(new Error("before must be an ISO timestamp."), { status: 400, code: "CURSOR_INVALID" });
    }
    const rows = await continuousTrustSignalRepository().listSignals(
      auth.enterpriseId,
      entityId,
      limit,
      before,
    );
    const signals = rows.slice(0, limit);
    return continuousTrustResponse({
      ok: true,
      entityId,
      signals,
      page: {
        limit,
        hasMore: rows.length > limit,
        nextCursor: rows.length > limit ? String(signals.at(-1)?.received_at ?? "") : null,
      },
    }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
