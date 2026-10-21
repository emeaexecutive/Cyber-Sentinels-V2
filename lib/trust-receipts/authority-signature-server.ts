import "server-only";
import { readFile } from "node:fs/promises";
import { platformReceiptKey, signAuthorityReceipt } from "./authority-signature";

export async function attachAuthorityReceiptSignature(receipt: Record<string, unknown>, tenantId: string, receiptId: string) {
  const keyPath = process.env.AUTHORITY_RECEIPT_PRIVATE_KEY_FILE?.trim();
  const keyId = process.env.AUTHORITY_RECEIPT_KEY_ID?.trim();
  if (!keyPath && !keyId) return { ...receipt, cryptographic_verification: { status: "NOT_CONFIGURED" as const } };
  if (!keyPath || !keyId) throw new Error("Platform receipt signing configuration is incomplete.");
  // Read from an operator-controlled secret mount. Never accept a client path/key.
  const { privateKey } = platformReceiptKey(await readFile(keyPath, "utf8"));
  return { ...receipt, cryptographic_verification: { status: "SIGNED" as const,
    proof: signAuthorityReceipt(receipt, { tenantId, receiptId, keyId, privateKey }) } };
}
