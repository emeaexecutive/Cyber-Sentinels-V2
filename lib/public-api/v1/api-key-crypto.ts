import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const PUBLIC_API_KEY_PATTERN = /^cs_(test|live)_([a-zA-Z0-9_-]{12})\.([a-zA-Z0-9_-]{43})$/;

const scryptParameters = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function apiKeyKdfInput(secret: string, pepper = process.env.PUBLIC_API_KEY_PEPPER?.trim()) {
  return pepper ? `${secret}\u0000${pepper}` : secret;
}

export function digestApiKeySecret(secret: string, salt = randomBytes(16)) {
  const derived = scryptSync(apiKeyKdfInput(secret), salt, 32, scryptParameters);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function createApiKeyMaterial(environment: "test" | "live" = "test") {
  const identifier = randomBytes(9).toString("base64url").slice(0, 12);
  const secret = randomBytes(32).toString("base64url");
  const prefix = `cs_${environment}_${identifier}`;
  return { rawKey: `${prefix}.${secret}`, prefix, secretHash: digestApiKeySecret(secret) };
}

export function verifyApiKeyHash(rawKey: string, storedHash: string) {
  const match = PUBLIC_API_KEY_PATTERN.exec(rawKey);
  const stored = /^scrypt\$([a-zA-Z0-9_-]{22})\$([a-zA-Z0-9_-]{43})$/.exec(storedHash);
  if (!match || !stored) return false;
  const salt = Buffer.from(stored[1], "base64url");
  const candidate = scryptSync(apiKeyKdfInput(match[3]), salt, 32, scryptParameters);
  const expected = Buffer.from(stored[2], "base64url");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
