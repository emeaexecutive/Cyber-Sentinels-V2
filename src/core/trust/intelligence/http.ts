import "server-only";

import { NextResponse } from "next/server";
import {
  architectureContext,
  architectureCorrelationId,
  architectureReference,
  TrustArchitectureApiError,
} from "@/src/lib/trust-architecture/http";

export {
  architectureContext as trustIntelligenceContext,
  architectureCorrelationId as trustIntelligenceCorrelationId,
  architectureReference as trustIntelligenceReference,
  TrustArchitectureApiError as TrustIntelligenceApiError,
};

export function trustIntelligenceLimit(request: Request, fallback = 200): number {
  const raw = new URL(request.url).searchParams.get("limit");
  const value = raw === null ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 500) {
    throw new TrustArchitectureApiError("limit must be between 1 and 500.", 400, "LIMIT_INVALID");
  }
  return value;
}

export function trustIntelligenceResponse(
  body: Record<string, unknown>,
  status: number,
  correlationId: string,
) {
  return NextResponse.json(
    {
      schemaVersion: "trust-intelligence-v1",
      generatedAt: new Date().toISOString(),
      correlationId,
      ...body,
    },
    {
      status,
      headers: {
        "cache-control": "private, no-store",
        "x-correlation-id": correlationId,
      },
    },
  );
}

export function trustIntelligenceFailure(error: unknown, correlationId: string) {
  const candidate = error as Error & { status?: number; code?: string };
  const status = candidate.status ?? 500;
  if (status >= 500) {
    console.error("Trust Intelligence API failed safely.", {
      code: candidate.code ?? "TRUST_INTELLIGENCE_API_FAILED",
    });
  }
  return trustIntelligenceResponse(
    {
      ok: false,
      code: candidate.code ?? "TRUST_INTELLIGENCE_API_FAILED",
      error: status < 500 ? candidate.message : "Trust Intelligence operation failed safely.",
    },
    status,
    correlationId,
  );
}
