import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

/** Exact executable scope. Authentication, tenant and authority are resolved separately. */
export type ExactActionScope = {
  tool: string;
  provider: string;
  payload_digest: string;
  data_scope: string[];
  amount_minor?: number;
  currency?: string;
};

export function normalizeExactActionScope(value: unknown): ExactActionScope {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("exact_scope must be an object.");
  const raw = value as Record<string, unknown>;
  const allowed = ["tool", "provider", "payload_digest", "data_scope", "amount_minor", "currency"];
  if (Object.keys(raw).some(key => !allowed.includes(key))) throw new TypeError("Unknown exact_scope field.");
  for (const key of ["tool", "provider"]) if (typeof raw[key] !== "string" || !/^[A-Za-z0-9_.:/-]{1,180}$/.test(raw[key])) throw new TypeError(`Invalid exact_scope.${key}.`);
  if (typeof raw.payload_digest !== "string" || !/^[a-f0-9]{64}$/.test(raw.payload_digest)) throw new TypeError("Invalid exact_scope.payload_digest.");
  if (!Array.isArray(raw.data_scope) || raw.data_scope.length > 32 || raw.data_scope.some(item => typeof item !== "string" || !/^[A-Za-z0-9_.:/-]{1,240}$/.test(item))) throw new TypeError("Invalid exact_scope.data_scope.");
  if ((raw.amount_minor === undefined) !== (raw.currency === undefined)) throw new TypeError("Amount and currency must be supplied together.");
  if (raw.amount_minor !== undefined && (!Number.isSafeInteger(raw.amount_minor) || Number(raw.amount_minor) < 0 || typeof raw.currency !== "string" || !/^[A-Z]{3}$/.test(raw.currency))) throw new TypeError("Invalid exact_scope value.");
  return { tool: raw.tool as string, provider: raw.provider as string, payload_digest: raw.payload_digest,
    data_scope: [...new Set(raw.data_scope as string[])].sort(),
    ...(raw.amount_minor !== undefined ? { amount_minor: raw.amount_minor as number, currency: raw.currency as string } : {}) };
}

/** The review reference is transport for approval, never part of the approved intent. */
export function actionRequestDigest(input: { operationalEntityId: string; action: Record<string, unknown>; decisionType: string | null; context: Record<string, unknown> | null }) {
  const context = input.context ? { ...input.context } : null;
  if (context) delete context.human_approval_reference;
  return hashCanonical({ ...input, context });
}

export function approvedActionMatches(approvedDigest: string, input: Parameters<typeof actionRequestDigest>[0]) {
  if (approvedDigest === actionRequestDigest(input)) return true;
  const context = { ...input.context }; delete context.human_approval_reference;
  // Empty and absent context carry no scope, but historical idempotency hashes
  // distinguish them. Preserve those hashes and accept either only for REVIEW matching.
  if (Object.keys(context).length) return false;
  return [null, {}].some(value => approvedDigest === actionRequestDigest({ ...input, context: value }));
}

export function safeExecutionParameters(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Execution parameters must be an object.");
  const visit = (node: unknown, depth: number) => {
    if (depth > 12) throw new TypeError("Execution parameters exceed nesting limit.");
    if (node && typeof node === "object") for (const [key, child] of Object.entries(node)) {
      if (/password|secret|authorization|access.?token|refresh.?token|private.?key|api.?key/i.test(key)) throw new TypeError("Secret-bearing execution parameters are forbidden; use credential references.");
      visit(child, depth + 1);
    }
  };
  visit(value, 0);
  // hashCanonical rejects non-JSON values, cycles and non-finite numbers.
  hashCanonical(value as Record<string, unknown>);
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > 32_768) throw new TypeError("Execution parameters exceed size limit.");
  return JSON.parse(serialized);
}
