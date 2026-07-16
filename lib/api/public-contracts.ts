import { NextResponse } from "next/server";
import { PUBLIC_API_VERSION } from "./public-endpoint-inventory";

export { PUBLIC_API_VERSION, publicEndpointContracts, type PublicEndpointContract } from "./public-endpoint-inventory";

function safeId(value: string | null, prefix: string) {
  const candidate = value?.trim().replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 120);
  return candidate || `${prefix}_${crypto.randomUUID()}`;
}

export function createPublicApiContext(request: Request, auditScope: string) {
  return {
    version: PUBLIC_API_VERSION,
    trace_id: safeId(request.headers.get("x-request-id") ?? request.headers.get("traceparent"), "trace"),
    audit_id: safeId(null, `audit_${auditScope.replace(/[^a-z0-9]+/gi, "_")}`),
    timestamp: new Date().toISOString(),
  };
}

export function publicApiSuccess(body: Record<string, unknown>, context: ReturnType<typeof createPublicApiContext>, options: { status?: number; pagination?: { limit: number; next_cursor: string | null; total: number } } = {}) {
  return NextResponse.json({ ...body, ok: true, meta: { ...context, ...(options.pagination ? { pagination: options.pagination } : {}) } }, { status: options.status ?? 200 });
}

export function publicApiError(code: string, message: string, status: number, context: ReturnType<typeof createPublicApiContext>) {
  return NextResponse.json({ ok: false, error: { code, message }, meta: context }, { status });
}

export function publicApiPagination(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 20);
  const requestedCursor = Number(url.searchParams.get("cursor") ?? 0);
  return {
    limit: Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.floor(requestedLimit))) : 20,
    offset: Number.isFinite(requestedCursor) ? Math.max(0, Math.floor(requestedCursor)) : 0,
  };
}

export function paginatePublicItems<T>(items: T[], input: { limit: number; offset: number }) {
  const page = items.slice(input.offset, input.offset + input.limit);
  const nextOffset = input.offset + page.length;
  return {
    items: page,
    pagination: { limit: input.limit, next_cursor: nextOffset < items.length ? String(nextOffset) : null, total: items.length },
  };
}
