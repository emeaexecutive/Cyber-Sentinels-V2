import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export const PARAMETER_PROVENANCE_CLASSES = [
  "model_controlled", "user_supplied", "human_bound", "authority_bound", "policy_bound",
  "provider_bound", "runtime_derived", "configuration_bound", "destination_derived", "unknown",
] as const;
export type ParameterProvenance = (typeof PARAMETER_PROVENANCE_CLASSES)[number];

export const AUTHORITY_PARAMETER_PROVENANCE_CLASSES = [
  "AUTHORITY_BOUND", "POLICY_BOUND", "HUMAN_BOUND", "RUNTIME_DERIVED", "PROVIDER_BOUND",
  "MODEL_PROPOSED", "USER_SUPPLIED", "SYSTEM_SUPPLIED", "UNKNOWN",
] as const;
export type AuthorityParameterProvenance = (typeof AUTHORITY_PARAMETER_PROVENANCE_CLASSES)[number];

export const PARAMETER_AUTHORITY_STATES = [
  "MATCH", "SUPPORTED", "OUT_OF_SCOPE", "PROVENANCE_MISMATCH", "UNRESOLVED", "CONFLICTING", "INSUFFICIENT_EVIDENCE",
] as const;
export type ParameterAuthorityState = (typeof PARAMETER_AUTHORITY_STATES)[number];

export const AUTHORIZATION_PROPAGATION_ASSURANCE_STATES = [
  "PROPAGATION_PENDING", "PROPAGATION_CONFIRMED", "PARTIAL_PROPAGATION", "STALE_AUTHORITY_POSSIBLE",
  "STALE_AUTHORITY_CONFIRMED", "PROPAGATION_CONFLICT", "INSUFFICIENT_EVIDENCE", "UNDER_REVIEW",
] as const;
export type AuthorizationPropagationAssuranceState = (typeof AUTHORIZATION_PROPAGATION_ASSURANCE_STATES)[number];

export const AUTHORITY_PREVENTATIVE_CONTROLS = [
  "PIN_PARAMETER_TO_AUTHORITY", "PIN_DESTINATION", "REQUIRE_HUMAN_BINDING", "REQUIRE_RUNTIME_DERIVATION",
  "REDUCE_AUTHORITY", "RESTORE_POLICY_BINDING", "VERIFY_PARAMETER_PROVENANCE", "REQUALIFY_TOOL",
] as const;
export type AuthorityPreventativeControl = (typeof AUTHORITY_PREVENTATIVE_CONTROLS)[number];

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
  "AUTHORITY_PARAMETER_DRIFT", "DESTINATION_BINDING_LOST", "UNRESOLVED_PARAMETER_PROVENANCE",
  "STALE_AUTHORITY_POSSIBLE", "RUNTIME_AUTHORITY_MISMATCH", "DESTINATION_AUTHORITY_MISMATCH",
  "AUTHORITY_PROPAGATION_UNRESOLVED", "PROVIDER_CONFLICT",
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
const sensitiveKey = /(?:raw|plain(?:text)?|clear(?:text)?).*(?:credential|secret|token|password)|(?:password|secret|token|apiKey)Value|(?:access|refresh|api|auth|bearer)[_-]?token/i;
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

export type ParameterAuthorityContract = {
  parameterName: string;
  parameterClass: SecurityBoundaryParameterType;
  expectedProvenance: AuthorityParameterProvenance[];
  authorityReference: string;
  allowedValues: string[];
  allowedScope: string[];
  runtimeBinding: string | null;
  humanBinding: string | null;
  destinationBinding: string | null;
  validationRequirement: string | null;
  securityCritical: boolean;
};

export type ParameterAuthorityObservation = {
  parameterName: string;
  observedProvenance: AuthorityParameterProvenance;
  valueDigestOrMaskedValue: string;
  scopeReference: string | null;
  runtimeBinding: string | null;
  humanBinding: string | null;
  destinationBinding: string | null;
  evidenceProvider: string;
  evidenceReference: string;
  observedAt: string;
  confidence: number;
  limitations: string[];
  providerAssertions?: Array<{
    providerId: string;
    provenance: AuthorityParameterProvenance;
    valueDigestOrMaskedValue: string;
    evidenceReference: string;
  }>;
};

export type ParameterAuthorityAssessment = {
  parameterName: string;
  parameterClass: SecurityBoundaryParameterType;
  securityCritical: boolean;
  expectedProvenance: AuthorityParameterProvenance[];
  observedProvenance: AuthorityParameterProvenance | null;
  state: ParameterAuthorityState;
  authorityReference: string;
  evidenceReferences: string[];
  limitations: string[];
  modelControlExplicitlyPermitted: boolean;
  recommendedControl: AuthorityPreventativeControl | null;
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
  runtimeId?: string;
  runtimeType?: string;
  workloadId?: string | null;
  agentId?: string | null;
  sessionId?: string | null;
  authorityReference?: string;
  authorityVersion?: string;
  effectivePermissions?: string[];
  effectiveScope?: string[];
  credentialReferenceDigest?: string | null;
  credentialVersion?: string | null;
  credentialExpiry?: string | null;
  delegatedPrincipal?: string | null;
  destinationScope?: string[];
  measurementTime?: string;
  provider?: string;
  confidence?: number;
  limitations?: string[];
  declaredAuthority?: string[];
  controlPlaneAuthority?: string[];
  destinationEffectiveAuthority?: string[] | null;
};

export type RuntimeAuthorityComparison = {
  declaredAuthority: string[];
  controlPlaneAuthority: string[];
  runtimeEffectiveAuthority: string[];
  destinationEffectiveAuthority: string[] | null;
  runtimeState: "MATCH" | "MISMATCH" | "INSUFFICIENT_EVIDENCE";
  destinationState: "MATCH" | "MISMATCH" | "INSUFFICIENT_EVIDENCE";
  authorityReference: string;
  authorityVersion: string | null;
  runtimeEvidenceReference: string;
  credentialReferenceDigest: string | null;
  measurementTime: string;
  confidence: number;
  limitations: string[];
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
  authorityVersionBefore?: string | null;
  authorityVersionAfter?: string | null;
  requestedAt?: string | null;
  controlPlaneAcknowledgedAt?: string | null;
  runtimeUpdatedAt?: string | null;
  credentialUpdatedAt?: string | null;
  downstreamUpdatedAt?: string | null;
  destinationConfirmedAt?: string | null;
};

export type AuthorizationPropagationAssurance = {
  state: AuthorizationPropagationAssuranceState;
  timeline: Array<{
    changeId: string;
    authorityVersionBefore: string | null;
    authorityVersionAfter: string | null;
    requestedAt: string;
    controlPlaneAcknowledgedAt: string | null;
    runtimeUpdatedAt: string | null;
    credentialUpdatedAt: string | null;
    downstreamUpdatedAt: string | null;
    destinationConfirmedAt: string | null;
    evidenceReferences: string[];
  }>;
  limitations: string[];
};

export type AimsCompatibleEvidence = {
  enterpriseId: string;
  provider: string;
  source: string;
  evidenceReference: string;
  observedAt: string;
  correlationId: string;
  agentIdentity: string;
  principal: string;
  delegator: string | null;
  authorityGrant: string;
  authorityScope: string[];
  authorizationVersion: string;
  delegationChain: string[];
  tool: string;
  action: string;
  resource: string;
  executionContext: string;
  credentialReferenceDigest: string | null;
  policy: string;
  authorizationChange: "GRANT" | "RENEWAL" | "SCOPE_CHANGE" | "DOWNGRADE" | "REVOCATION" | "EXPIRY" | "CREDENTIAL_ROTATION" | "POLICY_CHANGE" | null;
  destination: string;
  executionResult: string | null;
  parameterBindings: Array<{ parameterName: string; provenance: AuthorityParameterProvenance; valueDigestOrMaskedValue: string }>;
};

export type AimsCompatibilityMapping = {
  compatibilityVersion: "1.0";
  provider: string;
  source: string;
  evidenceReference: string;
  correlationId: string;
  canonicalMappings: {
    agentIdentity: string;
    principal: string;
    delegator: string | null;
    authorityReference: string;
    authorityScope: string[];
    authorizationVersion: string;
    delegationChain: string[];
    tool: string;
    action: string;
    resource: string;
    executionContext: string;
    credentialReferenceDigest: string | null;
    policyReference: string;
    authorizationChange: AimsCompatibleEvidence["authorizationChange"];
    destination: string;
    executionResult: string | null;
    parameterBindings: AimsCompatibleEvidence["parameterBindings"];
  };
  providerIsCanonical: false;
  aimsDependency: false;
  missingHopsInvented: false;
  evidenceDigest: string;
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
  parameterAuthorityContracts?: ParameterAuthorityContract[];
  parameterAuthorityObservations?: ParameterAuthorityObservation[];
  aimsEvidence?: AimsCompatibleEvidence[];
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
  parameterAuthority: readonly ParameterAuthorityAssessment[];
  authorizationPropagation: Readonly<AuthorizationPropagationAssurance>;
  runtimeAuthority: Readonly<RuntimeAuthorityComparison> | null;
  aimsCompatibility: readonly AimsCompatibilityMapping[];
  minimumPreventativeControls: readonly AuthorityPreventativeControl[];
  receiptSummary: Readonly<{
    authorityVersion: string | null;
    delegatedPrincipal: string | null;
    runtimeAuthorityEvidenceReference: string | null;
    destinationAuthorityEvidenceReference: string | null;
    parameterProvenanceSummary: readonly { parameterName: string; state: ParameterAuthorityState; provenance: AuthorityParameterProvenance | null }[];
    propagationState: AuthorizationPropagationAssuranceState;
    destinationAuthorityState: RuntimeAuthorityComparison["destinationState"] | null;
    conflicts: readonly string[];
    limitations: readonly string[];
  }>;
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

const legacyProvenanceMap: Record<ParameterProvenance, AuthorityParameterProvenance> = {
  model_controlled: "MODEL_PROPOSED",
  user_supplied: "USER_SUPPLIED",
  human_bound: "HUMAN_BOUND",
  authority_bound: "AUTHORITY_BOUND",
  policy_bound: "POLICY_BOUND",
  provider_bound: "PROVIDER_BOUND",
  runtime_derived: "RUNTIME_DERIVED",
  configuration_bound: "SYSTEM_SUPPLIED",
  destination_derived: "SYSTEM_SUPPLIED",
  unknown: "UNKNOWN",
};

function sameStringSet(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && [...new Set(left)].sort().every((item, index) => item === [...new Set(right)].sort()[index]);
}

function defaultParameterAuthorityContracts(input: AuthorityIntegrityEvaluationInput): ParameterAuthorityContract[] {
  return input.toolSchema.parameterSchema.map((policy) => ({
    parameterName: policy.parameterName,
    parameterClass: policy.parameterCategory,
    expectedProvenance: [...new Set(policy.allowedProvenanceClasses.map((item) => legacyProvenanceMap[item]))],
    authorityReference: input.authorityLineageReference,
    allowedValues: [],
    allowedScope: [],
    runtimeBinding: policy.defaultState === "server_resolved" ? input.runtime?.runtimeSession ?? "runtime:server_resolved" : null,
    humanBinding: policy.parameterCategory === "consent_boundary" ? input.humanApproval?.humanIdentityReference ?? null : null,
    destinationBinding: policy.parameterCategory === "destination_boundary" ? input.credentialDestination?.requestedDestination ?? input.credentialDestination?.approvedDestinations[0] ?? null : null,
    validationRequirement: policy.required ? "REQUIRED" : null,
    securityCritical: input.toolSchema.securityCriticalFields.includes(policy.parameterName),
  }));
}

function defaultParameterAuthorityObservations(input: AuthorityIntegrityEvaluationInput): ParameterAuthorityObservation[] {
  return input.parameters.map((parameter) => ({
    parameterName: parameter.parameterName,
    observedProvenance: legacyProvenanceMap[parameter.parameterProvenance],
    valueDigestOrMaskedValue: parameter.valueDigestOrMaskedValue,
    scopeReference: null,
    runtimeBinding: parameter.configurationPinning === "runtime_context_derived" || parameter.configurationPinning === "server_side_derived" ? input.runtime?.runtimeSession ?? "runtime:derived" : null,
    humanBinding: parameter.parameterProvenance === "human_bound" ? input.humanApproval?.humanIdentityReference ?? null : null,
    destinationBinding: parameter.parameterCategory === "destination_boundary" ? input.credentialDestination?.actualDestination ?? input.credentialDestination?.requestedDestination ?? null : null,
    evidenceProvider: parameter.evidenceProvider,
    evidenceReference: parameter.policyReference,
    observedAt: parameter.timestamp,
    confidence: parameter.parameterProvenance === "unknown" ? 0 : 1,
    limitations: parameter.parameterProvenance === "unknown" ? ["Parameter provenance was not established."] : [],
  }));
}

function assessParameterAuthority(input: AuthorityIntegrityEvaluationInput): ParameterAuthorityAssessment[] {
  const contracts = input.parameterAuthorityContracts ?? defaultParameterAuthorityContracts(input);
  const observations = input.parameterAuthorityObservations ?? defaultParameterAuthorityObservations(input);
  const observationsByName = new Map(observations.map((item) => [item.parameterName, item]));
  const assessments = contracts.map((contract) => {
    const observation = observationsByName.get(contract.parameterName);
    const explicitModelControl = contract.expectedProvenance.includes("MODEL_PROPOSED");
    let state: ParameterAuthorityState = "MATCH";
    if (!observation) state = contract.validationRequirement === "REQUIRED" ? "INSUFFICIENT_EVIDENCE" : "UNRESOLVED";
    else if (observation.providerAssertions && new Set(observation.providerAssertions.map((item) => `${item.provenance}:${item.valueDigestOrMaskedValue}`)).size > 1) state = "CONFLICTING";
    else if (observation.observedProvenance === "UNKNOWN") state = "UNRESOLVED";
    else if (!contract.expectedProvenance.includes(observation.observedProvenance)) state = "PROVENANCE_MISMATCH";
    else if (contract.allowedValues.length && !contract.allowedValues.includes(observation.valueDigestOrMaskedValue)) state = "OUT_OF_SCOPE";
    else if (contract.allowedScope.length && (!observation.scopeReference || !contract.allowedScope.includes(observation.scopeReference))) state = "OUT_OF_SCOPE";
    else if (contract.runtimeBinding && contract.runtimeBinding !== observation.runtimeBinding) state = "OUT_OF_SCOPE";
    else if (contract.humanBinding && contract.humanBinding !== observation.humanBinding) state = "OUT_OF_SCOPE";
    else if (contract.destinationBinding && contract.destinationBinding !== observation.destinationBinding) state = "OUT_OF_SCOPE";
    else if (observation.observedProvenance === "MODEL_PROPOSED" && explicitModelControl) state = "SUPPORTED";
    const recommendedControl: AuthorityPreventativeControl | null = state === "PROVENANCE_MISMATCH"
      ? contract.expectedProvenance.includes("AUTHORITY_BOUND") ? "PIN_PARAMETER_TO_AUTHORITY" : contract.expectedProvenance.includes("RUNTIME_DERIVED") ? "REQUIRE_RUNTIME_DERIVATION" : contract.expectedProvenance.includes("HUMAN_BOUND") ? "REQUIRE_HUMAN_BINDING" : "PIN_PARAMETER_TO_AUTHORITY"
      : state === "OUT_OF_SCOPE" && contract.destinationBinding ? "PIN_DESTINATION"
        : state === "UNRESOLVED" || state === "INSUFFICIENT_EVIDENCE" || state === "CONFLICTING" ? "VERIFY_PARAMETER_PROVENANCE"
          : null;
    return {
      parameterName: contract.parameterName,
      parameterClass: contract.parameterClass,
      securityCritical: contract.securityCritical,
      expectedProvenance: [...contract.expectedProvenance],
      observedProvenance: observation?.observedProvenance ?? null,
      state,
      authorityReference: contract.authorityReference,
      evidenceReferences: [...new Set([observation?.evidenceReference ?? "", ...(observation?.providerAssertions?.map((item) => item.evidenceReference) ?? [])].filter(Boolean))],
      limitations: [...new Set(observation?.limitations ?? ["No parameter observation was supplied."])],
      modelControlExplicitlyPermitted: explicitModelControl,
      recommendedControl,
    } satisfies ParameterAuthorityAssessment;
  });
  for (const observation of observations) {
    if (contracts.some((contract) => contract.parameterName === observation.parameterName)) continue;
    assessments.push({ parameterName: observation.parameterName, parameterClass: "other", securityCritical: false, expectedProvenance: [], observedProvenance: observation.observedProvenance, state: "UNRESOLVED", authorityReference: input.authorityLineageReference, evidenceReferences: [observation.evidenceReference], limitations: ["No parameter authority contract was supplied."], modelControlExplicitlyPermitted: false, recommendedControl: "VERIFY_PARAMETER_PROVENANCE" });
  }
  return assessments;
}

function assessRuntimeAuthority(input: AuthorityIntegrityEvaluationInput): RuntimeAuthorityComparison | null {
  const runtime = input.runtime;
  if (!runtime) return null;
  const declaredAuthority = [...new Set(runtime.declaredAuthority ?? runtime.authorityCeiling)];
  const controlPlaneAuthority = [...new Set(runtime.controlPlaneAuthority ?? runtime.authorityCeiling)];
  const runtimeEffectiveAuthority = [...new Set(runtime.effectivePermissions ?? runtime.authorityCeiling)];
  const destinationEffectiveAuthority = runtime.destinationEffectiveAuthority === null || runtime.destinationEffectiveAuthority === undefined
    ? null
    : [...new Set(runtime.destinationEffectiveAuthority)];
  return {
    declaredAuthority,
    controlPlaneAuthority,
    runtimeEffectiveAuthority,
    destinationEffectiveAuthority,
    runtimeState: runtimeEffectiveAuthority.length ? sameStringSet(controlPlaneAuthority, runtimeEffectiveAuthority) ? "MATCH" : "MISMATCH" : "INSUFFICIENT_EVIDENCE",
    destinationState: destinationEffectiveAuthority === null || !destinationEffectiveAuthority.length ? "INSUFFICIENT_EVIDENCE" : sameStringSet(controlPlaneAuthority, destinationEffectiveAuthority) ? "MATCH" : "MISMATCH",
    authorityReference: runtime.authorityReference ?? input.authorityLineageReference,
    authorityVersion: runtime.authorityVersion ?? null,
    runtimeEvidenceReference: `${runtime.provider ?? runtime.runtimeProvider}:${runtime.runtimeId ?? runtime.runtimeInstance}:${runtime.sessionId ?? runtime.runtimeSession}`,
    credentialReferenceDigest: runtime.credentialReferenceDigest ?? null,
    measurementTime: runtime.measurementTime ?? input.actionTimestamp,
    confidence: Math.max(0, Math.min(1, runtime.confidence ?? 1)),
    limitations: [...new Set(runtime.limitations ?? [])],
  };
}

function assessAuthorizationPropagation(changes: readonly AuthorizationChangeEvidence[]): AuthorizationPropagationAssurance {
  const timeline = changes.map((change) => ({
    changeId: change.changeId,
    authorityVersionBefore: change.authorityVersionBefore ?? null,
    authorityVersionAfter: change.authorityVersionAfter ?? null,
    requestedAt: change.requestedAt ?? change.effectiveAt,
    controlPlaneAcknowledgedAt: change.controlPlaneAcknowledgedAt ?? (change.receivingProvider ? change.effectiveAt : null),
    runtimeUpdatedAt: change.runtimeUpdatedAt ?? (change.runtimeObservation === "old_authority_rejected" ? change.postChangeUseObservedAt ?? change.effectiveAt : null),
    credentialUpdatedAt: change.credentialUpdatedAt ?? null,
    downstreamUpdatedAt: change.downstreamUpdatedAt ?? null,
    destinationConfirmedAt: change.destinationConfirmedAt ?? (change.destinationObservation === "old_authority_rejected" ? change.postChangeUseObservedAt ?? change.effectiveAt : null),
    evidenceReferences: [...new Set(change.evidenceReferences)],
  }));
  let state: AuthorizationPropagationAssuranceState = "INSUFFICIENT_EVIDENCE";
  const confirmedStale = changes.some((change) => Boolean(change.postChangeUseObservedAt) && Date.parse(change.postChangeUseObservedAt!) > Date.parse(change.effectiveAt) && (change.runtimeObservation === "old_authority_accepted" || change.destinationObservation === "old_authority_accepted"));
  const possibleStale = changes.some((change) => change.runtimeObservation === "old_authority_accepted" || change.destinationObservation === "old_authority_accepted");
  if (changes.some((change) => change.runtimeObservation === "conflicting" || change.destinationObservation === "conflicting")) state = "PROPAGATION_CONFLICT";
  else if (confirmedStale) state = "STALE_AUTHORITY_CONFIRMED";
  else if (possibleStale) state = "STALE_AUTHORITY_POSSIBLE";
  else if (changes.length && changes.every((change) => change.runtimeObservation === "old_authority_rejected" && change.destinationObservation === "old_authority_rejected")) state = "PROPAGATION_CONFIRMED";
  else if (changes.some((change) => change.runtimeObservation === "old_authority_rejected" || change.destinationObservation === "old_authority_rejected")) state = "PARTIAL_PROPAGATION";
  else if (changes.some((change) => change.providerReportedApplied || change.receivingProvider)) state = "PROPAGATION_PENDING";
  else if (changes.length) state = "UNDER_REVIEW";
  const limitations = [
    ...(!changes.length ? ["No authorization-change evidence was supplied."] : []),
    ...(changes.some((change) => change.providerReportedApplied && change.runtimeObservation === "not_observed") ? ["Control-plane acknowledgement is not runtime enforcement proof."] : []),
    ...(changes.some((change) => change.destinationObservation === "not_observed") ? ["Destination-effective authority is not confirmed."] : []),
  ];
  return { state, timeline, limitations: [...new Set(limitations)] };
}

export function mapAimsCompatibleEvidence(input: AimsCompatibleEvidence): AimsCompatibilityMapping {
  assertNoSecrets(input, "aimsCompatibility");
  const canonicalMappings = {
    agentIdentity: input.agentIdentity,
    principal: input.principal,
    delegator: input.delegator,
    authorityReference: input.authorityGrant,
    authorityScope: [...new Set(input.authorityScope)],
    authorizationVersion: input.authorizationVersion,
    delegationChain: [...input.delegationChain],
    tool: input.tool,
    action: input.action,
    resource: input.resource,
    executionContext: input.executionContext,
    credentialReferenceDigest: input.credentialReferenceDigest,
    policyReference: input.policy,
    authorizationChange: input.authorizationChange,
    destination: input.destination,
    executionResult: input.executionResult,
    parameterBindings: structuredClone(input.parameterBindings),
  };
  return deepFreeze({
    compatibilityVersion: "1.0" as const,
    provider: input.provider,
    source: input.source,
    evidenceReference: input.evidenceReference,
    correlationId: input.correlationId,
    canonicalMappings,
    providerIsCanonical: false as const,
    aimsDependency: false as const,
    missingHopsInvented: false as const,
    evidenceDigest: hashCanonical({ enterpriseId: input.enterpriseId, provider: input.provider, source: input.source, evidenceReference: input.evidenceReference, observedAt: input.observedAt, canonicalMappings }),
  });
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

function buildGraph(
  input: AuthorityIntegrityEvaluationInput,
  findings: AuthorityIntegrityFinding[],
  parameterAuthority: ParameterAuthorityAssessment[],
  runtimeAuthority: RuntimeAuthorityComparison | null,
  authorizationPropagation: AuthorizationPropagationAssurance,
  aimsCompatibility: AimsCompatibilityMapping[],
): AuthorityGraphProjection {
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
  for (const assessment of parameterAuthority) {
    const bindingId = `${input.actionId}:parameter-binding:${assessment.parameterName}`;
    addNode("AUTHORITY", assessment.authorityReference, "Parameter authority contract");
    addNode("PARAMETER_BINDING", bindingId, assessment.parameterName, { state: assessment.state, parameterClass: assessment.parameterClass, securityCritical: assessment.securityCritical, expectedProvenance: assessment.expectedProvenance, observedProvenance: assessment.observedProvenance });
    addEdge("AUTHORITY", assessment.authorityReference, "PARAMETER_BINDING", bindingId, "APPLIES_TO");
    addEdge("PARAMETER_BINDING", bindingId, "ACTION", input.actionId, assessment.state === "MATCH" || assessment.state === "SUPPORTED" ? "SUPPORTED" : "CHALLENGED");
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
  if (runtimeAuthority) {
    const authorityVersionId = `${runtimeAuthority.authorityReference}:version:${runtimeAuthority.authorityVersion ?? "unresolved"}`;
    const runtimeAuthorityId = `${input.actionId}:runtime-authority:${runtimeAuthority.runtimeEvidenceReference}`;
    const destinationAuthorityId = `${input.actionId}:destination-authority:${input.credentialDestination?.actualDestination ?? "unresolved"}`;
    addNode("AUTHORITY_VERSION", authorityVersionId, "Authority version", { authorityVersion: runtimeAuthority.authorityVersion, declaredAuthority: runtimeAuthority.declaredAuthority, controlPlaneAuthority: runtimeAuthority.controlPlaneAuthority });
    addNode("RUNTIME_AUTHORITY", runtimeAuthorityId, "Runtime-effective authority", { state: runtimeAuthority.runtimeState, effectiveAuthority: runtimeAuthority.runtimeEffectiveAuthority, confidence: runtimeAuthority.confidence });
    addNode("DESTINATION_AUTHORITY", destinationAuthorityId, "Destination-effective authority", { state: runtimeAuthority.destinationState, effectiveAuthority: runtimeAuthority.destinationEffectiveAuthority });
    addEdge("AUTHORITY_VERSION", authorityVersionId, "RUNTIME_AUTHORITY", runtimeAuthorityId, runtimeAuthority.runtimeState === "MATCH" ? "SUPPORTED" : "CHALLENGED");
    addEdge("RUNTIME_AUTHORITY", runtimeAuthorityId, "ACTION", input.actionId, "OBSERVED_BY");
    addEdge("DESTINATION_AUTHORITY", destinationAuthorityId, "ACTION", input.actionId, "OBSERVED_BY");
  }
  for (const item of authorizationPropagation.timeline) {
    const oldAuthorityId = `${input.authorityLineageReference}:version:${item.authorityVersionBefore ?? "before-unresolved"}`;
    const newAuthorityId = `${input.authorityLineageReference}:version:${item.authorityVersionAfter ?? "after-unresolved"}`;
    const propagationId = `${item.changeId}:runtime-propagation`;
    const confirmationId = `${item.changeId}:destination-confirmation`;
    addNode("AUTHORITY_VERSION", oldAuthorityId, "Previous authority", { version: item.authorityVersionBefore });
    addNode("AUTHORITY_VERSION", newAuthorityId, "Updated authority", { version: item.authorityVersionAfter });
    addNode("RUNTIME_PROPAGATION", propagationId, "Runtime propagation", { state: authorizationPropagation.state, runtimeUpdatedAt: item.runtimeUpdatedAt, credentialUpdatedAt: item.credentialUpdatedAt });
    addNode("DESTINATION_CONFIRMATION", confirmationId, "Destination confirmation", { confirmedAt: item.destinationConfirmedAt });
    addEdge("AUTHORITY_VERSION", oldAuthorityId, "AUTHORIZATION_CHANGE", item.changeId, "REVOKES");
    addEdge("AUTHORIZATION_CHANGE", item.changeId, "AUTHORITY_VERSION", newAuthorityId, "SUPERSEDES");
    addEdge("AUTHORITY_VERSION", newAuthorityId, "RUNTIME_PROPAGATION", propagationId, "TRIGGERED");
    addEdge("RUNTIME_PROPAGATION", propagationId, "DESTINATION_CONFIRMATION", confirmationId, item.destinationConfirmedAt ? "SUPPORTED" : "CHALLENGED");
  }
  for (const mapping of aimsCompatibility) {
    const delegationId = `${mapping.evidenceReference}:delegation`;
    addNode("PRINCIPAL", mapping.canonicalMappings.principal, "AIMS-compatible principal", { provider: mapping.provider });
    addNode("DELEGATION", delegationId, "AIMS-compatible delegation", { chain: mapping.canonicalMappings.delegationChain, source: mapping.source });
    addNode("AGENT", mapping.canonicalMappings.agentIdentity, "AIMS-compatible agent", { provider: mapping.provider });
    addEdge("PRINCIPAL", mapping.canonicalMappings.principal, "DELEGATION", delegationId, "ASSERTS");
    addEdge("DELEGATION", delegationId, "AGENT", mapping.canonicalMappings.agentIdentity, "AUTHORIZED_BY");
    addEdge("AGENT", mapping.canonicalMappings.agentIdentity, "ACTION", input.actionId, "PARTICIPATED_IN");
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
  if ((input.aimsEvidence ?? []).some((item) => item.enterpriseId !== input.enterpriseId)) throw new Error("AIMS_EVIDENCE_TENANT_SCOPE_MISMATCH");
  if (input.toolSchema.schemaDigest !== hashCanonical({ parameterSchema: input.toolSchema.parameterSchema, securityCriticalFields: input.toolSchema.securityCriticalFields })) throw new Error("TOOL_SECURITY_SCHEMA_DIGEST_INVALID");
  const schemaByName = new Map(input.toolSchema.parameterSchema.map((item) => [item.parameterName, item]));
  const findings: AuthorityIntegrityFinding[] = [];
  const parameterAuthority = assessParameterAuthority(input);
  const runtimeAuthority = assessRuntimeAuthority(input);
  const authorizationPropagation = assessAuthorizationPropagation(input.authorizationChanges ?? []);
  const aimsCompatibility = (input.aimsEvidence ?? []).map(mapAimsCompatibleEvidence);
  for (const assessment of parameterAuthority) {
    if (assessment.state === "CONFLICTING") findings.push(finding("PROVIDER_CONFLICT", assessment.parameterName, assessment.evidenceReferences));
    if (["UNRESOLVED", "INSUFFICIENT_EVIDENCE"].includes(assessment.state) && assessment.securityCritical) findings.push(finding("UNRESOLVED_PARAMETER_PROVENANCE", assessment.parameterName, assessment.evidenceReferences));
    if (assessment.state === "PROVENANCE_MISMATCH" && assessment.securityCritical && assessment.observedProvenance === "MODEL_PROPOSED" && !assessment.modelControlExplicitlyPermitted) findings.push(finding("MODEL_CONTROLLED_SECURITY_BOUNDARY", assessment.parameterName, assessment.evidenceReferences));
    else if (["PROVENANCE_MISMATCH", "OUT_OF_SCOPE"].includes(assessment.state) && assessment.securityCritical) findings.push(finding("AUTHORITY_PARAMETER_DRIFT", assessment.parameterName, assessment.evidenceReferences));
    if (assessment.parameterClass === "destination_boundary" && assessment.state === "OUT_OF_SCOPE") findings.push(finding("DESTINATION_BINDING_LOST", assessment.parameterName, assessment.evidenceReferences));
  }
  if (runtimeAuthority?.runtimeState === "MISMATCH") findings.push(finding("RUNTIME_AUTHORITY_MISMATCH", null, [runtimeAuthority.runtimeEvidenceReference]));
  if (runtimeAuthority?.destinationState === "MISMATCH") findings.push(finding("DESTINATION_AUTHORITY_MISMATCH", null, [runtimeAuthority.runtimeEvidenceReference]));
  if (authorizationPropagation.state === "STALE_AUTHORITY_POSSIBLE") findings.push(finding("STALE_AUTHORITY_POSSIBLE", null, authorizationPropagation.timeline.flatMap((item) => item.evidenceReferences)));
  if (["PROPAGATION_PENDING", "PARTIAL_PROPAGATION", "INSUFFICIENT_EVIDENCE", "UNDER_REVIEW"].includes(authorizationPropagation.state) && authorizationPropagation.timeline.length) findings.push(finding("AUTHORITY_PROPAGATION_UNRESOLVED", null, authorizationPropagation.timeline.flatMap((item) => item.evidenceReferences)));
  if (authorizationPropagation.state === "PROPAGATION_CONFLICT") findings.push(finding("PROVIDER_CONFLICT", null, authorizationPropagation.timeline.flatMap((item) => item.evidenceReferences)));
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
  const uniqueFindings = findings.filter((item, index, all) => all.findIndex((candidate) => candidate.code === item.code && candidate.parameterName === item.parameterName && hashCanonical(candidate.evidenceReferences) === hashCanonical(item.evidenceReferences)) === index);
  findings.splice(0, findings.length, ...uniqueFindings);
  const materialTrustedBoundary = input.parameters.some((item) => item.materiality !== "ordinary" && trustedNonModelProvenance.has(item.parameterProvenance));
  const approvalChanged = Boolean(input.humanApproval?.consentRequired && materialTrustedBoundary && input.humanApproval.approvedParameterDigest !== input.humanApproval.finalParameterDigest);
  const requiredActions = new Set<"REVALIDATION_REQUIRED" | "REAPPROVAL_REQUIRED" | "NO_ACTION_REQUIRED">();
  if (schemaChange.materialChanges.length) requiredActions.add("REVALIDATION_REQUIRED");
  if (approvalChanged || findings.some((item) => item.code === "CONSENT_BOUNDARY_MODEL_CONTROLLED") || schemaChange.materialChanges.some((item) => /CONSENT|SECURITY_CRITICAL_FIELD_ADDED/.test(item))) requiredActions.add("REAPPROVAL_REQUIRED");
  if (!requiredActions.size) requiredActions.add("NO_ACTION_REQUIRED");
  const providerNeutralEvidence = [
    ...findings.map((item) => ({
      providerId: input.parameters.find((parameter) => parameter.parameterName === item.parameterName)?.evidenceProvider ?? input.toolSchema.sourceProvider,
      evidenceType: item.code,
      outcome: "INCONCLUSIVE",
      observedAt: input.actionTimestamp,
      evidenceDigest: hashCanonical(item),
      metadata: { parameterName: item.parameterName, malicious: false, evidenceReferences: item.evidenceReferences },
    })),
    ...(runtimeAuthority ? [{
      providerId: input.runtime?.provider ?? input.runtime?.runtimeProvider ?? "runtime_unattributed",
      evidenceType: "RUNTIME_AUTHORITY_EVIDENCE",
      outcome: runtimeAuthority.runtimeState,
      observedAt: runtimeAuthority.measurementTime,
      evidenceDigest: hashCanonical(runtimeAuthority),
      metadata: { runtimeEvidenceReference: runtimeAuthority.runtimeEvidenceReference, destinationState: runtimeAuthority.destinationState, providerIsCanonical: false },
    }] : []),
    ...aimsCompatibility.map((item) => ({
      providerId: item.provider,
      evidenceType: "AIMS_COMPATIBLE_AUTHORITY_EXECUTION_EVIDENCE",
      outcome: "INCONCLUSIVE",
      observedAt: input.aimsEvidence?.find((evidence) => evidence.evidenceReference === item.evidenceReference)?.observedAt ?? input.actionTimestamp,
      evidenceDigest: item.evidenceDigest,
      metadata: { evidenceReference: item.evidenceReference, correlationId: item.correlationId, providerIsCanonical: false, aimsDependency: false },
    })),
  ];
  const replayEvents = [
    { eventType: "AUTHORITY_BOUND_PARAMETERS_SNAPSHOTTED", occurredAt: input.actionTimestamp, attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: [input.toolSchema.schemaDigest, input.authorityLineageReference], details: { toolId: input.toolSchema.toolId, toolVersion: input.toolSchema.toolVersion, parameterCount: input.parameters.length } },
    ...parameterAuthority.map((item) => ({ eventType: "AUTHORITY_PARAMETER_BINDING_EVALUATED", occurredAt: input.actionTimestamp, attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: item.evidenceReferences, details: { parameterName: item.parameterName, state: item.state, expectedProvenance: item.expectedProvenance, observedProvenance: item.observedProvenance, recommendedControl: item.recommendedControl } })),
    ...(runtimeAuthority ? [{ eventType: "RUNTIME_AUTHORITY_OBSERVED", occurredAt: runtimeAuthority.measurementTime, attribution: "RUNTIME_OBSERVATION", evidenceReferences: [runtimeAuthority.runtimeEvidenceReference], details: { authorityReference: runtimeAuthority.authorityReference, authorityVersion: runtimeAuthority.authorityVersion, runtimeState: runtimeAuthority.runtimeState, destinationState: runtimeAuthority.destinationState } }] : []),
    ...authorizationPropagation.timeline.map((item) => ({ eventType: "AUTHORIZATION_PROPAGATION_TIMELINE_RECORDED", occurredAt: item.requestedAt, attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: item.evidenceReferences, details: { changeId: item.changeId, state: authorizationPropagation.state, authorityVersionBefore: item.authorityVersionBefore, authorityVersionAfter: item.authorityVersionAfter, controlPlaneAcknowledgedAt: item.controlPlaneAcknowledgedAt, runtimeUpdatedAt: item.runtimeUpdatedAt, credentialUpdatedAt: item.credentialUpdatedAt, downstreamUpdatedAt: item.downstreamUpdatedAt, destinationConfirmedAt: item.destinationConfirmedAt } })),
    ...aimsCompatibility.map((item) => ({ eventType: "AIMS_COMPATIBLE_EVIDENCE_MAPPED", occurredAt: input.actionTimestamp, attribution: "PROVIDER_CLAIM", evidenceReferences: [item.evidenceReference], details: { provider: item.provider, source: item.source, correlationId: item.correlationId, providerIsCanonical: false, aimsDependency: false } })),
    ...authorizationChanges.map((change) => ({ eventType: "AUTHORIZATION_CHANGE_PROPAGATION_OBSERVED", occurredAt: change.effectiveAt, attribution: "PROVIDER_CLAIM", evidenceReferences: change.evidenceReferences, details: { changeId: change.changeId, changeType: change.changeType, propagationState: propagationState([change]) } })),
    ...findings.map((item) => ({ eventType: item.code, occurredAt: input.actionTimestamp, attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: item.evidenceReferences, details: { parameterName: item.parameterName, malicious: false } })),
  ];
  const materialCodes = new Set<AuthorityIntegrityFindingCode>(AUTHORITY_INTEGRITY_FINDINGS);
  const trustMemoryEvents = [
    ...input.parameters.filter((item) => item.materiality !== "ordinary" && trustedNonModelProvenance.has(item.parameterProvenance)).map((item) => ({ eventId: hashCanonical([input.actionId, "AUTHORITY_BOUND_PARAMETER_ESTABLISHED", item.parameterName]), eventType: "AUTHORITY_BOUND_PARAMETER_ESTABLISHED", occurredAt: item.timestamp, evidenceReferences: [item.policyReference, input.toolSchema.schemaDigest] })),
    ...parameterAuthority.filter((item) => item.securityCritical && !["MATCH", "SUPPORTED"].includes(item.state)).map((item) => ({ eventId: hashCanonical([input.actionId, "AUTHORITY_PARAMETER_BINDING_CHANGED", item.parameterName, item.state]), eventType: item.state === "PROVENANCE_MISMATCH" && item.observedProvenance === "MODEL_PROPOSED" ? "MODEL_CONTROLLED_SECURITY_BOUNDARY" : "AUTHORITY_PARAMETER_BINDING_CHANGED", occurredAt: input.actionTimestamp, evidenceReferences: item.evidenceReferences })),
    ...authorizationChanges.map((item) => ({ eventId: hashCanonical([input.actionId, "AUTHORIZATION_CHANGE", item.changeId]), eventType: propagationState([item]) === "destination_rejects_old_authority" || propagationState([item]) === "independently_confirmed" ? "AUTHORIZATION_DOWNGRADE_PROPAGATED" : "AUTHORIZATION_DOWNGRADE_REQUESTED", occurredAt: item.effectiveAt, evidenceReferences: item.evidenceReferences })),
    ...(["PROPAGATION_CONFIRMED", "PARTIAL_PROPAGATION", "PROPAGATION_PENDING", "STALE_AUTHORITY_POSSIBLE", "STALE_AUTHORITY_CONFIRMED"].includes(authorizationPropagation.state) ? [{ eventId: hashCanonical([input.actionId, authorizationPropagation.state]), eventType: authorizationPropagation.state === "PROPAGATION_CONFIRMED" ? "PROPAGATION_CONFIRMED" : authorizationPropagation.state === "STALE_AUTHORITY_CONFIRMED" ? "STALE_AUTHORITY_CONFIRMED" : authorizationPropagation.state === "STALE_AUTHORITY_POSSIBLE" ? "STALE_AUTHORITY_POSSIBLE" : "PROPAGATION_DELAYED", occurredAt: input.actionTimestamp, evidenceReferences: authorizationPropagation.timeline.flatMap((item) => item.evidenceReferences) }] : []),
    ...(runtimeAuthority?.runtimeState === "MISMATCH" ? [{ eventId: hashCanonical([input.actionId, "RUNTIME_AUTHORITY_MISMATCH"]), eventType: "RUNTIME_AUTHORITY_MISMATCH", occurredAt: runtimeAuthority.measurementTime, evidenceReferences: [runtimeAuthority.runtimeEvidenceReference] }] : []),
    ...(runtimeAuthority?.destinationState === "MISMATCH" ? [{ eventId: hashCanonical([input.actionId, "DESTINATION_AUTHORITY_MISMATCH"]), eventType: "DESTINATION_AUTHORITY_MISMATCH", occurredAt: runtimeAuthority.measurementTime, evidenceReferences: [runtimeAuthority.runtimeEvidenceReference] }] : []),
    ...findings.filter((item) => materialCodes.has(item.code)).map((item) => ({ eventId: hashCanonical([input.actionId, item.code, item.parameterName]), eventType: item.code, occurredAt: input.actionTimestamp, evidenceReferences: item.evidenceReferences })),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.eventId === item.eventId) === index);
  const minimumPreventativeControls = [...new Set([
    ...parameterAuthority.map((item) => item.recommendedControl).filter((item): item is AuthorityPreventativeControl => Boolean(item)),
    ...(runtimeAuthority?.runtimeState === "MISMATCH" ? ["REQUIRE_RUNTIME_DERIVATION" as const] : []),
    ...(runtimeAuthority?.destinationState === "MISMATCH" ? ["PIN_DESTINATION" as const] : []),
    ...(["STALE_AUTHORITY_CONFIRMED", "STALE_AUTHORITY_POSSIBLE", "PARTIAL_PROPAGATION", "PROPAGATION_PENDING"].includes(authorizationPropagation.state) ? ["REDUCE_AUTHORITY" as const] : []),
  ])];
  const receiptSummary = {
    authorityVersion: runtimeAuthority?.authorityVersion ?? authorizationPropagation.timeline[0]?.authorityVersionAfter ?? null,
    delegatedPrincipal: input.runtime?.delegatedPrincipal ?? input.delegatedSubject?.delegatedSubject ?? null,
    runtimeAuthorityEvidenceReference: runtimeAuthority?.runtimeEvidenceReference ?? null,
    destinationAuthorityEvidenceReference: runtimeAuthority?.destinationEffectiveAuthority === null || runtimeAuthority?.destinationEffectiveAuthority === undefined ? null : runtimeAuthority.runtimeEvidenceReference,
    parameterProvenanceSummary: parameterAuthority.map((item) => ({ parameterName: item.parameterName, state: item.state, provenance: item.observedProvenance })),
    propagationState: authorizationPropagation.state,
    destinationAuthorityState: runtimeAuthority?.destinationState ?? null,
    conflicts: findings.filter((item) => /CONFLICT|MISMATCH/.test(item.code)).map((item) => item.code),
    limitations: [...new Set([...authorizationPropagation.limitations, ...(runtimeAuthority?.limitations ?? []), ...parameterAuthority.flatMap((item) => item.limitations)])],
  };
  const assessment = {
    snapshotVersion: "1.0" as const,
    evaluatedAt: input.actionTimestamp,
    findings,
    requiredActions: [...requiredActions],
    propagationState: propagationState(authorizationChanges),
    toolSchemaChange: schemaChange,
    actionTimeEvidence: structuredClone(input),
    providerNeutralEvidence,
    graphProjection: buildGraph(input, findings, parameterAuthority, runtimeAuthority, authorizationPropagation, aimsCompatibility),
    replayEvents,
    trustMemoryEvents,
    parameterAuthority,
    authorizationPropagation,
    runtimeAuthority,
    aimsCompatibility,
    minimumPreventativeControls,
    receiptSummary,
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
