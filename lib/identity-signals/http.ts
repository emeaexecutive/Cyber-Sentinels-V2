import { NextResponse } from "next/server";
import { IdentityApiError } from "./enterprise-context";

export function identityCorrelationId(request?: Request) {
  const supplied = request?.headers.get("x-correlation-id")?.trim();
  return supplied && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplied) ? supplied : crypto.randomUUID();
}

export function identitySuccess<T extends Record<string, unknown>>(body: T, status = 200, correlationId = crypto.randomUUID()) {
  return NextResponse.json({ schemaVersion: 1, generatedAt: new Date().toISOString(), ok: true, ...body, correlationId }, { status });
}

export function identityFailure(error: unknown, correlationId = crypto.randomUUID()) {
  if (error instanceof IdentityApiError) return NextResponse.json({ schemaVersion: 1, ok: false, code: error.code, error: error.message, correlationId }, { status: error.status });
  if (error instanceof Error && "status" in error) {
    const typed = error as Error & { status?: number; code?: string };
    return NextResponse.json({ schemaVersion: 1, ok: false, code: typed.code ?? "IDENTITY_OPERATION_FAILED", error: typed.message, correlationId }, { status: typed.status ?? 500 });
  }
  if (error instanceof SyntaxError) return NextResponse.json({ schemaVersion: 1, ok: false, code: "INVALID_JSON", error: "A valid JSON body is required.", correlationId }, { status: 400 });
  const message = error instanceof Error ? error.message : "Identity operation failed.";
  const clientError = /required|supported|must be|invalid/i.test(message);
  console.error("Identity Signal Engine request failed.", error);
  return NextResponse.json({ schemaVersion: 1, ok: false, code: clientError ? "INVALID_REQUEST" : "IDENTITY_OPERATION_FAILED", error: clientError ? message : "Identity operation failed safely.", correlationId }, { status: clientError ? 400 : 500 });
}
