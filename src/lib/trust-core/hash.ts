import { createHash, timingSafeEqual } from "node:crypto";
import { canonicalize } from "./canonicalize.ts";
import type { JsonValue } from "./types.ts";

export function sha256Hex(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashCanonical(value: JsonValue | Record<string, unknown>): string {
  return sha256Hex(Buffer.from(canonicalize(value), "utf8"));
}

export function hashesEqual(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function deterministicUuid(value: JsonValue | Record<string, unknown>): string {
  const hash = hashCanonical(value);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${((parseInt(hash[16], 16) & 3) | 8).toString(16)}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
