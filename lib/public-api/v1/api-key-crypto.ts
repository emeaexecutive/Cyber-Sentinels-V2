import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

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

function rotationSecret(value = process.env.PUBLIC_API_KEY_ROTATION_SECRET?.trim()) {
  if (!value || Buffer.byteLength(value, "utf8") < 32) {
    throw new Error("PUBLIC_API_KEY_ROTATION_SECRET_REQUIRED");
  }
  return value;
}

/**
 * Derives the reveal-once replacement material from an operator-supplied
 * rotation request ID. This lets an authorized retry reproduce the same raw
 * key after an uncertain response without ever persisting reversible secret
 * material. The database stores only the independently salted scrypt digest.
 */
export function createRotatedApiKeyMaterial(
  environment: "test" | "live",
  context: { tenantId: string; keyId: string; rotationRequestId: string },
  secret?: string,
) {
  const input = `public-api-key-rotation-v1\u0000${context.tenantId}\u0000${context.keyId}\u0000${context.rotationRequestId}`;
  const digest = createHmac("sha512", rotationSecret(secret)).update(input).digest();
  const identifier = digest.subarray(0, 9).toString("base64url");
  const keySecret = digest.subarray(9, 41).toString("base64url");
  const prefix = `cs_${environment}_${identifier}`;
  return { rawKey: `${prefix}.${keySecret}`, prefix, secretHash: digestApiKeySecret(keySecret) };
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
