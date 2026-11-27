import { sign, verify, createPublicKey, type KeyLike } from "node:crypto";
import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export type AgentMessage = {
  domain: "cyber-sentinels:agent-message:v1";
  tenantId: string; swarmId: string; senderId: string; recipientId: string;
  audience: string; credentialVersion: number; nonce: string;
  issuedAt: number; expiresAt: number; payloadDigest: string;
};
export function signAgentMessage(claims: AgentMessage, privateKey: KeyLike) {
  return sign(null, Buffer.from(canonicalize(claims)), privateKey).toString("base64url");
}
export function verifyAgentMessage(claims: AgentMessage, signature: string, payload: unknown, publicKey: string, now: number) {
  try {
    return claims.domain === "cyber-sentinels:agent-message:v1"
      && /^[A-Za-z0-9_-]{16,128}$/.test(claims.nonce)
      && Number.isSafeInteger(claims.issuedAt) && Number.isSafeInteger(claims.expiresAt)
      && claims.issuedAt <= now + 5000 && claims.issuedAt >= now - 30000
      && claims.expiresAt > now && claims.expiresAt > claims.issuedAt && claims.expiresAt <= claims.issuedAt + 30000
      && typeof payload === "object" && payload !== null && !Array.isArray(payload)
      && claims.payloadDigest === hashCanonical(payload as Record<string, unknown>)
      && /^[A-Za-z0-9_-]{86}$/.test(signature)
      && createPublicKey(publicKey).asymmetricKeyType === "ed25519"
      && verify(null, Buffer.from(canonicalize(claims)), publicKey, Buffer.from(signature, "base64url"));
  } catch { return false; }
}
