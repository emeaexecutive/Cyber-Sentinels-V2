import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export const PARAMETER_PROVENANCE_CLASSES = [
  "model_controlled", "user_supplied", "human_bound", "authority_bound", "policy_bound",
  "provider_bound", "runtime_derived", "configuration_bound", "destination_derived", "unknown",
] as const;
export type ParameterProvenance = (typeof PARAMETER_PROVENANCE_CLASSES)[number];

export const SECURITY_BOUNDARY_PARAMETER_TYPES = [
  "ordinary_input", "identity_boundary", "tenant_boundary", "authorization_boundary", "consent_boundary",
  "credential_boundary", "network_boundary", "destination_boundary", "environment_boundary", "privilege_boundary",
  "data_boundary", "financial_boundary", "delegation_boundary", "destructive_action_boundary", "other",
] as const;
export type SecurityBoundaryParameterType = (typeof SECURITY_BOUNDARY_PARAMETER_TYPES)[number];

export const CONFIGURATION_PINNING_CLASSES = [
  "pinned_at_construction", "server_side_derived", "policy_resolved", "identity_context_derived",
  "runtime_context_derived", "human_signed", "provider_managed", "model_selectable", "unknown",
] as const;
export type ConfigurationPinning = (typeof CONFIGURATION_PINNING_CLASSES)[number];

export const AUTHORIZATION_CHANGE_TYPES = [
  "subject_disabled", "account_disabled", "agent_suspended", "session_revoked", "credential_revoked",
  "credential_expired", "risk_elevated", "posture_changed", "token_replay_suspected", "tool_revoked",
  "destination_revoked", "policy_changed", "authority_reduced",
] as const;
export type AuthorizationChangeType = (typeof AUTHORIZATION_CHANGE_TYPES)[number];

export const AUTHORIZATION_PROPAGATION_STATES = [
  "change_received", "reevaluation_requested", "provider_acknowledged", "provider_reports_applied",
  "downstream_update_observed", "destination_rejects_old_authority", "independently_confirmed", "partial",
  "conflicting", "failed", "insufficient_evidence",
] as const;
export type AuthorizationPropagationState = (typeof AUTHORIZATION_PROPAGATION_STATES)[number];

export const AUTHORITY_INTEGRITY_FINDINGS = [
  "MODEL_CONTROLLED_SECURITY_BOUNDARY", "CONSENT_BOUNDARY_MODEL_CONTROLLED", "TENANT_BOUNDARY_MISMATCH",
  "CREDENTIAL_DESTINATION_CHANGED", "MODEL_CONTROLLED_PROXY", "CREDENTIAL_SENT_OUTSIDE_BOUND_DESTINATION",
  "DESTINATION_AUTHORITY_UNRESOLVED", "TOOL_SECURITY_SCHEMA_CHANGE", "STALE_AUTHORITY_STILL_ACTIVE",
  "DELEGATED_SUBJECT_CONTEXT_LOST", "RETROSPECTIVE_TOOL_AUTHORITY_REVIEW_RECOMMENDED",
] as const;
export type AuthorityIntegrityFindingCode = (typeof AUTHORITY_INTEGRITY_FINDINGS)[number];

export const AUTHORITY_INTEGRITY_INVARIANT_TEMPLATES = [
  "SECURITY_BOUNDARY_PARAMETERS_ARE_NOT_MODEL_CONTROLLED",
  "TENANT_IDENTITY_IS_DERIVED_FROM_TRUSTED_CONTEXT",
  "HUMAN_CONSENT_CANNOT_BE_DISABLED_BY_MODEL_INPUT",
  "CREDENTIAL_DESTINATION_IS_AUTHORITY_BOUND",
  "PRODUCTION_ENVIRONMENT_SELECTION_IS_NOT_MODEL_CONTROLLED",
  "PRIVILEGE_LEVEL_IS_NOT_MODEL_CONTROLLED",
  "CONSEQUENTIAL_TOOL_PARAMETERS_MATCH_APPROVED_INTENT",
  "DELEGATED_SUBJECT_CONTEXT_REMAINS_RECONSTRUCTABLE",
  "REVOKED_AGENT_AUTHORITY_DOES_NOT_SURVIVE_DOWNSTREAM",
  "DOWNGRADED_AUTHORITY_IS_NOT_USED_AFTER_CHANGE_SIGNAL",
  "AUTHORIZATION_CHANGE_PROPAGATES_TO_DESTINATION",
  "EVERY_CONSEQUENTIAL_AGENT_ACTION_HAS_REPLAYABLE_AUTHORIZATION_CONTEXT",
].map((id) => ({ id, enabledByDefault: false as const, recommended: true as const }));

export const PROVIDER_NEUTRAL_IDENTITY_AUTHORITY_CATEGORIES = [
  "agent_identifier", "agent_credential", "credential_provisioning", "agent_authentication", "agent_authorization",
  "delegated_subject", "posture_assessment", "authorization_policy", "risk_signal", "authorization_change",
  "credential_refresh", "credential_revocation", "privilege_attenuation", "remediation", "audit_event",
] as const;
export type ProviderNeutralIdentityAuthorityCategory = (typeof PROVIDER_NEUTRAL_IDENTITY_AUTHORITY_CATEGORIES)[number];

const trustedNonModelProvenance = new Set<ParameterProvenance>([
  "human_bound", "authority_bound", "policy_bound", "provider_bound", "runtime_derived",
  "configuration_bound", "destination_derived",
]);
const sensitiveKey = /(?:raw|plain(?:text)?|clear(?:text)?).*(?:credential|secret|token|password)|(?:password|secret|token|apiKey)Value/i;
const sensitiveValue = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~-]{16,}/i;

export type ToolParameterPolicy = {
  parameterName: string;
  parameterCategory: SecurityBoundaryParameterType;
  allowedProvenanceClasses: ParameterProvenance[];
  materiality: "ordinary" | "material" | "critical";
  required: boolean;
  modelVisible: boolean;
  mutableAfterApproval: boolean;
  defaultState: "none" | "masked" | "server_resolved" | "policy_resolved";
};

export type ToolSecuritySchemaEvidence = {
  toolId: string;
  toolVersion: string;
  parameterSchema: ToolParameterPolicy[];
  securityCriticalFields: string[];
  schemaDigest: string;
  sourceProvider: string;
  reviewedAt: string;
};

export type ConsequentialToolParameterEvidence = {
  tool: string;
  toolVersion: string;
  parameterName: string;
  parameterCategory: SecurityBoundaryParameterType;
  parameterProvenance: ParameterProvenance;
  valueDigestOrMaskedValue: string;
  materiality: "ordinary" | "material" | "critical";
  timestamp: string;
  evidenceProvider: string;
  policyReference: string;
  configurationPinning: ConfigurationPinning;
};

export type HumanApprovalEvidence = {
  consentRequired: boolean;
  consentSource: string;
  humanIdentityReference: string;
  approvalTimestamp: string;
  approvedAction: string;
  approvedParameterDigest: string;
  finalParameterDigest: string;
  bypassCapableParameter: string | null;
  parameterProvenance: ParameterProvenance | null;
  executionResult: string | null;
  signedIntentReference: string;
};

export type TenantBoundaryEvidence = {
  authoritativeTenant: string;
  authoritativeWorkspace: string;
  sourceIdentity: string;
  runtimeTenant: string | null;
  requestedTenant: string | null;
  modelSuppliedTenant: string | null;
  destinationTenant: string | null;
};

export type CredentialDestinationEvidence = {
  credentialReference: string | null;
  credentialOwnerTenant: string | null;
  approvedDestinations: string[];
  requestedDestination: string | null;
  actualDestination: string | null;
  proxyOrIntermediary: string | null;
  proxyProvenance: ParameterProvenance | null;
  redirectChain: string[];
};

export type RuntimeAuthorityEvidence = {
  runtimeProvider: string;
  runtimeInstance: string;
  runtimeSession: string;
  policyReference: string;
  authorityCeiling: string[];
  delegatedChildRuntime: string | null;
  credentialReference: string | null;
  enforcementDecision: string;
  enforcementResult: string;
  observedExecution: string | null;
  destinationOutcome: string | null;
  overriddenParameterNames: string[];
};

export type AuthorizationChangeEvidence = {
  changeId: string;
  changeType: AuthorizationChangeType;
  subjectReference: string;
  effectiveAt: string;
  receivingProvider: string | null;
  policyReevaluation: string | null;
  privilegeAttenuation: string | null;
  credentialRefreshOrRevocation: string | null;
  runtimeObservation: "old_authority_rejected" | "old_authority_accepted" | "not_observed" | "conflicting";
  destinationObservation: "old_authority_rejected" | "old_authority_accepted" | "not_observed" | "conflicting";
  providerReportedApplied: boolean;
  independentlyConfirmed: boolean;
  postChangeUseObservedAt: string | null;
  evidenceReferences: string[];
};

export type DelegatedSubjectEvidence = {
  originatingHuman: string | null;
  originatingSystem: string | null;
  organization: string;
  agent: string;
  delegatedSubject: string | null;
  actingSubject: string;
  delegationEvidence: string | null;
  task: string;
  purpose: string;
  authorizationDecision: string;
};

export type RetrospectiveToolReviewEvidence = {
  advisoryReference: string;
  affectedToolId: string;
  affectedVersions: string[];
  affectedParameters: string[];
  knownAtActionTime: string[];
  becameKnownLater: string[];
  discoveredAt: string;
};

export type AuthorityIntegrityEvaluationInput = {
  enterpriseId: string;
  actionId: string;
  actionTimestamp: string;
  principalReference: string;
  agentPassportReference: string;
  authorityLineageReference: string;
  capabilityProvenanceReference: string;
  toolSchema: ToolSecuritySchemaEvidence;
  previousToolSchema?: ToolSecuritySchemaEvidence | null;
  parameters: ConsequentialToolParameterEvidence[];
  modelProposalDigest: string;
  finalParametersDigest: string;
  runtimeParametersDigest: string | null;
  trustedContextDigest: string;
  humanApproval?: HumanApprovalEvidence | null;
  tenant: TenantBoundaryEvidence;
  credentialDestination?: CredentialDestinationEvidence | null;
  runtime?: RuntimeAuthorityEvidence | null;
  authorizationChanges?: AuthorizationChangeEvidence[];
  delegatedSubject?: DelegatedSubjectEvidence | null;
  policyReference: string;
  effectiveAccessReference?: string | null;
  trustInvariantReferences: string[];
  outcomeEvidenceReferences: string[];
  remediationEvidenceReferences?: string[];
  retrospectiveReview?: RetrospectiveToolReviewEvidence | null;
};

export type AuthorityIntegrityFinding = {
  code: AuthorityIntegrityFindingCode;
  parameterName: string | null;
  evidenceReferences: string[];
  malicious: false;
};

export type AuthorityGraphProjection = {
  nodes: Array<{ nodeType: string; externalId: string; domainKey: string; label: string; metadata: Record<string, unknown> }>;
  edges: Array<{ fromNodeType: string; fromExternalId: string; toNodeType: string; toExternalId: string; edgeType: "ASSERTS" | "DERIVED_FROM" | "OBSERVED_BY" | "AUTHORIZED_BY" | "PARTICIPATED_IN" | "APPLIES_TO" | "SUPERSEDES" | "REVOKES" | "CONFLICTS_WITH" | "SUPPORTED" | "CHALLENGED" | "RESULTED_IN" | "TRIGGERED" | "CORRELATED_WITH" | "REPLAYED_AS" }>;
};

export type AuthorityIntegrityAssessment = Readonly<{
  snapshotVersion: "1.0";
  evaluatedAt: string;
  findings: readonly AuthorityIntegrityFinding[];
  requiredActions: readonly ("REVALIDATION_REQUIRED" | "REAPPROVAL_REQUIRED" | "NO_ACTION_REQUIRED")[];
  propagationState: AuthorizationPropagationState;
  toolSchemaChange: Readonly<{ changed: boolean; materialChanges: readonly string[] }>;
  actionTimeEvidence: Readonly<AuthorityIntegrityEvaluationInput>;
  providerNeutralEvidence: readonly { providerId: string; evidenceType: string; outcome: string; observedAt: string; evidenceDigest: string; metadata: Record<string, unknown> }[];
  graphProjection: Readonly<AuthorityGraphProjection>;
  replayEvents: readonly { eventType: string; occurredAt: string; attribution: string; evidenceReferences: readonly string[]; details: Record<string, unknown> }[];
  trustMemoryEvents: readonly { eventId: string; eventType: string; occurredAt: string; evidenceReferences: readonly string[] }[];
}>;

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function assertNoSecrets(value: unknown, path = "authorityIntegrity") {
  if (Array.isArray(value)) return value.forEach((item, index) => assertNoSecrets(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (sensitiveKey.test(key)) throw new TypeError(`Raw secrets are forbidden in ${path}.${key}.`);
      assertNoSecrets(child, `${path}.${key}`);
    }
  } else if (typeof value === "string" && sensitiveValue.test(value)) {
    throw new TypeError(`Secret-like values are forbidden in ${path}.`);
  }
}

function finding(code: AuthorityIntegrityFindingCode, parameterName: string | null, evidenceReferences: string[]): AuthorityIntegrityFinding {
  return { code, parameterName, evidenceReferences: [...new Set(evidenceReferences.filter(Boolean))], malicious: false };
}

function compareToolSchemas(previous: ToolSecuritySchemaEvidence | null | undefined, current: ToolSecuritySchemaEvidence) {
  if (!previous || previous.schemaDigest === current.schemaDigest) return { changed: false, materialChanges: [] as string[] };
  const before = new Map(previous.parameterSchema.map((item) => [item.parameterName, item]));
  const materialChanges: string[] = [];
  for (const field of current.parameterSchema) {
    const prior = before.get(field.parameterName);
    if (!prior && current.securityCriticalFields.includes(field.parameterName)) materialChanges.push(`SECURITY_CRITICAL_FIELD_ADDED:${field.parameterName}`);
    else if (prior && hashCanonical(prior) !== hashCanonical(field)) materialChanges.push(`PARAMETER_SECURITY_CHANGED:${field.parameterName}`);
  }
  if (hashCanonical(previous.securityCriticalFields) !== hashCanonical(current.securityCriticalFields)) materialChanges.push("SECURITY_CRITICAL_FIELDS_CHANGED");
  return { changed: true, materialChanges: [...new Set(materialChanges)].sort() };
}

function propagationState(changes: readonly AuthorizationChangeEvidence[]): AuthorizationPropagationState {
  if (!changes.length) return "insufficient_evidence";
  if (changes.some((item) => item.runtimeObservation === "conflicting" || item.destinationObservation === "conflicting")) return "conflicting";
  if (changes.some((item) => item.destinationObservation === "old_authority_accepted")) return "failed";
  if (changes.every((item) => item.independentlyConfirmed && item.destinationObservation === "old_authority_rejected")) return "independently_confirmed";
  if (changes.every((item) => item.destinationObservation === "old_authority_rejected")) return "destination_rejects_old_authority";
  if (changes.some((item) => item.destinationObservation === "old_authority_rejected" || item.runtimeObservation === "old_authority_rejected")) return "downstream_update_observed";
  if (changes.every((item) => item.providerReportedApplied)) return "provider_reports_applied";
  if (changes.some((item) => item.receivingProvider)) return "provider_acknowledged";
  return "change_received";
}

function buildGraph(input: AuthorityIntegrityEvaluationInput, findings: AuthorityIntegrityFinding[]): AuthorityGraphProjection {
  const nodes: AuthorityGraphProjection["nodes"] = [];
  const edges: AuthorityGraphProjection["edges"] = [];
  const addNode = (nodeType: string, externalId: string | null | undefined, label: string, metadata: Record<string, unknown> = {}) => {
    if (!externalId || nodes.some((node) => node.nodeType === nodeType && node.externalId === externalId)) return;
    nodes.push({ nodeType, externalId, domainKey: "AUTHORITY", label, metadata });
  };
  const addEdge = (fromNodeType: string, fromExternalId: string | null | undefined, toNodeType: string, toExternalId: string | null | undefined, edgeType: AuthorityGraphProjection["edges"][number]["edgeType"]) => {
    if (fromExternalId && toExternalId && !edges.some((edge) => edge.fromNodeType === fromNodeType && edge.fromExternalId === fromExternalId && edge.toNodeType === toNodeType && edge.toExternalId === toExternalId && edge.edgeType === edgeType)) edges.push({ fromNodeType, fromExternalId, toNodeType, toExternalId, edgeType });
  };
  addNode("PRINCIPAL", input.principalReference, "Originating principal");
  addNode("AGENT", input.agentPassportReference, "Agent Passport");
  addNode("AUTHORITY", input.authorityLineageReference, "Authority Lineage");
  addNode("TOOL", input.toolSchema.toolId, "Consequential tool");
  addNode("TOOL_VERSION", `${input.toolSchema.toolId}:${input.toolSchema.toolVersion}`, "Tool version", { schemaDigest: input.toolSchema.schemaDigest });
  addNode("ACTION", input.actionId, "Consequential action");
  addEdge("PRINCIPAL", input.principalReference, "AGENT", input.agentPassportReference, "AUTHORIZED_BY");
  addEdge("AGENT", input.agentPassportReference, "AUTHORITY", input.authorityLineageReference, "AUTHORIZED_BY");
  addEdge("AUTHORITY", input.authorityLineageReference, "ACTION", input.actionId, "AUTHORIZED_BY");
  addEdge("TOOL_VERSION", `${input.toolSchema.toolId}:${input.toolSchema.toolVersion}`, "TOOL", input.toolSchema.toolId, "DERIVED_FROM");
  addEdge("AGENT", input.agentPassportReference, "ACTION", input.actionId, "PARTICIPATED_IN");
  for (const parameter of input.parameters) {
    const parameterId = `${input.actionId}:parameter:${parameter.parameterName}`;
    const provenanceId = `${parameterId}:provenance:${parameter.parameterProvenance}`;
    addNode("PARAMETER", parameterId, parameter.parameterName, { category: parameter.parameterCategory, materiality: parameter.materiality, value: parameter.valueDigestOrMaskedValue });
    addNode("PARAMETER_PROVENANCE", provenanceId, parameter.parameterProvenance, { configurationPinning: parameter.configurationPinning });
    addEdge("PARAMETER", parameterId, "ACTION", input.actionId, "APPLIES_TO");
    addEdge("PARAMETER_PROVENANCE", provenanceId, "PARAMETER", parameterId, "ASSERTS");
  }
  if (input.delegatedSubject?.delegationEvidence) {
    addNode("DELEGATION", input.delegatedSubject.delegationEvidence, "Delegated subject");
    addEdge("PRINCIPAL", input.principalReference, "DELEGATION", input.delegatedSubject.delegationEvidence, "ASSERTS");
    addEdge("DELEGATION", input.delegatedSubject.delegationEvidence, "AGENT", input.agentPassportReference, "AUTHORIZED_BY");
  }
  if (input.credentialDestination?.credentialReference) addNode("CREDENTIAL", input.credentialDestination.credentialReference, "Credential reference");
  if (input.runtime) addNode("RUNTIME", input.runtime.runtimeSession, input.runtime.runtimeProvider, { instance: input.runtime.runtimeInstance, enforcementResult: input.runtime.enforcementResult });
  if (input.credentialDestination?.actualDestination) addNode("DESTINATION", input.credentialDestination.actualDestination, "Observed destination");
  if (input.runtime) addEdge("RUNTIME", input.runtime.runtimeSession, "ACTION", input.actionId, "OBSERVED_BY");
  if (input.credentialDestination?.credentialReference) addEdge("CREDENTIAL", input.credentialDestination.credentialReference, "ACTION", input.actionId, "AUTHORIZED_BY");
  if (input.credentialDestination?.actualDestination) addEdge("DESTINATION", input.credentialDestination.actualDestination, "ACTION", input.actionId, "OBSERVED_BY");
  for (const change of input.authorizationChanges ?? []) {
    addNode("AUTHORIZATION_CHANGE", change.changeId, change.changeType, { propagationState: propagationState([change]) });
    addEdge("AUTHORIZATION_CHANGE", change.changeId, "AUTHORITY", input.authorityLineageReference, "REVOKES");
  }
  for (const reference of input.remediationEvidenceReferences ?? []) {
    addNode("REMEDIATION", reference, "Remediation evidence");
    addEdge("REMEDIATION", reference, "AUTHORIZATION_CHANGE", input.authorizationChanges?.[0]?.changeId, "TRIGGERED");
  }
  for (const reference of input.outcomeEvidenceReferences) {
    addNode("OUTCOME", reference, "Outcome evidence");
    addEdge("ACTION", input.actionId, "OUTCOME", reference, "RESULTED_IN");
  }
  for (const item of findings) {
    const findingId = `${input.actionId}:finding:${item.code}:${item.parameterName ?? "action"}`;
    addNode("EVIDENCE_REFERENCE", findingId, item.code, { parameterName: item.parameterName, malicious: false });
    addEdge("EVIDENCE_REFERENCE", findingId, "ACTION", input.actionId, "CHALLENGED");
  }
  return { nodes, edges };
}

export function evaluateAuthorityIntegrity(input: AuthorityIntegrityEvaluationInput): AuthorityIntegrityAssessment {
  assertNoSecrets(input);
  if (input.enterpriseId !== input.tenant.authoritativeTenant) throw new Error("AUTHORITY_INTEGRITY_TENANT_SCOPE_MISMATCH");
  if (input.toolSchema.schemaDigest !== hashCanonical({ parameterSchema: input.toolSchema.parameterSchema, securityCriticalFields: input.toolSchema.securityCriticalFields })) throw new Error("TOOL_SECURITY_SCHEMA_DIGEST_INVALID");
  const schemaByName = new Map(input.toolSchema.parameterSchema.map((item) => [item.parameterName, item]));
  const findings: AuthorityIntegrityFinding[] = [];
  for (const parameter of input.parameters) {
    const policy = schemaByName.get(parameter.parameterName);
    if (!policy) continue;
    const requiresTrustedSource = policy.allowedProvenanceClasses.some((item) => trustedNonModelProvenance.has(item)) && !policy.allowedProvenanceClasses.includes("model_controlled");
    const runtimeOverridesModel = input.runtime?.overriddenParameterNames.includes(parameter.parameterName) === true;
    if (input.toolSchema.securityCriticalFields.includes(parameter.parameterName) && parameter.parameterProvenance === "model_controlled" && requiresTrustedSource && !runtimeOverridesModel) {
      findings.push(finding("MODEL_CONTROLLED_SECURITY_BOUNDARY", parameter.parameterName, [parameter.policyReference, input.toolSchema.schemaDigest]));
    }
    if (parameter.parameterCategory === "consent_boundary" && parameter.parameterProvenance === "model_controlled" && input.humanApproval?.bypassCapableParameter === parameter.parameterName) {
      findings.push(finding("CONSENT_BOUNDARY_MODEL_CONTROLLED", parameter.parameterName, [input.humanApproval.signedIntentReference, parameter.policyReference]));
    }
  }
  const tenantValues = [input.tenant.runtimeTenant, input.tenant.requestedTenant, input.tenant.modelSuppliedTenant, input.tenant.destinationTenant].filter(Boolean);
  if (tenantValues.some((value) => value !== input.tenant.authoritativeTenant) || input.tenant.authoritativeWorkspace !== input.enterpriseId) {
    findings.push(finding("TENANT_BOUNDARY_MISMATCH", "tenant", [input.authorityLineageReference, input.tenant.sourceIdentity]));
  }
  const destination = input.credentialDestination;
  if (destination?.proxyOrIntermediary && destination.proxyProvenance === "model_controlled") findings.push(finding("MODEL_CONTROLLED_PROXY", "proxy", [input.authorityLineageReference]));
  if (destination?.requestedDestination && destination.actualDestination && destination.requestedDestination !== destination.actualDestination) findings.push(finding("CREDENTIAL_DESTINATION_CHANGED", "destination", [input.authorityLineageReference]));
  if (destination?.credentialReference && destination.actualDestination && !destination.approvedDestinations.includes(destination.actualDestination)) findings.push(finding("CREDENTIAL_SENT_OUTSIDE_BOUND_DESTINATION", "destination", [destination.credentialReference, input.authorityLineageReference]));
  if (destination?.credentialReference && !destination.actualDestination) findings.push(finding("DESTINATION_AUTHORITY_UNRESOLVED", "destination", [destination.credentialReference]));
  const schemaChange = compareToolSchemas(input.previousToolSchema, input.toolSchema);
  if (schemaChange.changed && schemaChange.materialChanges.length) findings.push(finding("TOOL_SECURITY_SCHEMA_CHANGE", null, [input.previousToolSchema?.schemaDigest ?? "", input.toolSchema.schemaDigest]));
  const authorizationChanges = input.authorizationChanges ?? [];
  for (const change of authorizationChanges) {
    const postChangeUse = change.postChangeUseObservedAt && Date.parse(change.postChangeUseObservedAt) > Date.parse(change.effectiveAt);
    if (postChangeUse && (change.runtimeObservation === "old_authority_accepted" || change.destinationObservation === "old_authority_accepted")) findings.push(finding("STALE_AUTHORITY_STILL_ACTIVE", null, change.evidenceReferences));
  }
  if (input.delegatedSubject && (!input.delegatedSubject.originatingHuman && !input.delegatedSubject.originatingSystem || !input.delegatedSubject.delegationEvidence || !input.delegatedSubject.delegatedSubject)) findings.push(finding("DELEGATED_SUBJECT_CONTEXT_LOST", null, [input.agentPassportReference, input.authorityLineageReference]));
  if (input.retrospectiveReview && input.retrospectiveReview.affectedToolId === input.toolSchema.toolId && input.retrospectiveReview.affectedVersions.includes(input.toolSchema.toolVersion)) findings.push(finding("RETROSPECTIVE_TOOL_AUTHORITY_REVIEW_RECOMMENDED", null, [input.retrospectiveReview.advisoryReference, input.toolSchema.schemaDigest]));
  const materialTrustedBoundary = input.parameters.some((item) => item.materiality !== "ordinary" && trustedNonModelProvenance.has(item.parameterProvenance));
  const approvalChanged = Boolean(input.humanApproval?.consentRequired && materialTrustedBoundary && input.humanApproval.approvedParameterDigest !== input.humanApproval.finalParameterDigest);
  const requiredActions = new Set<"REVALIDATION_REQUIRED" | "REAPPROVAL_REQUIRED" | "NO_ACTION_REQUIRED">();
  if (schemaChange.materialChanges.length) requiredActions.add("REVALIDATION_REQUIRED");
  if (approvalChanged || findings.some((item) => item.code === "CONSENT_BOUNDARY_MODEL_CONTROLLED") || schemaChange.materialChanges.some((item) => /CONSENT|SECURITY_CRITICAL_FIELD_ADDED/.test(item))) requiredActions.add("REAPPROVAL_REQUIRED");
  if (!requiredActions.size) requiredActions.add("NO_ACTION_REQUIRED");
  const providerNeutralEvidence = findings.map((item) => ({
    providerId: input.parameters.find((parameter) => parameter.parameterName === item.parameterName)?.evidenceProvider ?? input.toolSchema.sourceProvider,
    evidenceType: item.code,
    outcome: "INCONCLUSIVE",
    observedAt: input.actionTimestamp,
    evidenceDigest: hashCanonical(item),
    metadata: { parameterName: item.parameterName, malicious: false, evidenceReferences: item.evidenceReferences },
  }));
  const replayEvents = [
    { eventType: "AUTHORITY_BOUND_PARAMETERS_SNAPSHOTTED", occurredAt: input.actionTimestamp, attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: [input.toolSchema.schemaDigest, input.authorityLineageReference], details: { toolId: input.toolSchema.toolId, toolVersion: input.toolSchema.toolVersion, parameterCount: input.parameters.length } },
    ...authorizationChanges.map((change) => ({ eventType: "AUTHORIZATION_CHANGE_PROPAGATION_OBSERVED", occurredAt: change.effectiveAt, attribution: "PROVIDER_CLAIM", evidenceReferences: change.evidenceReferences, details: { changeId: change.changeId, changeType: change.changeType, propagationState: propagationState([change]) } })),
    ...findings.map((item) => ({ eventType: item.code, occurredAt: input.actionTimestamp, attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: item.evidenceReferences, details: { parameterName: item.parameterName, malicious: false } })),
  ];
  const materialCodes = new Set<AuthorityIntegrityFindingCode>(AUTHORITY_INTEGRITY_FINDINGS);
  const trustMemoryEvents = [
    ...input.parameters.filter((item) => item.materiality !== "ordinary" && trustedNonModelProvenance.has(item.parameterProvenance)).map((item) => ({ eventId: hashCanonical([input.actionId, "AUTHORITY_BOUND_PARAMETER_ESTABLISHED", item.parameterName]), eventType: "AUTHORITY_BOUND_PARAMETER_ESTABLISHED", occurredAt: item.timestamp, evidenceReferences: [item.policyReference, input.toolSchema.schemaDigest] })),
    ...authorizationChanges.map((item) => ({ eventId: hashCanonical([input.actionId, "AUTHORIZATION_CHANGE", item.changeId]), eventType: propagationState([item]) === "destination_rejects_old_authority" || propagationState([item]) === "independently_confirmed" ? "AUTHORIZATION_DOWNGRADE_PROPAGATED" : "AUTHORIZATION_DOWNGRADE_REQUESTED", occurredAt: item.effectiveAt, evidenceReferences: item.evidenceReferences })),
    ...findings.filter((item) => materialCodes.has(item.code)).map((item) => ({ eventId: hashCanonical([input.actionId, item.code, item.parameterName]), eventType: item.code, occurredAt: input.actionTimestamp, evidenceReferences: item.evidenceReferences })),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.eventId === item.eventId) === index);
  const assessment = {
    snapshotVersion: "1.0" as const,
    evaluatedAt: input.actionTimestamp,
    findings,
    requiredActions: [...requiredActions],
    propagationState: propagationState(authorizationChanges),
    toolSchemaChange: schemaChange,
    actionTimeEvidence: structuredClone(input),
    providerNeutralEvidence,
    graphProjection: buildGraph(input, findings),
    replayEvents,
    trustMemoryEvents,
  };
  return deepFreeze(assessment) as AuthorityIntegrityAssessment;
}

export function appendAuthorityIntegrityEvidence(history: readonly AuthorityIntegrityAssessment[], assessment: AuthorityIntegrityAssessment) {
  if (history.some((item) => item.actionTimeEvidence.actionId === assessment.actionTimeEvidence.actionId && item.evaluatedAt === assessment.evaluatedAt)) return [...history];
  return [...history, assessment];
}

export function mapProviderNeutralIdentityAuthorityEvidence(input: {
  category: ProviderNeutralIdentityAuthorityCategory;
  providerId: string;
  subjectReference: string;
  evidenceReference: string;
  evidenceDigest: string;
  observedAt: string;
}) {
  assertNoSecrets(input);
  const authorityCategories = new Set<ProviderNeutralIdentityAuthorityCategory>(["agent_authorization", "authorization_policy", "authorization_change", "credential_revocation", "privilege_attenuation"]);
  const passportCategories = new Set<ProviderNeutralIdentityAuthorityCategory>(["agent_identifier", "agent_credential", "credential_provisioning", "agent_authentication", "delegated_subject", "posture_assessment"]);
  return deepFreeze({
    providerEvidence: { providerId: input.providerId, evidenceType: input.category, subjectReference: input.subjectReference, evidenceReference: input.evidenceReference, evidenceDigest: input.evidenceDigest, observedAt: input.observedAt },
    existingSurfaceMappings: {
      agentPassport: passportCategories.has(input.category),
      authorityLineage: authorityCategories.has(input.category),
      evidenceGraph: true,
      replay: true,
      trustMemory: ["authorization_change", "credential_revocation", "privilege_attenuation", "remediation"].includes(input.category),
    },
    claims: { aimsImplementation: false, ietfCompliance: false, wimseImplementation: false, spiffeImplementation: false },
  });
}
