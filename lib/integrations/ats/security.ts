import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyATSWebhookSignature(
  rawBody: string,
  suppliedSignature: string,
  secret: string
) {
  if (!rawBody || !suppliedSignature || !secret) return false;
  const supplied = suppliedSignature.replace(/^sha256=/i, "").trim().toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;

  const suppliedBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}
