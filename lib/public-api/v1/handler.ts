import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  correlationId,
  PublicApiError,
  publicApiErrorResponse,
  type PublicApiScope,
} from "./contracts";
import {
  authenticatePublicApiRequest,
  type PublicApiPrincipal,
} from "./authentication";

type RouteClass = "registration" | "challenge" | "proof" | "decision" | "read" | "outcome";
const limits: Record<RouteClass, { limit: number; windowSeconds: number }> = {
  registration: { limit: 20, windowSeconds: 60 },
  challenge: { limit: 30, windowSeconds: 60 },
  proof: { limit: 30, windowSeconds: 60 },
  decision: { limit: 60, windowSeconds: 60 },
  read: { limit: 240, windowSeconds: 60 },
  outcome: { limit: 60, windowSeconds: 60 },
};

export type PublicApiContext = {
  principal: PublicApiPrincipal;
  correlationId: string;
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
    );
  }
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
  let context: PublicApiContext | undefined;
  try {
    const principal = await authenticatePublicApiRequest(request, options.scopes);
    context = { principal, correlationId: id, startedAt: Date.now() };
    await consumeRateLimit(principal, options.routeClass);
    const response = await handler(context);
    await recordAudit({ context, request, route: options.route, status: response.status });
    return response;
  } catch (error) {
    const safe = error instanceof PublicApiError
      ? error
      : new PublicApiError("INTERNAL_ERROR", "The request could not be completed safely.", 500);
    await recordAudit({ context, request, route: options.route, status: safe.status, errorCode: safe.code });
    if (!(error instanceof PublicApiError)) {
      console.error("Public API request failed safely.", { route: options.route, correlationId: id, code: (error as { code?: string })?.code ?? "UNKNOWN" });
    }
    return publicApiErrorResponse(safe, id);
  }
}
