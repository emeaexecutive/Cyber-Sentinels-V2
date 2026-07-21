import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import { normalizeUtcTimestamp } from "../trust-core/time.ts";
import { TRUST_CANONICALIZATION, TRUST_HASH_ALGORITHM } from "../trust-core/types.ts";
import { resolveTrustDomain } from "./domain-registry.ts";

export type TrustDecisionContract = {
  decisionContractId: string; enterpriseId: string; domainKey: string; subjectId: string; workflowId?: string; authorityId?: string;
  policyId: string; policyVersion: string; evidenceSnapshotHash: string; decisionInputHash: string;
  canonicalization: typeof TRUST_CANONICALIZATION; hashAlgorithm: typeof TRUST_HASH_ALGORITHM; requestedAt: string;
};

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digest=/^[a-f0-9]{64}$/;
const reference=/^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;
function text(value: unknown, field: string) { if (typeof value !== "string" || !reference.test(value)) throw new TypeError(`${field} is invalid.`); return value; }

export function validateTrustDecisionContract(value: unknown): TrustDecisionContract {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("TrustDecisionContract must be an object.");
  const row=value as Record<string,unknown>;
  if(!uuid.test(String(row.decisionContractId))||!uuid.test(String(row.enterpriseId)))throw new TypeError("Decision contract IDs must be UUIDs.");
  resolveTrustDomain(row.domainKey);
  if(!digest.test(String(row.evidenceSnapshotHash))||!digest.test(String(row.decisionInputHash)))throw new TypeError("Decision contract hashes must be SHA-256.");
  if(row.canonicalization!==TRUST_CANONICALIZATION||row.hashAlgorithm!==TRUST_HASH_ALGORITHM)throw new TypeError("Decision contract integrity metadata is invalid.");
  return {decisionContractId:String(row.decisionContractId),enterpriseId:String(row.enterpriseId),domainKey:String(row.domainKey),subjectId:text(row.subjectId,"subjectId"),...(row.workflowId===undefined?{}:{workflowId:text(row.workflowId,"workflowId")}),...(row.authorityId===undefined?{}:{authorityId:text(row.authorityId,"authorityId")}),policyId:text(row.policyId,"policyId"),policyVersion:text(row.policyVersion,"policyVersion"),evidenceSnapshotHash:String(row.evidenceSnapshotHash),decisionInputHash:String(row.decisionInputHash),canonicalization:TRUST_CANONICALIZATION,hashAlgorithm:TRUST_HASH_ALGORITHM,requestedAt:normalizeUtcTimestamp(String(row.requestedAt),"requestedAt")};
}

export function createTrustDecisionContract(input: Omit<TrustDecisionContract,"decisionContractId"|"decisionInputHash"|"canonicalization"|"hashAlgorithm"> & { decisionInputs: Record<string, unknown> }): TrustDecisionContract {
  const decisionInputHash=hashCanonical(input.decisionInputs);
  const identity={enterpriseId:input.enterpriseId,domainKey:input.domainKey,subjectId:input.subjectId,...(input.workflowId?{workflowId:input.workflowId}:{}),...(input.authorityId?{authorityId:input.authorityId}:{}),policyId:input.policyId,policyVersion:input.policyVersion,evidenceSnapshotHash:input.evidenceSnapshotHash,decisionInputHash,requestedAt:normalizeUtcTimestamp(input.requestedAt)};
  return validateTrustDecisionContract({...identity,decisionContractId:deterministicUuid(identity),canonicalization:TRUST_CANONICALIZATION,hashAlgorithm:TRUST_HASH_ALGORITHM});
}
