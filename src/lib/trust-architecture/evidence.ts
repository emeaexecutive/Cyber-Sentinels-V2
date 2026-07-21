import { hashCanonical, hashesEqual } from "../trust-core/hash.ts";
import { normalizeReasonCodes } from "../trust-core/reason-codes.ts";
import { normalizeTrustReference } from "../trust-core/references.ts";
import { normalizeUtcTimestamp } from "../trust-core/time.ts";
import { TRUST_CANONICALIZATION, TRUST_HASH_ALGORITHM, type TrustReference } from "../trust-core/types.ts";
import { resolveTrustDomain } from "./domain-registry.ts";

export const evidenceResults = ["POSITIVE", "NEGATIVE", "INCONCLUSIVE", "UNAVAILABLE", "REVOKED"] as const;
export const assuranceLevels = ["NONE", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"] as const;
export type EvidenceResult = (typeof evidenceResults)[number];
export type AssuranceLevel = (typeof assuranceLevels)[number];

export type EvidenceObject = {
  evidenceId: string; enterpriseId: string; domainKey: string; subjectId: string; subjectType: string;
  evidenceType: string; sourceType: string; sourceKey: string; result: EvidenceResult; assuranceLevel: AssuranceLevel;
  cryptographicallyVerified: boolean; serverVerified: boolean; occurredAt: string; receivedAt: string; expiresAt?: string;
  payloadHash: string; canonicalization: typeof TRUST_CANONICALIZATION; hashAlgorithm: typeof TRUST_HASH_ALGORITHM;
  references: TrustReference[]; reasonCodes: string[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = /^[a-f0-9]{64}$/;
const ref = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;
function required(value: unknown, field: string): string { if (typeof value !== "string" || !ref.test(value)) throw new TypeError(`${field} is invalid.`); return value; }

export function validateEvidenceObject(value: unknown): EvidenceObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("EvidenceObject must be an object.");
  const row = value as Record<string, unknown>;
  if (!uuid.test(String(row.evidenceId)) || !uuid.test(String(row.enterpriseId))) throw new TypeError("Evidence IDs must be UUIDs.");
  resolveTrustDomain(row.domainKey);
  if (!evidenceResults.includes(row.result as EvidenceResult) || !assuranceLevels.includes(row.assuranceLevel as AssuranceLevel)) throw new TypeError("Evidence result or assurance level is invalid.");
  if (row.canonicalization !== TRUST_CANONICALIZATION || row.hashAlgorithm !== TRUST_HASH_ALGORITHM || !hash.test(String(row.payloadHash))) throw new TypeError("Evidence integrity metadata is invalid.");
  const references = Array.isArray(row.references) ? row.references.map((item, index) => normalizeTrustReference(item, `references[${index}]`)) : [];
  return {
    evidenceId: String(row.evidenceId), enterpriseId: String(row.enterpriseId), domainKey: String(row.domainKey), subjectId: required(row.subjectId, "subjectId"), subjectType: required(row.subjectType, "subjectType"),
    evidenceType: required(row.evidenceType, "evidenceType"), sourceType: required(row.sourceType, "sourceType"), sourceKey: required(row.sourceKey, "sourceKey"), result: row.result as EvidenceResult,
    assuranceLevel: row.assuranceLevel as AssuranceLevel, cryptographicallyVerified: row.cryptographicallyVerified === true, serverVerified: row.serverVerified === true,
    occurredAt: normalizeUtcTimestamp(String(row.occurredAt), "occurredAt"), receivedAt: normalizeUtcTimestamp(String(row.receivedAt), "receivedAt"),
    ...(row.expiresAt === undefined ? {} : { expiresAt: normalizeUtcTimestamp(String(row.expiresAt), "expiresAt") }), payloadHash: String(row.payloadHash),
    canonicalization: TRUST_CANONICALIZATION, hashAlgorithm: TRUST_HASH_ALGORITHM, references, reasonCodes: normalizeReasonCodes(Array.isArray(row.reasonCodes) ? row.reasonCodes.map(String) : []),
  };
}

export function evidenceObjectHash(evidence: EvidenceObject): string { return hashCanonical(validateEvidenceObject(evidence) as unknown as Record<string, unknown>); }
export function evidencePayloadMatches(evidence: EvidenceObject, payload: Record<string, unknown>): boolean { return hashesEqual(evidence.payloadHash, hashCanonical(payload)); }

export function assertPositiveEvidenceEligible(evidence: EvidenceObject): void {
  if (evidence.result !== "POSITIVE") return;
  if (["placeholder", "mock", "disabled", "unsupported", "unavailable"].some((token) => `${evidence.sourceType}:${evidence.sourceKey}`.toLowerCase().includes(token))) throw Object.assign(new Error("Non-operational providers cannot contribute positive evidence."), { code: "PLACEHOLDER_PROVIDER_ZERO_WEIGHT" });
  if (evidence.sourceKey.toLowerCase() === "world_id" && !evidence.serverVerified) throw Object.assign(new Error("World ID is inconclusive until server verification exists."), { code: "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED" });
}
