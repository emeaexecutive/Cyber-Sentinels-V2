import { hashCanonical } from "../trust-core/hash.ts";
import type { JsonValue } from "../trust-core/types.ts";
import { policyLayers, type ResolvedTrustPolicy } from "./policy-types.ts";
import { validatePolicyVersion } from "./policy-validation.ts";

export function resolveTrustPolicy(input:{versions:unknown[];asOf:string;enterpriseId:string;domainKey:string;workflowId?:string;authorityId?:string}):ResolvedTrustPolicy{
  const asOf=Date.parse(input.asOf);if(!Number.isFinite(asOf))throw new TypeError("Policy resolution time is invalid.");
  const applicable=input.versions.map(validatePolicyVersion).filter((policy)=>policy.active&&Date.parse(policy.validFrom)<=asOf&&(!policy.validUntil||Date.parse(policy.validUntil)>asOf)&&(!policy.enterpriseId||policy.enterpriseId===input.enterpriseId)&&(!policy.domainKey||policy.domainKey===input.domainKey)&&(!policy.workflowId||policy.workflowId===input.workflowId)&&(!policy.authorityId||policy.authorityId===input.authorityId)).sort((a,b)=>policyLayers.indexOf(a.layer)-policyLayers.indexOf(b.layer)||a.validFrom.localeCompare(b.validFrom)||a.version.localeCompare(b.version));
  if(!applicable.some((item)=>item.layer==="PLATFORM_DEFAULT"))throw Object.assign(new Error("Platform default policy is required."),{code:"POLICY_INVALID"});
  const rules:Record<string,JsonValue>={};for(const policy of applicable)Object.assign(rules,policy.rules);
  return {versions:applicable,rules,resolutionHash:hashCanonical({versions:applicable.map((item)=>`${item.policyId}@${item.version}`),rules})};
}
