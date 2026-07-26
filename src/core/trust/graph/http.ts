import "server-only";

import {
  architectureContext,
  architectureCorrelationId,
  architectureReference,
  assertArchitectureMutation,
  TrustArchitectureApiError,
} from "@/src/lib/trust-architecture/http";
import {
  trustIntelligenceFailure,
  trustIntelligenceResponse,
} from "../intelligence/http.ts";
import type { IdentityEnterpriseRole } from "@/lib/identity-signals/enterprise-context";

export {
  architectureCorrelationId as trustGraphCorrelationId,
  trustIntelligenceResponse as trustGraphResponse,
};

export function trustGraphFailure(error: unknown, correlationId: string) {
  return trustIntelligenceFailure(
    error instanceof TypeError
      ? new TrustArchitectureApiError(error.message, 400, "VALIDATION_FAILED")
      : error,
    correlationId,
  );
}

export async function trustGraphContext(
  request: Request,
  mutation = false,
  roles: IdentityEnterpriseRole[] = ["owner", "admin", "reviewer", "observer"],
) {
  if (mutation) assertArchitectureMutation(request);
  return architectureContext(request, roles);
}

export function trustGraphUuid(value: unknown, field: string): string {
  const reference = architectureReference(value, field);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference)) {
    throw new TrustArchitectureApiError(`${field} must be a UUID.`, 400, "UUID_INVALID");
  }
  return reference;
}

export function trustGraphLimit(request: Request, fallback = 100): number {
  const raw = new URL(request.url).searchParams.get("limit");
  const value = raw === null ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 500) {
    throw new TrustArchitectureApiError("limit must be between 1 and 500.", 400, "LIMIT_INVALID");
  }
  return value;
}

export async function trustGraphBody(request: Request): Promise<Record<string, unknown>> {
  const value = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TrustArchitectureApiError("A JSON object is required.", 400, "BODY_INVALID");
  }
  return value as Record<string, unknown>;
}

export function trustGraphVersion(value: unknown): number {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new TrustArchitectureApiError("A valid expectedVersion is required.", 400, "VERSION_INVALID");
  }
  return version;
}
