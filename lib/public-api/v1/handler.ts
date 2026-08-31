import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  correlationId,
  PublicApiError,
  publicApiErrorResponse,
  requestId,
  type PublicApiScope,
} from "./contracts";
import {
  authenticatePublicApiRequest,
  type PublicApiPrincipal,
} from "./authentication";

type RouteClass = "registration" | "challenge" | "proof" | "authority" | "review" | "decision" | "read" | "evidence" | "outcome";
const limits: Record<RouteClass, { limit: number; windowSeconds: number }> = {
  registration: { limit: 20, windowSeconds: 60 },
  challenge: { limit: 30, windowSeconds: 60 },
  proof: { limit: 30, windowSeconds: 60 },
  authority: { limit: 60, windowSeconds: 60 },
  review: { limit: 60, windowSeconds: 60 },
  decision: { limit: 60, windowSeconds: 60 },
  read: { limit: 240, windowSeconds: 60 },
  evidence: { limit: 120, windowSeconds: 60 },
  outcome: { limit: 60, windowSeconds: 60 },
};

export type PublicApiContext = {
  principal: PublicApiPrincipal;
  correlationId: string;
  requestId: string;
  startedAt: number;
};

async function consumeRateLimit(principal: PublicApiPrincipal, routeClass: RouteClass) {
  const configured = limits[routeClass];
  const db = createServiceRoleClient();
  const result = await db.rpc("consume_public_api_rate_limit_v1", {
    p_tenant_id: principal.tenantId,
    p_client_id: principal.clientId,
    p_route_class: routeClass,
    p_limit: configured.limit,
    p_window_seconds: configured.windowSeconds,
  });
  if (result.error || !result.data) {
    throw new PublicApiError("RATE_LIMIT_UNAVAILABLE", "Rate-limit enforcement is temporarily unavailable.", 503);
  }
  const state = result.data as Record<string, unknown>;
  if (state.allowed !== true) {
    throw new PublicApiError(
      "RATE_LIMIT_EXCEEDED",
      "The API rate limit has been exceeded.",
      429,
      Number(state.retryAfter ?? 1),
      state,
    );
  }
  return state;
}

function applyRateLimitHeaders(response: Response, state: Record<string, unknown> | undefined) {
  if (!state) return response;
  response.headers.set("x-ratelimit-limit", String(state.limit ?? ""));
  response.headers.set("x-ratelimit-remaining", String(state.remaining ?? ""));
  response.headers.set("x-ratelimit-reset", String(state.resetAt ?? ""));
  return response;
}

async function recordAudit(input: {
  context?: PublicApiContext;
  request: Request;
  route: string;
  status: number;
  errorCode?: string;
  agentId?: string;
  transactionId?: string;
  decision?: "ALLOW" | "REVIEW" | "DENY";
}) {
  if (!input.context) return;
  const db = createServiceRoleClient();
  await db.from("public_api_audit_events").insert({
    tenant_id: input.context.principal.tenantId,
    client_id: input.context.principal.clientId,
    route: input.route,
    method: input.request.method,
    correlation_id: input.context.correlationId,
    agent_id: input.agentId ?? null,
    transaction_id: input.transactionId ?? null,
    decision: input.decision ?? null,
    latency_ms: Math.max(0, Date.now() - input.context.startedAt),
    status: input.status,
    safe_error_code: input.errorCode ?? null,
  });
}

export async function withPublicApi(
  request: Request,
  options: { route: string; routeClass: RouteClass; scopes: readonly PublicApiScope[] },
  handler: (context: PublicApiContext) => Promise<Response>,
) {
  const id = correlationId(request);
  const currentRequestId = requestId(request);
  const startedAt = Date.now();
  let context: PublicApiContext | undefined;
  let rateLimitState: Record<string, unknown> | undefined;
  try {
    const principal = await authenticatePublicApiRequest(request, options.scopes);
    context = { principal, correlationId: id, requestId: currentRequestId, startedAt };
    rateLimitState = await consumeRateLimit(principal, options.routeClass);
    const response = await handler(context);
    await recordAudit({ context, request, route: options.route, status: response.status });
    return applyRateLimitHeaders(response, rateLimitState);
  } catch (error) {
    if (error instanceof PublicApiError && error.rateLimit) rateLimitState = error.rateLimit;
    const safe = error instanceof PublicApiError
      ? error
      : new PublicApiError("INTERNAL_ERROR", "The request could not be completed safely.", 500);
    await recordAudit({ context, request, route: options.route, status: safe.status, errorCode: safe.code });
    if (!(error instanceof PublicApiError)) {
      console.error("Public API request failed safely.", { route: options.route, correlationId: id, requestId: currentRequestId, code: "INTERNAL_ERROR" });
    }
    return applyRateLimitHeaders(publicApiErrorResponse(safe, id, currentRequestId), rateLimitState);
  }
}
