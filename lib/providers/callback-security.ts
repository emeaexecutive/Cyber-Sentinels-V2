import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ProviderError } from "./errors.ts";
import type { IdentityProviderId } from "./types.ts";

export function parseTimestampedSignature(signatureHeader: string) {
  const parts = new Map<string, string>();
  for (const item of signatureHeader.split(",")) {
    const separator = item.indexOf("=");
    if (separator <= 0) continue;
    parts.set(item.slice(0, separator).trim(), item.slice(separator + 1).trim());
  }
  const timestampText = parts.get("t") ?? "";
  const signature = (parts.get("v1") ?? "").toLowerCase();
  return {
    timestamp: /^\d+$/.test(timestampText) ? Number(timestampText) : null,
    signature: /^[a-f0-9]{64}$/.test(signature) ? signature : null,
  };
}

export function sha256Digest(rawBody: string) {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

export function verifyTimestampedHmacSha256(input: {
  provider: IdentityProviderId;
  rawBody: string;
  signatureHeader: string;
  secret: string;
  correlationId: string;
  receivedAt?: Date;
  toleranceSeconds?: number;
}) {
  const parsed = parseTimestampedSignature(input.signatureHeader);
  if (!parsed.timestamp || !parsed.signature || !input.secret) {
    throw new ProviderError("CALLBACK_SIGNATURE_INVALID", "Provider callback signature is invalid.", "Missing or malformed timestamped HMAC header.", false, input.provider, input.correlationId);
  }
  const receivedAtSeconds = Math.floor((input.receivedAt ?? new Date()).getTime() / 1000);
  const tolerance = Math.max(1, input.toleranceSeconds ?? 300);
  if (Math.abs(receivedAtSeconds - parsed.timestamp) > tolerance) {
    throw new ProviderError("CALLBACK_TIMESTAMP_INVALID", "Provider callback timestamp is outside the permitted window.", "Callback timestamp is expired or too far in the future.", false, input.provider, input.correlationId);
  }
  const expected = createHmac("sha256", input.secret)
    .update(`${parsed.timestamp}.${input.rawBody}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(parsed.signature, "hex");
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new ProviderError("CALLBACK_SIGNATURE_INVALID", "Provider callback signature is invalid.", "HMAC digest mismatch.", false, input.provider, input.correlationId);
  }
  return { timestamp: parsed.timestamp, sourceDigest: sha256Digest(input.rawBody) };
}
