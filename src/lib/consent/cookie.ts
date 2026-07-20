import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeConsentChoices } from "./policy.ts";
import type { ConsentCookieState } from "./types.ts";

export const consentCookieName = "cs_consent";
export const consentAnonymousCookieName = "cs_consent_anon";

export function serializeConsentCookie(state: ConsentCookieState, secret: string) {
  if (!secret.trim()) throw new Error("Consent cookie integrity secret is not configured.");
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function parseConsentCookie(value: string | undefined, secret: string): ConsentCookieState | null {
  try {
    const [payload, signature, extra] = (value ?? "").split(".");
    if (!payload || !signature || extra || !secret.trim()) return null;
    const expected = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ConsentCookieState;
    if (parsed.version !== 1 || !parsed.policyVersion || !parsed.receiptId || Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return { ...parsed, categories: normalizeConsentChoices(parsed.categories, "GLOBAL_DEFAULT") };
  } catch { return null; }
}
