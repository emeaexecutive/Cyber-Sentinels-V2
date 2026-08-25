import { checkRequestRateLimit } from "@/lib/security";
import { persistSentinelLifecycle } from "@/lib/trust-fabric/sentinel-agents-server";
import { loadSentinelOperations } from "@/lib/trust-fabric/trust-twin-server";
import { architectureContext, architectureCorrelationId, architectureFailure, architectureReference, architectureResponse, assertArchitectureMutation, TrustArchitectureApiError } from "@/src/lib/trust-architecture/http";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 8_192;

async function lifecycleBody(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new TrustArchitectureApiError("Request is too large.", 413, "PAYLOAD_TOO_LARGE");
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) throw new TrustArchitectureApiError("Request is too large.", 413, "PAYLOAD_TOO_LARGE");
  const parsed = JSON.parse(raw) as { action?: unknown; sentinelId?: unknown };
  if (parsed.action !== "PAUSE_SENTINEL" && parsed.action !== "RESUME_SENTINEL") throw new TrustArchitectureApiError("A supported Sentinel lifecycle action is required.", 400, "SENTINEL_LIFECYCLE_ACTION_INVALID");
  return { action: parsed.action, sentinelId: architectureReference(parsed.sentinelId, "sentinelId") };
}

export async function GET(request: Request) {
  const limited = checkRequestRateLimit({ route: "/api/trust/sentinels:get", req: request, limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const correlationId = architectureCorrelationId(request);
  try {
    const context = await architectureContext(request, ["owner", "admin", "reviewer", "observer"]);
    const operations = await loadSentinelOperations({
      supabase: context.supabase,
      enterpriseId: context.enterpriseId,
      generatedAt: new Date().toISOString(),
      owner: `user:${context.user.id}`,
    });
    return architectureResponse({
      ok: true,
      operations,
      persistencePerformed: false,
      externalExecutionInvoked: false,
      canonicalDecisionBoundary: "CANONICAL_TRUST_FABRIC_ONLY",
    }, 200, correlationId);
  } catch (error) {
    return architectureFailure(error, correlationId);
  }
}

export async function POST(request: Request) {
  const limited = checkRequestRateLimit({ route: "/api/trust/sentinels:post", req: request, limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const correlationId = architectureCorrelationId(request);
  try {
    assertArchitectureMutation(request);
    const context = await architectureContext(request, ["owner", "admin"]);
    const body = await lifecycleBody(request);
    const occurredAt = new Date().toISOString();
    const operations = await loadSentinelOperations({
      supabase: context.supabase,
      enterpriseId: context.enterpriseId,
      generatedAt: occurredAt,
      owner: `user:${context.user.id}`,
    });
    const sentinel = operations.sentinels.find((item) => item.sentinelId === body.sentinelId);
    if (!sentinel) throw new TrustArchitectureApiError("The Sentinel was not found in this tenant.", 404, "SENTINEL_NOT_FOUND");
    const requestedState = body.action === "PAUSE_SENTINEL" ? "PAUSED" : "ACTIVE";
    const transition = await persistSentinelLifecycle({ context, sentinel, requestedState, occurredAt, correlationId });
    return architectureResponse({
      ok: true,
      transition,
      canonicalExecutionInvoked: false,
      canonicalSystemAffected: false,
      destructiveKillPerformed: false,
    }, 200, correlationId);
  } catch (error) {
    return architectureFailure(error, correlationId);
  }
}
