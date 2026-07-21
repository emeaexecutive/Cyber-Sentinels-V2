import { hashCanonical } from "../trust-core/hash.ts";

export const trustKpiKeys=["identity_verification_coverage","ai_agent_authorization_coverage","workflow_trust","evidence_freshness","provider_resilience","decision_reproducibility","replay_completeness","consent_compliance","revocation_response","unresolved_conflict_exposure"] as const;
export type TrustKpiKey=(typeof trustKpiKeys)[number];
export type TrustKpi={metricKey:TrustKpiKey;status:"MEASURED"|"INSUFFICIENT_DATA";value:number|null;numerator:number|null;denominator:number|null;evidenceHash:string;measuredAt:string};

export function evidenceBackedKpi(metricKey:TrustKpiKey,numerator:number,denominator:number,measuredAt:string):TrustKpi{if(!Number.isFinite(numerator)||!Number.isFinite(denominator)||denominator<=0)return {metricKey,status:"INSUFFICIENT_DATA",value:null,numerator:null,denominator:null,evidenceHash:hashCanonical({metricKey,status:"INSUFFICIENT_DATA",measuredAt}),measuredAt};const value=Number((numerator/denominator*100).toFixed(2));return {metricKey,status:"MEASURED",value,numerator,denominator,evidenceHash:hashCanonical({metricKey,numerator,denominator,value,measuredAt}),measuredAt};}

export function insufficientKpi(metricKey:TrustKpiKey,measuredAt:string):TrustKpi{return evidenceBackedKpi(metricKey,0,0,measuredAt);}
