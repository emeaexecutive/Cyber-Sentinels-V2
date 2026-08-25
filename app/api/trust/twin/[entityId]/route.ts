import { checkRequestRateLimit } from "@/lib/security";
import { loadCurrentTrustTwin } from "@/lib/trust-fabric/trust-twin-server";
import { architectureContext, architectureCorrelationId, architectureFailure, architectureReference, architectureResponse } from "@/src/lib/trust-architecture/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const limited = checkRequestRateLimit({ route: "/api/trust/twin/{entityId}:get", req: request, limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  const correlationId = architectureCorrelationId(request);
  try {
    const context = await architectureContext(request, ["owner", "admin", "reviewer", "observer"]);
    const entityId = architectureReference(decodeURIComponent((await params).entityId), "entityId");
    const trustTwin = await loadCurrentTrustTwin({ supabase: context.supabase, enterpriseId: context.enterpriseId, entityId });
    return architectureResponse({
      ok: true,
      trustTwin,
      trustPressure: trustTwin.trustPressure,
      trustBudget: trustTwin.trustBudget,
      projectedConsequenceReach: trustTwin.consequenceReach,
      canonicalDecisionBoundary: trustTwin.canonicalDecisionBoundary,
    }, 200, correlationId);
  } catch (error) {
    return architectureFailure(error, correlationId);
  }
}
