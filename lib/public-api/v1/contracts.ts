import { NextResponse } from "next/server";

export const PUBLIC_API_VERSION = "2026-08-10";
export const PUBLIC_V1_ROUTE_CONTRACT = [
  ["post", "/api/v1/agents"],
  ["post", "/api/v1/agents/{agentId}/credentials"],
  ["post", "/api/v1/agents/{agentId}/manifest"],
  ["post", "/api/v1/agents/{agentId}/challenge"],
  ["post", "/api/v1/agents/{agentId}/proof"],
  ["get", "/api/v1/agents/{agentId}/authority"],
  ["get", "/api/v1/agents/{agentId}/trust-state"],
  ["post", "/api/v1/trust/decisions"],
  ["get", "/api/v1/trust/transactions/{transactionId}"],
  ["get", "/api/v1/trust/transactions/{transactionId}/replay"],
  ["get", "/api/v1/trust/transactions/{transactionId}/receipt"],
  ["post", "/api/v1/trust/transactions/{transactionId}/outcomes"],
] as const;
export const PUBLIC_API_SCOPES = [
  "agents:write",
  "agents:verify",
  "authority:read",
  "trust:request",
  "trust:read",
  "outcomes:write",
] as const;

export type PublicApiScope = (typeof PUBLIC_API_SCOPES)[number];
export type PublicDecision = "ALLOW" | "REVIEW" | "DENY";

export class PublicApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

export function correlationId(request: Request) {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && /^[0-9a-f-]{36}$/i.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

export function publicApiResponse(
  body: unknown,
  init: ResponseInit = {},
  correlation = crypto.randomUUID(),
) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-correlation-id", correlation);
  headers.set("x-cyber-sentinels-api-version", PUBLIC_API_VERSION);
  return NextResponse.json(body, { ...init, headers });
}

export function publicApiErrorResponse(error: unknown, correlation: string) {
  const known = error instanceof PublicApiError
    ? error
    : new PublicApiError(
        "INTERNAL_ERROR",
        "The request could not be completed safely.",
        500,
      );
  const headers: HeadersInit = {};
  if (known.retryAfter) headers["retry-after"] = String(known.retryAfter);
  return publicApiResponse(
    { error: { code: known.code, message: known.message, correlation_id: correlation } },
    { status: known.status, headers },
    correlation,
  );
}

export async function boundedJson(
  request: Request,
  maxBytes = 65_536,
): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PublicApiError("BODY_TOO_LARGE", "The request body exceeds the allowed size.", 413);
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    throw new PublicApiError("BODY_TOO_LARGE", "The request body exceeds the allowed size.", 413);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new PublicApiError("INVALID_JSON", "The request body must be a JSON object.", 400);
  }
}

export function assertOnlyFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  code = "UNEXPECTED_FIELD",
) {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length) {
    throw new PublicApiError(code, `Unexpected field: ${unexpected.sort()[0]}.`, 400);
  }
}

export function requiredText(
  value: unknown,
  field: string,
  max = 240,
  pattern = /^[A-Za-z0-9_.:/@ -]+$/,
) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > max || !pattern.test(result)) {
    throw new PublicApiError("INVALID_INPUT", `${field} is invalid.`, 400);
  }
  return result;
}

export function optionalIso(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new PublicApiError("INVALID_INPUT", `${field} must be an ISO timestamp.`, 400);
  }
  return new Date(value).toISOString();
}
