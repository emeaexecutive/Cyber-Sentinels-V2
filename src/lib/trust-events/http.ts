import { NextResponse } from "next/server";
import { IdentityApiError, resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";

export function trustEventCorrelationId(request?: Request) {
  const supplied = request?.headers.get("x-correlation-id")?.trim();
  return supplied && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplied) ? supplied : crypto.randomUUID();
}

export function trustEventResponse(body: Record<string, unknown>, status: number, correlationId: string) {
  return NextResponse.json({ schemaVersion: "trust-event-api-v1", generatedAt: new Date().toISOString(), correlationId, ...body }, { status, headers: { "cache-control": "private, no-store", "x-correlation-id": correlationId } });
}

export function trustEventFailure(error: unknown, correlationId: string) {
  if (error instanceof IdentityApiError) return trustEventResponse({ ok: false, code: error.code, error: error.message }, error.status, correlationId);
  const candidate = error as Error & { status?: number; code?: string };
  if ((candidate.status ?? 500) >= 500) console.error("Trust Event API failed.", { code: candidate.code ?? "TRUST_EVENT_API_FAILED" });
  return trustEventResponse({ ok: false, code: candidate.code ?? "TRUST_EVENT_API_FAILED", error: (candidate.status ?? 500) < 500 ? candidate.message : "Trust Event operation failed safely." }, candidate.status ?? 500, correlationId);
}

export async function trustEventReadContext(request: Request) {
  return resolveIdentityEnterprise(request, ["owner", "admin", "reviewer", "observer"]);
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type TrustEventCursor = { receivedAt: string; eventId: string };

function decodeCursor(value: string): TrustEventCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== "string" || typeof parsed[1] !== "string") throw new Error("shape");
    const receivedAt = new Date(parsed[0]).toISOString();
    if (!uuidPattern.test(parsed[1])) throw new Error("eventId");
    return { receivedAt, eventId: parsed[1] };
  } catch {
    throw Object.assign(new Error("cursor is invalid."), { status: 400, code: "INVALID_CURSOR" });
  }
}

export function encodeTrustEventCursor(row: { received_at?: string | null; event_id?: string | null } | undefined) {
  if (!row?.received_at || !row.event_id) return null;
  return Buffer.from(JSON.stringify([new Date(row.received_at).toISOString(), row.event_id]), "utf8").toString("base64url");
}

export function pagination(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
  const cursorValue = url.searchParams.get("cursor");
  return { limit, cursor: cursorValue ? decodeCursor(cursorValue) : null };
}

export function canonicalEventFromRow(row: Record<string, unknown>) {
  return row.canonical_event ?? null;
}
