import { checkRequestRateLimit } from "@/lib/security";
import { loadCurrentTrustTwin } from "@/lib/trust-fabric/trust-twin-server";
import { COUNTERFACTUAL_CHANGE_TYPES, simulateCounterfactualTrust, type CounterfactualChange } from "@/lib/trust-fabric/trust-twin";
import { architectureContext, architectureCorrelationId, architectureFailure, architectureReference, architectureResponse, assertArchitectureMutation, TrustArchitectureApiError } from "@/src/lib/trust-architecture/http";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 32_768;

async function simulationBody(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new TrustArchitectureApiError("Request is too large.", 413, "PAYLOAD_TOO_LARGE");
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw new TrustArchitectureApiError("Request is too large.", 413, "PAYLOAD_TOO_LARGE");
  const parsed = JSON.parse(raw) as { changes?: unknown };
  if (!Array.isArray(parsed.changes) || parsed.changes.length < 1 || parsed.changes.length > 20) throw new TrustArchitectureApiError("One to twenty counterfactual changes are required.", 400, "COUNTERFACTUAL_CHANGES_INVALID");
  const changes = parsed.changes.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new TrustArchitectureApiError("Each change must be an object.", 400, "COUNTERFACTUAL_CHANGE_INVALID");
    const candidate = item as Record<string, unknown>;
    if (!COUNTERFACTUAL_CHANGE_TYPES.includes(candidate.changeType as CounterfactualChange["changeType"])) throw new TrustArchitectureApiError("A counterfactual change type is unsupported.", 400, "COUNTERFACTUAL_CHANGE_UNSUPPORTED");
    const explanation = candidate.explanation === undefined ? undefined : typeof candidate.explanation === "string" ? candidate.explanation.trim() : "";
    if (explanation !== undefined && (!explanation || explanation.length > 500 || /[\u0000-\u001f\u007f]/.test(explanation))) throw new TrustArchitectureApiError("A counterfactual explanation is invalid.", 400, "COUNTERFACTUAL_EXPLANATION_INVALID");
    return {
      changeType: candidate.changeType,
      target: candidate.target === undefined ? undefined : architectureReference(candidate.target, "change target"),
      explanation,
    } as CounterfactualChange;
  });
  return changes;
}

export async function POST(request: Request, { params }: { params: Promise<{ entityId: string }> }) {
  const limited = checkRequestRateLimit({ route: "/api/trust/twin/{entityId}/simulations:post", req: request, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const correlationId = architectureCorrelationId(request);
  try {
    assertArchitectureMutation(request);
    const context = await architectureContext(request, ["owner", "admin", "reviewer"]);
    const entityId = architectureReference(decodeURIComponent((await params).entityId), "entityId");
    const changes = await simulationBody(request);
    const currentTwin = await loadCurrentTrustTwin({ supabase: context.supabase, enterpriseId: context.enterpriseId, entityId });
    const simulation = simulateCounterfactualTrust({ enterpriseId: context.enterpriseId, currentTwin, changes, evaluatedAt: new Date().toISOString() });
    return architectureResponse({ ok: true, simulation, canonicalExecutionInvoked: false, persistencePerformed: false }, 200, correlationId);
  } catch (error) {
    return architectureFailure(error, correlationId);
  }
}
