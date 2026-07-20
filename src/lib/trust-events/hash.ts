import { createHash, timingSafeEqual } from "node:crypto";
import { canonicalizeTrustEvent, normalizeTrustEvent } from "./canonicalize.ts";
import type { CanonicalTrustEvent, UnsignedTrustEvent } from "./types.ts";

export function sha256Hex(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function hashTrustEvent(event: UnsignedTrustEvent | CanonicalTrustEvent) {
  return sha256Hex(Buffer.from(canonicalizeTrustEvent(event), "utf8"));
}

export function signTrustEvent(event: UnsignedTrustEvent): CanonicalTrustEvent {
  const normalized = normalizeTrustEvent(event);
  return { ...normalized, eventHash: hashTrustEvent(normalized) } as CanonicalTrustEvent;
}

export function verifyTrustEventHash(event: CanonicalTrustEvent) {
  try {
    const expected = Buffer.from(hashTrustEvent(event), "hex");
    const actual = Buffer.from(event.eventHash, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}
