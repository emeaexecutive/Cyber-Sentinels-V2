import { TrustArchitectureApiError, architectureCorrelationId, architectureContext, architectureFailure, architectureResponse, assertArchitectureMutation } from "../trust-architecture/http.ts";

export const scopeContinuityCorrelationId = architectureCorrelationId;
export const scopeContinuityContext = architectureContext;
export const scopeContinuityFailure = architectureFailure;
export const scopeContinuityResponse = architectureResponse;

export async function readScopeContinuityJson(request: Request, limit = 64_000) {
  assertArchitectureMutation(request);
  if (!request.body) throw new TrustArchitectureApiError("Request body is required.", 400, "REQUEST_BODY_REQUIRED");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new TrustArchitectureApiError("Request is too large.", 413, "PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
    return parsed as Record<string, unknown>;
  } catch {
    throw new TrustArchitectureApiError("Request body must be valid JSON.", 400, "MALFORMED_JSON");
  }
}
