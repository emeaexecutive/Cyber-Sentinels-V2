import { RestrictedPostgresConnectionAdapter } from "@/lib/qualification/restricted-postgres-connection";
import { readBoundedText } from "@/lib/qualification/bounded-body";
import { NextResponse } from "next/server";
import {
  parseRestrictedPreviewCapability,
  RestrictedPreviewGateway,
  RestrictedPreviewGatewayError,
  type RestrictedPreviewCommand,
  type RestrictedPreviewOperation,
} from "@/lib/qualification/restricted-preview-gateway";

export const runtime = "nodejs";

const endpointPath = "/api/restricted-preview/v1/execute";
const maxRequestBytes = 32 * 1024;
const maxResponseBytes = 64 * 1024;

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function list(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  const result = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (!result.length) throw new Error(`${name} is empty`);
  return result;
}

function adapterUrl() {
  const value = process.env.RESTRICTED_PREVIEW_ADAPTER_URL;
  if (!value) throw new Error("RESTRICTED_PREVIEW_ADAPTER_URL is not configured");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("RESTRICTED_PREVIEW_ADAPTER_URL is invalid");
  }
  return url;
}

class HttpQualificationAdapter {
  constructor(
    private readonly url: URL,
    private readonly token: string,
  ) {}

  async execute(command: RestrictedPreviewCommand) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(this.url, {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(command),
      });
      const text = await readBoundedText(response.body, maxResponseBytes);
      if (Buffer.byteLength(text, "utf8") > maxResponseBytes) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_RESPONSE_TOO_LARGE",
          "The qualification adapter response is too large.",
          502,
        );
      }
      if (!response.ok) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_ADAPTER_REJECTED",
          "The qualification adapter rejected the operation.",
          502,
        );
      }
      return JSON.parse(text) as unknown;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function configuredGateway() {
  if (process.env.RESTRICTED_PREVIEW_ENABLED !== "true") {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_NOT_ENABLED",
      "Restricted Preview is not enabled.",
      404,
    );
  }
  if (process.env.VERCEL_ENV !== "preview") {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_PREVIEW_ONLY",
      "Restricted Preview is available only in the Preview environment.",
      404,
    );
  }
  const signingKey = process.env.RESTRICTED_PREVIEW_SIGNING_KEY;
  const adapterToken = process.env.RESTRICTED_PREVIEW_ADAPTER_TOKEN;
  const databaseUrl = process.env.RESTRICTED_PREVIEW_DATABASE_URL;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN) {
    throw new RestrictedPreviewGatewayError("GATEWAY_PRIVILEGED_CREDENTIALS_FORBIDDEN", "Privileged fallback credentials must be absent.", 503);
  }
  if (!signingKey || (!databaseUrl && !adapterToken)) {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_NOT_CONFIGURED",
      "Restricted Preview is not configured.",
      503,
    );
  }
  const allowedDestinations = list("RESTRICTED_PREVIEW_DESTINATIONS");
  return {
    destination: allowedDestinations[0],
    gateway: new RestrictedPreviewGateway({
      signingKey,
      allowedTenantIds: list("RESTRICTED_PREVIEW_TENANT_IDS"),
      allowedSubjectIds: list("RESTRICTED_PREVIEW_SUBJECT_IDS"),
      allowedRunIds: list("RESTRICTED_PREVIEW_RUN_IDS"),
      allowedDestinations,
      adapter: databaseUrl ? new RestrictedPostgresConnectionAdapter(databaseUrl) : new HttpQualificationAdapter(adapterUrl(), adapterToken!),
      audit: async (record) => {
        console.info("Restricted Preview gateway decision.", {
          ...record,
          requestDigest: record.requestDigest,
        });
      },
    }),
  };
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return json({ error: "CONTENT_TYPE_INVALID" }, 415);
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maxRequestBytes) return json({ error: "REQUEST_TOO_LARGE" }, 413);
    const authorization = request.headers.get("authorization") ?? "";
    const runId = request.headers.get("x-acceptance-run-id") ?? "";
    if (!authorization.startsWith("Bearer ") || !runId) {
      return json({ error: "AUTHORIZATION_REQUIRED" }, 401);
    }
    const token = authorization.slice(7);
    if (!token || token.length > 8_192) return json({ error: "AUTHORIZATION_INVALID" }, 401);
    const configured = configuredGateway();
    const requestId = request.headers.get("idempotency-key") ?? "";
    if (!/^[A-Za-z0-9_.:-]{8,180}$/.test(requestId)) return json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, 400);
    const bodyText = await readBoundedText(request.body, maxRequestBytes);
    if (Buffer.byteLength(bodyText, "utf8") > maxRequestBytes) {
      return json({ error: "REQUEST_TOO_LARGE" }, 413);
    }
    const body = JSON.parse(bodyText) as { operation?: unknown; payload?: unknown };
    if (typeof body.operation !== "string" || !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
      return json({ error: "REQUEST_INVALID" }, 400);
    }
    const capability = parseRestrictedPreviewCapability(token);
    const result = await configured.gateway.execute({
      requestId,
      operation: body.operation as RestrictedPreviewOperation,
      tenantId: capability.claims.tenantId,
      runId,
      subjectId: capability.claims.subjectId,
      destination: configured.destination,
      payload: body.payload as Record<string, unknown>,
      capability,
    });
    return json(result, 200);
  } catch (error) {
    if (error instanceof RestrictedPreviewGatewayError) return json({ error: error.code }, error.status);
    if (error instanceof RangeError) return json({ error: "BODY_TOO_LARGE" }, 413);
    if (error instanceof SyntaxError) return json({ error: "REQUEST_INVALID" }, 400);
    console.error("Restricted Preview gateway request failed safely.", {
      path: endpointPath,
      code: error instanceof Error ? error.message : "UNKNOWN",
    });
    return json({ error: "GATEWAY_UNAVAILABLE" }, 503);
  }
}
