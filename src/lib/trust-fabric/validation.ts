import { deterministicUuid } from "../trust-core/hash.ts";
import { TrustArchitectureApiError } from "../trust-architecture/http.ts";
import { enterpriseSubjectClasses, fabricTrustStates, type TrustContract, type TrustContractEvaluationInput } from "./types.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reference = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;

export function strictObject(value: unknown, allowed: readonly string[], name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TrustArchitectureApiError(`${name} must be an object.`, 400, "SCHEMA_INVALID");
  const row = value as Record<string, unknown>;
  const unknown = Object.keys(row).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new TrustArchitectureApiError(`${name} contains unknown fields: ${unknown.join(", ")}.`, 400, "UNKNOWN_FIELD");
  return row;
}
function text(value: unknown, name: string) { const result = typeof value === "string" ? value.trim() : ""; if (!reference.test(result)) throw new TrustArchitectureApiError(`${name} is invalid.`, 400, "SCHEMA_INVALID"); return result; }
function boundedText(value: unknown, name: string, maximum: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > maximum || /[\u0000-\u001f\u007f]/.test(result)) {
    throw new TrustArchitectureApiError(`${name} is invalid.`, 400, "SCHEMA_INVALID");
  }
  return result;
}
function stringArray(value: unknown, name: string) { if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !reference.test(item))) throw new TrustArchitectureApiError(`${name} is invalid.`, 400, "SCHEMA_INVALID"); return [...new Set(value as string[])]; }
function timestamp(value: unknown, name: string) { const result = new Date(String(value)); if (Number.isNaN(result.getTime())) throw new TrustArchitectureApiError(`${name} is invalid.`, 400, "SCHEMA_INVALID"); return result.toISOString(); }

export function validateTrustContract(value: unknown, enterpriseId: string): TrustContract {
  const row = strictObject(value, ["contractId","subject","workflow","authorizedObjective","requiredIdentityState","requiredAuthority","requiredEnvironmentState","permittedScope","permittedProviders","requiredEvidenceTypes","maximumEvidenceAgeSeconds","monitoringRequirements","humanReviewThresholds","contradictionPolicy","incidentThreshold","expiresAt","revocationState","issuer","approver","policyVersion","evidenceReferences","issuedAt","supersedesContractId"], "TrustContract");
  const subject = strictObject(row.subject, ["type","id","displayName"], "subject");
  const workflow = strictObject(row.workflow, ["id","objective"], "workflow");
  if (!enterpriseSubjectClasses.includes(subject.type as never)) throw new TrustArchitectureApiError("subject.type is invalid.",400,"SCHEMA_INVALID");
  if (!fabricTrustStates.includes(row.requiredIdentityState as never) || !fabricTrustStates.includes(row.requiredEnvironmentState as never)) throw new TrustArchitectureApiError("Required trust state is invalid.",400,"SCHEMA_INVALID");
  const issuedAt = timestamp(row.issuedAt,"issuedAt"); const expiresAt = timestamp(row.expiresAt,"expiresAt");
  if (new Date(expiresAt) <= new Date(issuedAt)) throw new TrustArchitectureApiError("expiresAt must follow issuedAt.",400,"SCHEMA_INVALID");
  const contractIdentity = { enterpriseId, subjectType: subject.type, subjectId: subject.id, workflowId: workflow.id, issuedAt, policyVersion: row.policyVersion };
  const contractId = row.contractId === undefined ? deterministicUuid(contractIdentity) : String(row.contractId);
  if (!uuid.test(contractId)) throw new TrustArchitectureApiError("contractId must be a UUID.",400,"SCHEMA_INVALID");
  const supersedesContractId = row.supersedesContractId == null ? null : String(row.supersedesContractId);
  if (supersedesContractId !== null && (!uuid.test(supersedesContractId) || supersedesContractId === contractId)) throw new TrustArchitectureApiError("supersedesContractId is invalid.",400,"SCHEMA_INVALID");
  const evidenceReferences = Array.isArray(row.evidenceReferences) ? row.evidenceReferences.map((item) => { const ref = strictObject(item,["type","id","version"],"evidenceReference"); return { type:text(ref.type,"reference.type"),id:text(ref.id,"reference.id"),...(ref.version===undefined?{}:{version:text(ref.version,"reference.version")}) }; }) : [];
  const maximumEvidenceAgeSeconds = Number(row.maximumEvidenceAgeSeconds);
  if (!Number.isInteger(maximumEvidenceAgeSeconds) || maximumEvidenceAgeSeconds < 1 || maximumEvidenceAgeSeconds > 31_536_000) throw new TrustArchitectureApiError("maximumEvidenceAgeSeconds is invalid.",400,"SCHEMA_INVALID");
  if (!["review","pause","breach"].includes(String(row.contradictionPolicy)) || !["material","critical","emergency"].includes(String(row.incidentThreshold)) || !["active","revoked"].includes(String(row.revocationState))) throw new TrustArchitectureApiError("Trust Contract policy state is invalid.",400,"SCHEMA_INVALID");
  return { contractId, enterpriseId, subject:{type:subject.type as TrustContract["subject"]["type"],id:text(subject.id,"subject.id"),displayName:boundedText(subject.displayName,"subject.displayName",160)}, workflow:{id:text(workflow.id,"workflow.id"),objective:boundedText(workflow.objective,"workflow.objective",500)}, authorizedObjective:boundedText(row.authorizedObjective,"authorizedObjective",500), requiredIdentityState:row.requiredIdentityState as TrustContract["requiredIdentityState"], requiredAuthority:stringArray(row.requiredAuthority,"requiredAuthority"), requiredEnvironmentState:row.requiredEnvironmentState as TrustContract["requiredEnvironmentState"], permittedScope:stringArray(row.permittedScope,"permittedScope"), permittedProviders:stringArray(row.permittedProviders,"permittedProviders"), requiredEvidenceTypes:stringArray(row.requiredEvidenceTypes,"requiredEvidenceTypes"), maximumEvidenceAgeSeconds, monitoringRequirements:stringArray(row.monitoringRequirements,"monitoringRequirements"), humanReviewThresholds:stringArray(row.humanReviewThresholds,"humanReviewThresholds"), contradictionPolicy:row.contradictionPolicy as TrustContract["contradictionPolicy"], incidentThreshold:row.incidentThreshold as TrustContract["incidentThreshold"], expiresAt, revocationState:row.revocationState as TrustContract["revocationState"], issuer:text(row.issuer,"issuer"), approver:text(row.approver,"approver"), policyVersion:text(row.policyVersion,"policyVersion"), evidenceReferences, issuedAt, supersedesContractId };
}

export function validateContractEvaluation(value: unknown, contract: TrustContract, enterpriseId: string, correlationId: string): TrustContractEvaluationInput {
  const row = strictObject(value,["evaluatedAt","identityState","authorityState","effectiveAuthority","environmentState","scopeState","requestedScope","activeProviders","evidence","monitoring","contradictions","highestIncidentSeverity","humanReviewRequired"],"TrustContractEvaluation");
  for (const field of ["identityState","authorityState","environmentState","scopeState"] as const) if (!fabricTrustStates.includes(row[field] as never)) throw new TrustArchitectureApiError(`${field} is invalid.`,400,"SCHEMA_INVALID");
  if (!["none","material","critical","emergency"].includes(String(row.highestIncidentSeverity)) || typeof row.humanReviewRequired !== "boolean") throw new TrustArchitectureApiError("Evaluation state is invalid.",400,"SCHEMA_INVALID");
  const evidence = Array.isArray(row.evidence) ? row.evidence.map((item) => { const evidenceRow=strictObject(item,["type","observedAt","reference"],"evidence");const ref=strictObject(evidenceRow.reference,["type","id","version"],"evidence.reference");return {type:text(evidenceRow.type,"evidence.type"),observedAt:timestamp(evidenceRow.observedAt,"evidence.observedAt"),reference:{type:text(ref.type,"reference.type"),id:text(ref.id,"reference.id"),...(ref.version===undefined?{}:{version:text(ref.version,"reference.version")})}}; }) : [];
  return { contract:{...contract,enterpriseId}, evaluatedAt:timestamp(row.evaluatedAt,"evaluatedAt"), identityState:row.identityState as TrustContractEvaluationInput["identityState"], authorityState:row.authorityState as TrustContractEvaluationInput["authorityState"], effectiveAuthority:stringArray(row.effectiveAuthority,"effectiveAuthority"), environmentState:row.environmentState as TrustContractEvaluationInput["environmentState"], scopeState:row.scopeState as TrustContractEvaluationInput["scopeState"], requestedScope:stringArray(row.requestedScope,"requestedScope"), activeProviders:stringArray(row.activeProviders,"activeProviders"), evidence, monitoring:stringArray(row.monitoring,"monitoring"), contradictions:stringArray(row.contradictions,"contradictions"), highestIncidentSeverity:row.highestIncidentSeverity as TrustContractEvaluationInput["highestIncidentSeverity"], humanReviewRequired:row.humanReviewRequired, correlationId };
}
