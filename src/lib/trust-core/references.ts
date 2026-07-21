import type { TrustReference } from "./types.ts";

const referencePattern = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;

export function assertReferencePart(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !referencePattern.test(value)) throw new TypeError(`${field} is invalid.`);
}

export function normalizeTrustReference(value: unknown, field = "reference"): TrustReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be an object.`);
  const row = value as Record<string, unknown>;
  assertReferencePart(row.refType, `${field}.refType`);
  assertReferencePart(row.refId, `${field}.refId`);
  if (row.version !== undefined) assertReferencePart(row.version, `${field}.version`);
  return { refType: row.refType, refId: row.refId, ...(row.version === undefined ? {} : { version: row.version }) };
}

export function trustReferenceKey(reference: TrustReference): string {
  return `${reference.refType}:${reference.refId}${reference.version ? `@${reference.version}` : ""}`;
}
