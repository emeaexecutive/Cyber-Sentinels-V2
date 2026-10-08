import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { NativeEnforcementError, verifyDestinationObservation, type EnforcementRequest, type EnforcementAdapterResult } from "./native-enforcement.ts";

function dispatchMac(body: string, key: string) {
  return createHmac("sha256", key).update("tenente-dispatch-v1\n").update(body).digest("hex");
}

/** Destination-side integrity/freshness check. Durable consumption and current authority checks remain mandatory. */
export function verifyToolDispatch(body: string, signature: string, key: string, now = Date.now()) {
  if (Buffer.byteLength(key) < 32 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (!timingSafeEqual(Buffer.from(dispatchMac(body, key), "hex"), Buffer.from(signature, "hex"))) return false;
  try {
    const parsed = JSON.parse(body);
    const request = parsed.method === "tools/call" ? parsed.params?._meta?.authority : parsed.authority;
    const age = now - Date.parse(request?.requestedAt);
    return Number.isFinite(age) && age >= -30_000 && age <= 60_000;
  } catch { return false; }
}

/** Server-configured destination only. MCP tools/call and HTTP share canonical enforcement. */
export function createHttpToolAdapter(config: {
  endpoint: string; tool: string; payload: Record<string, unknown>; evidenceKey: string;
  transport: "http" | "mcp"; allowLocal?: boolean; timeoutMs?: number;
}) {
  const url = new URL(config.endpoint);
  if (url.username || url.password || url.hash || url.search) throw new TypeError("Tool endpoint cannot contain credentials, query or fragment.");
  if (url.protocol !== "https:" && !(config.allowLocal && url.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(url.hostname))) throw new TypeError("Tool endpoint requires HTTPS or explicit loopback qualification.");
  if (!/^[A-Za-z0-9_.:-]{1,180}$/.test(config.tool) || Buffer.byteLength(config.evidenceKey) < 32) throw new TypeError("Invalid tool adapter configuration.");
  const payload = JSON.parse(canonicalize(config.payload)) as Record<string, unknown>;
  const payloadDigest = hashCanonical(payload);
  return {
    async execute(request: EnforcementRequest): Promise<EnforcementAdapterResult> {
      if (request.action.payloadDigest !== payloadDigest) throw new NativeEnforcementError("Executable payload differs from the authorized payload.", "EXECUTION_PAYLOAD_MISMATCH", 409);
      const body = config.transport === "mcp"
        ? { jsonrpc: "2.0", id: request.requestId, method: "tools/call", params: { name: config.tool, arguments: payload, _meta: { authority: request } } }
        : { tool: config.tool, arguments: payload, authority: request };
      const wireBody = canonicalize(body);
      const response = await fetch(url, { method: "POST", redirect: "error", headers: { "content-type": "application/json", "idempotency-key": request.idempotencyKey, "x-tenente-dispatch-signature": dispatchMac(wireBody, config.evidenceKey) },
        body: wireBody, signal: AbortSignal.timeout(config.timeoutMs ?? 10_000) });
      if (!response.ok) throw new NativeEnforcementError("Controlled destination rejected execution.", "DESTINATION_REJECTED", 502);
      const reader = response.body?.getReader();
      if (!reader) throw new NativeEnforcementError("Destination response is empty.", "DESTINATION_EVIDENCE_INVALID", 502);
      const chunks: Uint8Array[] = []; let bytes = 0;
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 131_072) { await reader.cancel(); throw new NativeEnforcementError("Destination response exceeds evidence limit.", "DESTINATION_EVIDENCE_INVALID", 502); }
        chunks.push(chunk.value);
      }
      const text = Buffer.concat(chunks).toString("utf8");
      const parsed = JSON.parse(text);
      if (config.transport === "mcp" && (parsed.jsonrpc !== "2.0" || parsed.id !== request.requestId || parsed.error)) throw new NativeEnforcementError("MCP response does not match the request.", "MCP_RESPONSE_INVALID", 502);
      const result = (config.transport === "mcp" ? parsed.result?.structuredContent : parsed) as EnforcementAdapterResult;
      if (!result || !["ACCEPTED", "REJECTED", "FAILED", "TIMEOUT", "UNKNOWN"].includes(result.status) || !result.destinationObservation) throw new NativeEnforcementError("Destination evidence is missing.", "DESTINATION_EVIDENCE_INVALID", 502);
      verifyDestinationObservation({ observation: result.destinationObservation, evidenceKey: config.evidenceKey,
        expectedEnterpriseId: request.enterpriseId, expectedTransactionId: request.transactionId, expectedEntityId: request.operationalEntityId });
      // Correlation retains signed mismatches as security evidence, rather than discarding them as successful execution.
      return result;
    },
  };
}
