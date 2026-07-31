import { architectureReference } from "@/src/lib/trust-architecture/http";
import { scopeContinuityContext, scopeContinuityCorrelationId, scopeContinuityFailure, scopeContinuityResponse } from "@/src/lib/scope-continuity/http";
import { scopeContinuityRepository } from "@/src/lib/scope-continuity/repository";

export async function GET(request: Request, context: { params: Promise<{ executionContextId: string }> }) {
  const correlationId = scopeContinuityCorrelationId(request);
  try {
    const auth = await scopeContinuityContext(request);
    const executionContextId = architectureReference((await context.params).executionContextId, "executionContextId");
    const replay = await scopeContinuityRepository().replay(auth.enterpriseId, executionContextId);
    return scopeContinuityResponse({ ok: true, executionContextId, replay, boundary: "Replay shows attributed evidence and decisions only; it does not imply an external action occurred without evidence." }, 200, correlationId);
  } catch (error) {
    return scopeContinuityFailure(error, correlationId);
  }
}
