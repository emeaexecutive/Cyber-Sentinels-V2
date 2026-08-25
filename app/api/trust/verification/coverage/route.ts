import { checkRequestRateLimit } from "@/lib/security";
import { loadAdaptiveVerificationCoverage } from "@/lib/trust-fabric/trust-twin-server";
import { architectureContext, architectureCorrelationId, architectureFailure, architectureResponse } from "@/src/lib/trust-architecture/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = checkRequestRateLimit({ route: "/api/trust/verification/coverage:get", req: request, limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  const correlationId = architectureCorrelationId(request);
  try {
    const context = await architectureContext(request, ["owner", "admin", "reviewer", "observer"]);
    const coverage = await loadAdaptiveVerificationCoverage({
      supabase: context.supabase,
      enterpriseId: context.enterpriseId,
      generatedAt: new Date().toISOString(),
    });
    return architectureResponse({
      ok: true,
      adaptiveTrustVerification: coverage,
      canonicalDecisionBoundary: {
        verifiedDoesNotMeanAuthorized: true,
        verificationCanGrantAuthority: false,
        decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY",
      },
      persistencePerformed: false,
    }, 200, correlationId);
  } catch (error) {
    return architectureFailure(error, correlationId);
  }
}
