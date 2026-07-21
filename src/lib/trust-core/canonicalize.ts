import type { JsonValue } from "./types.ts";

function assertUnicode(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError("JCS rejects lone UTF-16 surrogates.");
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("JCS rejects lone UTF-16 surrogates.");
    }
  }
}

function serialize(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string") { assertUnicode(value); return JSON.stringify(value); }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JCS rejects non-finite numbers.");
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (["undefined", "function", "symbol", "bigint"].includes(typeof value)) throw new TypeError(`JCS rejects ${typeof value} values.`);
  if (typeof value !== "object") throw new TypeError("Unsupported JCS value.");
  if (seen.has(value)) throw new TypeError("JCS rejects cyclic structures.");
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((entry) => serialize(entry, seen)).join(",")}]`;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("JCS accepts only plain objects and arrays.");
    return `{${Object.keys(value).sort().map((key) => {
      assertUnicode(key);
      return `${JSON.stringify(key)}:${serialize((value as Record<string, unknown>)[key], seen)}`;
    }).join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

export function canonicalize(value: JsonValue | Record<string, unknown>): string {
  return serialize(value, new Set());
}

export const canonicalizeJson = canonicalize;
