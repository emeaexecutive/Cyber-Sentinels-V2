import { NextResponse } from "next/server";

export const PUBLIC_API_VERSION = "2026-08-29";
export const PUBLIC_API_ERROR_CODES = [
  "AUTHENTICATION_REQUIRED",
  "API_KEY_INVALID",
  "API_KEY_EXPIRED",
  "API_KEY_REVOKED",
  "API_KEY_INACTIVE",
  "INSUFFICIENT_SCOPE",
  "INVALID_REQUEST",
  "RESOURCE_NOT_FOUND",
  "AGENT_NOT_OWNED",
  "AUTHORITY_NOT_FOUND",
  "AUTHORITY_SCOPE_INVALID",
  "AUTHORITY_GRANT_FORBIDDEN",
  "AUTHORITY_EXPIRED",
  "AUTHORITY_REVOKED",
  "REVIEW_NOT_FOUND",
  "REVIEW_RESOLUTION_FORBIDDEN",
  "REVIEW_ALREADY_RESOLVED",
  "REVIEW_EXPIRED",
  "REVIEW_AUTHORITY_INVALID",
  "EVIDENCE_NOT_ACCEPTED",
  "EVIDENCE_DIGEST_MISMATCH",
  "PROVIDER_NAMESPACE_RESERVED",
  "IDEMPOTENCY_CONFLICT",
  "RATE_LIMITED",
  "TENANT_ACCESS_DENIED",
  "READINESS_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;
export const PUBLIC_V1_ROUTE_CONTRACT = [
  ["post", "/api/v1/agents"],
  ["get", "/api/v1/agents/{agentId}"],
  ["post", "/api/v1/agents/{agentId}/credentials"],
  ["post", "/api/v1/agents/{agentId}/manifest"],
  ["post", "/api/v1/agents/{agentId}/challenge"],
  ["post", "/api/v1/agents/{agentId}/proof"],
  ["get", "/api/v1/agents/{agentId}/authority"],
  ["post", "/api/v1/agents/{agentId}/authorities"],
  ["get", "/api/v1/agents/{agentId}/authorities"],
  ["get", "/api/v1/agents/{agentId}/authorities/{authorityId}"],
  ["post", "/api/v1/agents/{agentId}/authorities/{authorityId}/revoke"],
  ["get", "/api/v1/agents/{agentId}/trust-state"],
  ["post", "/api/v1/trust/decisions"],
  ["post", "/api/v1/evidence"],
  ["get", "/api/v1/trust/transactions/{transactionId}"],
  ["get", "/api/v1/trust/transactions/{transactionId}/replay"],
  ["get", "/api/v1/trust/transactions/{transactionId}/receipt"],
  ["post", "/api/v1/trust/transactions/{transactionId}/outcomes"],
  ["get", "/api/v1/reviews/{reviewReference}"],
  ["post", "/api/v1/reviews/{reviewReference}/resolve"],
] as const;
export const PUBLIC_API_SCOPES = [
  "agents:write",
  "agents:verify",
  "authority:read",
  "authority:write",
  "trust:request",
  "trust:read",
  "evidence:write",
  "outcomes:write",
  "review:read",
  "review:write",
] as const;

export type PublicApiScope = (typeof PUBLIC_API_SCOPES)[number];
export type PublicDecision = "ALLOW" | "REVIEW" | "DENY";
export type StablePublicApiErrorCode = (typeof PUBLIC_API_ERROR_CODES)[number];

export class PublicApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly retryAfter?: number,
    readonly rateLimit?: Record<string, unknown>,
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

export function requestId(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[0-9a-f-]{36}$/i.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

function isResponseObject(body: unknown): body is Record<string, unknown> {
  return Boolean(body && typeof body === "object" && !Array.isArray(body));
}

export function publicApiResponse(
  body: unknown,
  init: ResponseInit = {},
  correlation = crypto.randomUUID(),
  request = crypto.randomUUID(),
) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-correlation-id", correlation);
  headers.set("x-request-id", request);
  headers.set("x-cyber-sentinels-api-version", PUBLIC_API_VERSION);
  const safeBody = isResponseObject(body)
    ? {
        ...body,
        request_id: request,
        correlation_id: body.correlation_id ?? correlation,
        api_version: PUBLIC_API_VERSION,
      }
    : body;
  return NextResponse.json(safeBody, { ...init, headers });
}

const publicErrorAliases: Readonly<Record<string, StablePublicApiErrorCode>> = {
  INVALID_API_KEY: "API_KEY_INVALID",
  API_KEY_NOT_TENANT_BOUND: "TENANT_ACCESS_DENIED",
  INVALID_INPUT: "INVALID_REQUEST",
  INVALID_JSON: "INVALID_REQUEST",
  UNEXPECTED_FIELD: "INVALID_REQUEST",
  IDEMPOTENCY_KEY_REQUIRED: "INVALID_REQUEST",
  BODY_TOO_LARGE: "INVALID_REQUEST",
  UNSUPPORTED_MEDIA_TYPE: "INVALID_REQUEST",
  AGENT_NOT_FOUND: "AGENT_NOT_OWNED",
  TRANSACTION_NOT_FOUND: "RESOURCE_NOT_FOUND",
  INVALID_TRANSACTION_ID: "RESOURCE_NOT_FOUND",
  EVIDENCE_SUBJECT_UNSUPPORTED: "EVIDENCE_NOT_ACCEPTED",
  EVIDENCE_TYPE_RESERVED: "EVIDENCE_NOT_ACCEPTED",
  PROVIDER_IDENTITY_RESERVED: "PROVIDER_NAMESPACE_RESERVED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMITED",
};

export function stablePublicErrorCode(code: string, status = 500): StablePublicApiErrorCode {
  if (PUBLIC_API_ERROR_CODES.includes(code as StablePublicApiErrorCode)) {
    return code as StablePublicApiErrorCode;
  }
  const aliased = publicErrorAliases[code];
  if (aliased) return aliased;
  if (status === 401) return "API_KEY_INVALID";
  if (status === 403) return "TENANT_ACCESS_DENIED";
  if (status === 404) return "RESOURCE_NOT_FOUND";
  if (status === 409) return "IDEMPOTENCY_CONFLICT";
  if (status === 503) return "READINESS_UNAVAILABLE";
  if ([400, 413, 415, 422].includes(status)) return "INVALID_REQUEST";
  return "INTERNAL_ERROR";
}

export function publicApiErrorResponse(error: unknown, correlation: string, request = crypto.randomUUID()) {
  const known = error instanceof PublicApiError
    ? error
    : new PublicApiError(
        "INTERNAL_ERROR",
        "The request could not be completed safely.",
        500,
      );
  const code = stablePublicErrorCode(known.code, known.status);
  const headers: HeadersInit = {};
  if (known.retryAfter) headers["retry-after"] = String(known.retryAfter);
  return publicApiResponse(
    {
      error: { code, message: known.message, correlation_id: correlation },
      request_id: request,
      correlation_id: correlation,
      api_version: PUBLIC_API_VERSION,
    },
    { status: known.status, headers },
    correlation,
    request,
  );
}

export async function boundedJson(
  request: Request,
  maxBytes = 65_536,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new PublicApiError("UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.", 415);
  }
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
