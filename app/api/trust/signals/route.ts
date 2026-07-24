import { checkRequestRateLimit } from "@/lib/security";
import {
  boundedLimit,
  continuousTrustContext,
  continuousTrustCorrelationId,
  continuousTrustFailure,
  continuousTrustResponse,
  mutationContext,
} from "@/src/lib/continuous-trust/http";
import { ingestContinuousTrustSignal } from "@/src/lib/continuous-trust/signal-service";
import { continuousTrustSignalRepository } from "@/src/lib/continuous-trust/signal-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = continuousTrustCorrelationId(request);
  try {
    const auth = await continuousTrustContext(request);
    const limit = boundedLimit(request, 50, 200);
    const signals = await continuousTrustSignalRepository().recentSignals(
      auth.enterpriseId,
      limit,
    );
    return continuousTrustResponse({ ok: true, signals }, 200, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = continuousTrustCorrelationId(request);
  const limited = checkRequestRateLimit({
    route: "continuous-trust-signal-ingestion",
    req: request,
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;
  try {
    const auth = await mutationContext(request, ["owner", "admin", "reviewer"]);
    const body = await request.json() as Record<string, unknown>;
    const result = await ingestContinuousTrustSignal({
      tenantId: auth.enterpriseId,
      actorId: auth.user.id,
      role: auth.role,
      correlationId,
      raw: body,
      idempotencyKey: request.headers.get("idempotency-key"),
    });
    const status = result.duplicate
      ? 200
      : result.processingStatus === "PROCESSED"
        ? 201
        : 202;
    return continuousTrustResponse({ ok: true, ...result }, status, correlationId);
  } catch (error) {
    return continuousTrustFailure(error, correlationId);
  }
}
