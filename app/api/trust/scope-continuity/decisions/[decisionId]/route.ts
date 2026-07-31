import { architectureReference } from "@/src/lib/trust-architecture/http";
import { scopeContinuityContext, scopeContinuityCorrelationId, scopeContinuityFailure, scopeContinuityResponse } from "@/src/lib/scope-continuity/http";
import { scopeContinuityRepository } from "@/src/lib/scope-continuity/repository";

export async function GET(request: Request, context: { params: Promise<{ decisionId: string }> }) {
  const correlationId = scopeContinuityCorrelationId(request);
  try {
    const auth = await scopeContinuityContext(request);
    const decisionId = architectureReference((await context.params).decisionId, "decisionId");
    const result = await scopeContinuityRepository().decision(auth.enterpriseId, decisionId);
    if (!result) return scopeContinuityResponse({ ok: false, code: "SCOPE_DECISION_NOT_FOUND", error: "Scope Continuity decision was not found." }, 404, correlationId);
    return scopeContinuityResponse({ ok: true, ...result }, 200, correlationId);
  } catch (error) {
    return scopeContinuityFailure(error, correlationId);
  }
}
