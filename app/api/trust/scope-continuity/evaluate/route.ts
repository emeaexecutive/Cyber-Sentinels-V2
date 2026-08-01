import { evaluateAndPersistScopeContinuity } from "@/src/lib/scope-continuity/service";
import { readScopeContinuityJson, scopeContinuityContext, scopeContinuityCorrelationId, scopeContinuityFailure, scopeContinuityResponse } from "@/src/lib/scope-continuity/http";

export async function POST(request: Request) {
  const correlationId = scopeContinuityCorrelationId(request);
  try {
    const value = await readScopeContinuityJson(request);
    const auth = await scopeContinuityContext(request, ["owner", "admin"]);
    const result = await evaluateAndPersistScopeContinuity({ enterpriseId: auth.enterpriseId, actorId: auth.user.id, value, correlationId });
    return scopeContinuityResponse({ ok: true, ...result }, 201, correlationId);
  } catch (error) {
    return scopeContinuityFailure(error, correlationId);
  }
}
