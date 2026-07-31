const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha256Pattern = /^[a-f0-9]{64}$/;

export class ConsentPersistenceResultError extends Error {
  readonly code = "CONSENT_RPC_RESULT_INVALID";
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConsentPersistenceResultError("Consent persistence RPC returned a non-object result.");
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ConsentPersistenceResultError(`Consent persistence RPC omitted ${field}.`);
  }
  return value.trim();
}

export function normalizeConsentPersistResult(value: unknown) {
  const result = record(value);
  const status = requiredString(result.status, "status");
  if (!["CREATED", "DUPLICATE", "CONFLICT"].includes(status)) {
    throw new ConsentPersistenceResultError("Consent persistence RPC returned an unsupported status.");
  }

  const receiptId = requiredString(result.receiptId ?? result.receipt_id, "receiptId");
  if (!uuidPattern.test(receiptId)) {
    throw new ConsentPersistenceResultError("Consent persistence RPC returned an invalid receiptId.");
  }
  if (status === "CONFLICT") {
    return { status: "CONFLICT" as const, receiptId };
  }

  const receiptHash = requiredString(result.receiptHash ?? result.receipt_hash, "receiptHash");
  if (!sha256Pattern.test(receiptHash)) {
    throw new ConsentPersistenceResultError("Consent persistence RPC returned an invalid receiptHash.");
  }
  const expiresAt = requiredString(result.expiresAt ?? result.expires_at, "expiresAt");
  if (Number.isNaN(Date.parse(expiresAt))) {
    throw new ConsentPersistenceResultError("Consent persistence RPC returned an invalid expiresAt.");
  }
  const categories = record(result.categories);
  const categoryKeys = ["essential", "functional", "analytics", "ai_improvements", "marketing"];
  if (
    categories.essential !== true
    || categoryKeys.some((key) => typeof categories[key] !== "boolean")
  ) {
    throw new ConsentPersistenceResultError("Consent persistence RPC returned invalid categories.");
  }

  return {
    status: status as "CREATED" | "DUPLICATE",
    receiptId,
    receiptHash,
    expiresAt,
    categories,
  };
}
