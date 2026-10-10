import {
  architectureContext,
  architectureCorrelationId,
  architectureFailure,
  architectureResponse,
  assertArchitectureMutation,
} from "@/src/lib/trust-architecture/http";
import { listEmploymentDecisionEvents, recordEmploymentDecision } from "@/src/lib/employment/decision-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = architectureCorrelationId(request);
  try {
    const context = await architectureContext(request, ["owner", "admin", "reviewer"]);
    const events = await listEmploymentDecisionEvents(context.enterpriseId);
    return architectureResponse({ ok: true, events }, 200, correlationId);
  } catch (error) {
    return architectureFailure(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = architectureCorrelationId(request);
  try {
    assertArchitectureMutation(request);
    if (Number(request.headers.get("content-length") ?? 0) > 32_000) {
      return architectureResponse({ ok: false, code: "PAYLOAD_TOO_LARGE", error: "Request is too large." }, 413, correlationId);
    }
    const context = await architectureContext(request, ["owner", "admin", "reviewer"]);
    const body = await request.json() as Record<string, unknown>;
    const result = await recordEmploymentDecision({
      enterpriseId: context.enterpriseId,
      actorId: context.user.id,
      actorRole: context.role,
      correlationId,
      body,
    });
    return architectureResponse({ ok: true, ...result }, 201, correlationId);
  } catch (error) {
    return architectureFailure(error, correlationId);
  }
}