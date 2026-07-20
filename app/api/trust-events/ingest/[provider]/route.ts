import { checkRequestRateLimit } from "@/lib/security";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { ingestTrustEventRequest } from "@/src/lib/trust-events/gateway";
import { trustEventCorrelationId, trustEventFailure, trustEventResponse } from "@/src/lib/trust-events/http";
import { supabaseTrustEventRepository } from "@/src/lib/trust-events/repository";

export const dynamic = "force-dynamic";
const maximumEnvelopeBytes = 256_000;

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const correlationId = trustEventCorrelationId(request);
  const limited = checkRequestRateLimit({ route: "trust-event-ingest", req: request, limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const { provider } = await context.params;
    const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") return trustEventResponse({ ok: false, code: "UNSUPPORTED_CONTENT_TYPE", error: "application/json is required." }, 415, correlationId);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maximumEnvelopeBytes) return trustEventResponse({ ok: false, code: "PAYLOAD_TOO_LARGE", error: "Provider envelope is too large." }, 413, correlationId);
    let authenticatedEnterpriseId: string | undefined;
    let authenticatedActorId: string | undefined;
    if (["world-id", "world_id"].includes(provider.toLowerCase())) {
      const authenticated = await resolveIdentityEnterprise(request, ["owner", "admin", "reviewer"]);
      authenticatedEnterpriseId = authenticated.enterpriseId;
      authenticatedActorId = authenticated.user.id;
    }
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > maximumEnvelopeBytes) return trustEventResponse({ ok: false, code: "PAYLOAD_TOO_LARGE", error: "Provider envelope is too large." }, 413, correlationId);
    const headers = Object.fromEntries([...request.headers.entries()].map(([key, value]) => [key.toLowerCase(), value]));
    const result = await ingestTrustEventRequest({ rawBytes: bytes, headers, method: request.method, path: `/api/trust-events/ingest/${provider}`, receivedAt: new Date(), correlationId, authenticatedEnterpriseId, authenticatedActorId }, supabaseTrustEventRepository());
    const status = result.disposition === "DUPLICATE" ? 200 : result.conflict ? 409 : result.ok ? 201 : result.disposition === "BLOCKED_PROVIDER" ? 503 : result.disposition === "REJECTED_TENANT" ? 403 : 400;
    return trustEventResponse(result as unknown as Record<string, unknown>, status, correlationId);
  } catch (error) { return trustEventFailure(error, correlationId); }
}
