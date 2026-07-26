import {
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustReference,
  continuousTrustResponse,
  mutationContext,
} from "@/src/lib/continuous-trust/http";
import { ingestContinuousTrustSignal } from "@/src/lib/continuous-trust/signal-service";

export async function POST(request: Request, context: { params: Promise<{ entityId: string }> }) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await mutationContext(request, ["owner", "admin", "reviewer"]);
    const entityId = continuousTrustReference((await context.params).entityId, "entityId");
    const body = await request.json() as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason || reason.length > 500) {
      throw Object.assign(new Error("A reason of at most 500 characters is required."), { status: 400, code: "MANUAL_REVIEW_REASON_REQUIRED" });
    }
    const result = await ingestContinuousTrustSignal({
      tenantId: auth.enterpriseId,
      actorId: auth.user.id,
      role: auth.role,
      correlationId,
      idempotencyKey: request.headers.get("idempotency-key"),
      raw: {
        entityId,
        entityType: body.entityType,
        signalType: "MANUAL_REVIEW",
        source: "manual-review",
        observedAt: new Date().toISOString(),
        severity: body.severity ?? "MEDIUM",
        confidence: 1,
        status: "INFORMATIONAL",
        metadata: { reason },
      },
    });
    return continuousTrustResponse({ ok: true, entityId, ...result }, result.duplicate ? 200 : 202, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
