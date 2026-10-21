import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export type AuthorityReceiptSignature = {
  version: "authority-receipt-signature-v1";
  algorithm: "Ed25519";
  keyId: string;
  tenantId: string;
  receiptId: string;
  payloadDigest: string;
  signature: string;
};

function claims(receipt: Record<string, unknown>, tenantId: string, receiptId: string, keyId: string) {
  if (![tenantId, receiptId, keyId].every(value => typeof value === "string" && /^[A-Za-z0-9_.:/-]{1,240}$/.test(value))) throw new TypeError("Invalid receipt signing context.");
  return { version: "authority-receipt-signature-v1" as const, algorithm: "Ed25519" as const, keyId, tenantId, receiptId, payloadDigest: hashCanonical(receipt) };
}

/** Signs historical evidence, never a bearer credential or permission to execute. */
export function signAuthorityReceipt(receipt: Record<string, unknown>, input: { tenantId: string; receiptId: string; keyId: string; privateKey: KeyObject }) : AuthorityReceiptSignature {
  if (input.privateKey.type !== "private" || input.privateKey.asymmetricKeyType !== "ed25519") throw new TypeError("An Ed25519 platform private key is required.");
  const protectedClaims = claims(receipt, input.tenantId, input.receiptId, input.keyId);
  return { ...protectedClaims, signature: sign(null, Buffer.from(canonicalize(protectedClaims)), input.privateKey).toString("base64url") };
}

/** Trust anchors are supplied by the verifier; a receipt cannot nominate its own key. */
export function verifyAuthorityReceipt(receipt: Record<string, unknown>, signature: AuthorityReceiptSignature, input: { tenantId: string; receiptId: string; trustedKeys: ReadonlyMap<string, KeyObject> }): boolean {
  try {
    if (signature.version !== "authority-receipt-signature-v1" || signature.algorithm !== "Ed25519"
      || signature.tenantId !== input.tenantId || signature.receiptId !== input.receiptId
      || !/^[A-Za-z0-9_-]{86}$/.test(signature.signature)) return false;
    const key = input.trustedKeys.get(signature.keyId);
    if (!key || key.type !== "public" || key.asymmetricKeyType !== "ed25519") return false;
    const expected = claims(receipt, input.tenantId, input.receiptId, signature.keyId);
    if (expected.payloadDigest !== signature.payloadDigest) return false;
    return verify(null, Buffer.from(canonicalize(expected)), key, Buffer.from(signature.signature, "base64url"));
  } catch { return false; }
}

export function platformReceiptKey(privatePem: string) {
  const privateKey = createPrivateKey(privatePem);
  if (privateKey.asymmetricKeyType !== "ed25519") throw new TypeError("Unsupported platform receipt key.");
  return { privateKey, publicKey: createPublicKey(privateKey) };
}
