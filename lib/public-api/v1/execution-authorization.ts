import { createHmac, randomUUID } from "node:crypto";
import type { SafeCanonicalTransactionReceipt } from "../../../src/lib/trust-transaction/canonical.ts";

type ExecutionAuthorizationReceipt = Pick<SafeCanonicalTransactionReceipt,
  "decision" | "idempotentReplay" | "transactionId" | "operationalEntityId" | "action" | "digest">;

export function executionAuthorization(
  receipt: ExecutionAuthorizationReceipt,
  secret = process.env.API_EXECUTION_SIGNING_SECRET?.trim()
    || process.env.PUBLIC_API_EXECUTION_SIGNING_SECRET?.trim()
    || process.env.TRUST_ACTION_RELAY_SECRET?.trim(),
) {
  // An idempotent response is historical evidence. Its authority was not
  // reevaluated, so replay must never renew an executor's permission window.
  if (receipt.decision !== "ALLOW" || receipt.idempotentReplay !== false || !secret) return null;
  const artifact = {
    version: "transaction-execution-authorization-v1",
    transaction_id: receipt.transactionId,
    operational_entity_id: receipt.operationalEntityId,
    action: receipt.action.type,
    target: receipt.action.resource,
    decision_digest: receipt.digest,
    audience: "external-executor",
    nonce: randomUUID(),
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
  return { ...artifact, signature: `sha256=${createHmac("sha256", secret).update(JSON.stringify(artifact)).digest("hex")}` };
}
