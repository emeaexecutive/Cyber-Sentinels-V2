import "server-only";

import { NextResponse } from "next/server";
import { architectureContext, architectureCorrelationId, architectureReference, assertArchitectureMutation, TrustArchitectureApiError } from "../trust-architecture/http.ts";
import type { IdentityEnterpriseRole } from "@/lib/identity-signals/enterprise-context";

export { architectureContext as continuousTrustContext, architectureCorrelationId as continuousTrustCorrelationId, architectureReference as continuousTrustReference, assertArchitectureMutation as assertContinuousTrustMutation, TrustArchitectureApiError as ContinuousTrustApiError };
export function continuousTrustResponse(body: Record<string, unknown>, status: number, correlationId: string) { return NextResponse.json({ schemaVersion: "continuous-trust-runtime-v1", generatedAt: new Date().toISOString(), correlationId, ...body }, { status, headers: { "cache-control": "private, no-store", "x-correlation-id": correlationId } }); }
export function continuousTrustFailure(error: unknown, correlationId: string) { const candidate = error as Error & { status?: number; code?: string }; const status = candidate.status ?? 500; if (status >= 500) console.error("Continuous Trust API failed safely.", { code: candidate.code ?? "CONTINUOUS_TRUST_API_FAILED" }); return continuousTrustResponse({ ok: false, code: candidate.code ?? "CONTINUOUS_TRUST_API_FAILED", error: status < 500 ? candidate.message : "Continuous Trust operation failed safely." }, status, correlationId); }
export async function mutationContext(request: Request, roles: IdentityEnterpriseRole[] = ["owner", "admin", "reviewer"]) { assertArchitectureMutation(request); return architectureContext(request, roles); }
export function boundedLimit(request: Request, fallback = 100, maximum = 500) { const value = Number(new URL(request.url).searchParams.get("limit") ?? fallback); if (!Number.isFinite(value) || value < 1) throw new TrustArchitectureApiError("limit is invalid.", 400, "LIMIT_INVALID"); return Math.min(maximum, Math.floor(value)); }
export function continuousTrustUuid(value: unknown, field: string) { const reference = architectureReference(value, field); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference)) throw new TrustArchitectureApiError(`${field} must be a UUID.`, 400, "REFERENCE_INVALID"); return reference; }
