import { normalizeUtcTimestamp } from "../trust-core/time.ts";
import { canonicalize } from "../trust-core/canonicalize.ts";
import { policyLayers, type TrustPolicyVersion } from "./policy-types.ts";

const ref=/^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;
export function validatePolicyVersion(value: unknown): TrustPolicyVersion {
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Policy version must be an object.");
  const row=value as Record<string,unknown>;const text=(field:string)=>{const result=row[field];if(typeof result!=="string"||!ref.test(result))throw new TypeError(`${field} is invalid.`);return result;};
  if(!policyLayers.includes(row.layer as TrustPolicyVersion["layer"]))throw new TypeError("Policy layer is invalid.");
  if(!row.rules||typeof row.rules!=="object"||Array.isArray(row.rules))throw new TypeError("Policy rules must be an object.");
  canonicalize(row.rules as Record<string,unknown>);
  const policy={policyId:text("policyId"),version:text("version"),layer:row.layer as TrustPolicyVersion["layer"],active:row.active===true,validFrom:normalizeUtcTimestamp(String(row.validFrom),"validFrom"),rules:row.rules as TrustPolicyVersion["rules"]} as TrustPolicyVersion;
  for(const field of ["enterpriseId","domainKey","workflowId","authorityId"] as const)if(row[field]!==undefined)policy[field]=text(field);
  if(row.validUntil!==undefined)policy.validUntil=normalizeUtcTimestamp(String(row.validUntil),"validUntil");
  if(policy.validUntil&&Date.parse(policy.validUntil)<=Date.parse(policy.validFrom))throw new TypeError("Policy validity interval is invalid.");
  return policy;
}
