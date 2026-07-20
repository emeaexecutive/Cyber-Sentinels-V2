import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { consentCorrelationId, consentFailure, consentResponse } from "@/src/lib/consent/http";
import { consentRepository } from "@/src/lib/consent/repository";
import { consentCategoryKeys } from "@/src/lib/consent/types";

export async function GET(request: Request) {
  const correlationId = consentCorrelationId(request);
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin"]); const data = await consentRepository().adminSummary(context.enterpriseId); const total = data.receipts.length; const visible = total >= 5;
    const count = (predicate: (row: (typeof data.receipts)[number]) => boolean) => data.receipts.filter(predicate).length;
    const categoryRates = Object.fromEntries(consentCategoryKeys.map((key) => [key, visible ? count((row) => (row.categories as Record<string, boolean>)?.[key] === true) / total : null]));
    const cohorts=(field:"policy_version"|"region_profile"|"language")=>{const values=new Map<string,number>();for(const row of data.receipts){const key=String(row[field]??"unknown");values.set(key,(values.get(key)??0)+1);}return Object.fromEntries([...values].filter(([,value])=>value>=5));};
    return consentResponse({ ok: true, minimumCohort: 5, suppressed: !visible, metrics: { totalReceipts: visible ? total : null, acceptAllRate: visible ? count((row) => row.consent_action === "ACCEPT_ALL") / total : null, rejectOptionalRate: visible ? count((row) => row.consent_action === "REJECT_OPTIONAL") / total : null, reconsentCompletionRate: visible ? count((row)=>row.consent_action==="POLICY_RECONSENT")/total:null, categoryOptInRate: categoryRates, policyVersionCohorts:visible?cohorts("policy_version"):{},regionProfileCohorts:visible?cohorts("region_profile"):{},localeCohorts:visible?cohorts("language"):{}, unknownTrackers: data.trackers.filter((row) => row.classification_status === "UNKNOWN").length, catalogueReviewOverdue: data.trackers.filter((row) => !row.last_reviewed).length }, policies: data.policies }, 200, correlationId);
  } catch (error) { return consentFailure(error, correlationId); }
}
