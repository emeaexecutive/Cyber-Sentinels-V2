import { canonicalizeJson, normalizeUtcTimestamp } from "../trust-events/canonicalize.ts";
import { sha256Hex } from "../trust-events/hash.ts";
import { consentActions, consentCategoryKeys, consentRegionProfiles, type ConsentReceipt, type ConsentReceiptInput } from "./types.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeConsentReceipt(input: ConsentReceiptInput): ConsentReceiptInput {
  if (!uuidPattern.test(input.receiptId) || !uuidPattern.test(input.enterpriseId)) throw new TypeError("Consent receipt and enterprise IDs must be UUIDs.");
  if ((input.userId === null) === (input.anonymousId === null)) throw new TypeError("A consent receipt requires exactly one subject reference.");
  if (!consentActions.includes(input.consentAction) || !consentRegionProfiles.includes(input.regionProfile)) throw new TypeError("Consent action or region profile is invalid.");
  if (input.categories.essential !== true || !consentCategoryKeys.every((key) => typeof input.categories[key] === "boolean")) throw new TypeError("Essential consent must remain enabled and every category must be boolean.");
  if (input.hashAlgorithm !== "SHA-256" || input.canonicalization !== "RFC8785-JCS") throw new TypeError("Consent receipt integrity metadata is invalid.");
  const expiresAt = input.expiresAt === null ? null : normalizeUtcTimestamp(input.expiresAt, "expiresAt");
  return { ...input, occurredAt: normalizeUtcTimestamp(input.occurredAt, "occurredAt"), receivedAt: normalizeUtcTimestamp(input.receivedAt, "receivedAt"), expiresAt, purposes: [...new Set(input.purposes)].sort(), providers: [...new Set(input.providers)].sort(), categories: Object.fromEntries(consentCategoryKeys.map((key) => [key, input.categories[key]])) as typeof input.categories };
}

export function canonicalizeConsentReceipt(input: ConsentReceiptInput | ConsentReceipt) {
  const unsigned = { ...input } as Partial<ConsentReceipt>;
  delete unsigned.receiptHash;
  return canonicalizeJson(normalizeConsentReceipt(unsigned as ConsentReceiptInput) as unknown as Record<string, unknown>);
}

export function hashConsentReceipt(input: ConsentReceiptInput | ConsentReceipt) {
  return sha256Hex(Buffer.from(canonicalizeConsentReceipt(input), "utf8"));
}

export function signConsentReceipt(input: ConsentReceiptInput): ConsentReceipt {
  const normalized = normalizeConsentReceipt(input);
  return { ...normalized, receiptHash: hashConsentReceipt(normalized) };
}

export function verifyConsentReceipt(receipt: ConsentReceipt) {
  try { return receipt.receiptHash === hashConsentReceipt(receipt); } catch { return false; }
}
