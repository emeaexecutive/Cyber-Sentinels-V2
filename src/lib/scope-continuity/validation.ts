import { normalizeUtcTimestamp } from "../trust-core/time.ts";
import { attestationSourceTypes, environmentClasses, evidenceStrengths, type EnvironmentAttestation, type ExecutionContextDeclaration, type ScopeActionRequest, type ScopeAuthorizationLease, type ScopeContinuityEvaluationInput, type ScopeContinuityPolicy } from "./types.ts";
import { validateEvidenceAttribution } from "./evidence.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reference = /^[A-Za-z0-9][A-Za-z0-9_.:@/-]{0,255}$/;
const digest = /^[a-f0-9]{64}$/;

function fail(message: string, code: string): never {
  throw Object.assign(new TypeError(message), { code });
}

function id(value: string, field: string) {
  if (!uuid.test(value)) fail(`${field} must be a UUID.`, "IDENTIFIER_INVALID");
}

function ref(value: string, field: string) {
  if (!reference.test(value)) fail(`${field} is invalid.`, "REFERENCE_INVALID");
}

function text(value: string, field: string, maximum = 500) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) fail(`${field} is invalid.`, "TEXT_VALUE_INVALID");
  return value.trim();
}

function bool(value: unknown, field: string) {
  if (typeof value !== "boolean") fail(`${field} must be boolean.`, "BOOLEAN_VALUE_INVALID");
}

function choice<T extends string>(value: T, choices: readonly T[], field: string, code = "ENUM_VALUE_INVALID") {
  if (!choices.includes(value)) fail(`${field} is invalid.`, code);
}

function refs(values: string[], field: string, limit = 100) {
  if (!Array.isArray(values) || values.length > limit) fail(`${field} is invalid.`, "REFERENCE_SET_INVALID");
  values.forEach((value, index) => ref(value, `${field}[${index}]`));
  return [...new Set(values)].sort();
}

function orderedRange(from: string, until: string, code: string) {
  const start = normalizeUtcTimestamp(from, "validFrom");
  const end = normalizeUtcTimestamp(until, "validUntil");
  if (Date.parse(end) <= Date.parse(start)) fail("Validity end must be after its start.", code);
  return [start, end] as const;
}

function integrity(value: ExecutionContextDeclaration["integrityMetadata"], field: string) {
  if (!value || !["unverified", "verified", "invalid", "unknown"].includes(value.status)) fail(`${field} is invalid.`, "INTEGRITY_METADATA_INVALID");
  if (value.digest && !digest.test(value.digest)) fail(`${field} digest is invalid.`, "INTEGRITY_DIGEST_INVALID");
  return { ...value, algorithm: value.algorithm?.trim() || null, digest: value.digest ?? null };
}

export function validateExecutionContextDeclaration(value: ExecutionContextDeclaration): ExecutionContextDeclaration {
  id(value.id, "declaration.id");
  id(value.enterpriseId, "declaration.enterpriseId");
  if (!environmentClasses.includes(value.environmentClass)) fail("Environment class is invalid.", "ENVIRONMENT_CLASS_INVALID");
  bool(value.internetAccessExpected, "internetAccessExpected"); bool(value.productionAccessExpected, "productionAccessExpected");
  ref(value.subjectType, "subjectType"); ref(value.subjectId, "subjectId");
  if (!value.workflowId && !value.executionId) fail("A workflow or execution identifier is required.", "EXECUTION_REFERENCE_REQUIRED");
  if (value.workflowId) ref(value.workflowId, "workflowId");
  if (value.executionId) ref(value.executionId, "executionId");
  const [validFrom, validUntil] = orderedRange(value.validFrom, value.validUntil, "DECLARATION_VALIDITY_INVALID");
  const declaredAt = normalizeUtcTimestamp(value.declaredAt, "declaredAt");
  const createdAt = normalizeUtcTimestamp(value.createdAt, "createdAt");
  ref(value.declarationSourceType, "declarationSourceType"); ref(value.declarationSourceId, "declarationSourceId");
  ref(value.accountableOwnerType, "accountableOwnerType"); ref(value.accountableOwnerId, "accountableOwnerId");
  ref(value.evidenceReference, "evidenceReference");
  return { ...value, validFrom, validUntil, declaredAt, createdAt, permittedNetworkZones: refs(value.permittedNetworkZones, "permittedNetworkZones"), permittedDomains: refs(value.permittedDomains, "permittedDomains"), permittedTargetIdentifiers: refs(value.permittedTargetIdentifiers, "permittedTargetIdentifiers"), integrityMetadata: integrity(value.integrityMetadata, "declaration.integrityMetadata") };
}

export function validateEnvironmentAttestation(value: EnvironmentAttestation): EnvironmentAttestation {
  id(value.id, "attestation.id"); id(value.enterpriseId, "attestation.enterpriseId"); id(value.executionContextId, "executionContextId");
  if (!environmentClasses.includes(value.observedEnvironmentClass)) fail("Observed environment class is invalid.", "ENVIRONMENT_CLASS_INVALID");
  if (!attestationSourceTypes.includes(value.attestationSourceType)) fail("Attestation source is invalid.", "ATTESTATION_SOURCE_INVALID");
  if (!evidenceStrengths.includes(value.evidenceStrength)) fail("Evidence strength is invalid.", "EVIDENCE_STRENGTH_INVALID");
  choice(value.egressPolicyState, ["enforced", "degraded", "not_enforced", "unknown"] as const, "egressPolicyState");
  choice(value.isolationControlState, ["confirmed", "degraded", "absent", "unknown"] as const, "isolationControlState");
  choice(value.monitoringState, ["available", "degraded", "unavailable", "unknown"] as const, "monitoringState");
  choice(value.freshness, ["current", "stale", "expired", "unknown"] as const, "freshness");
  if (![true, false, null].includes(value.internetReachable) || ![true, false, null].includes(value.productionReachable)) fail("Reachability values must be boolean or null.", "REACHABILITY_VALUE_INVALID");
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) fail("Attestation confidence is invalid.", "ATTESTATION_CONFIDENCE_INVALID");
  ref(value.subjectType, "subjectType"); ref(value.subjectId, "subjectId"); ref(value.observationType, "observationType");
  ref(value.attestationSourceId, "attestationSourceId"); ref(value.sourceAuthority, "sourceAuthority"); ref(value.evidenceReference, "evidenceReference");
  if (value.providerOrThirdPartyIdentity) ref(value.providerOrThirdPartyIdentity, "providerOrThirdPartyIdentity");
  if (value.supersedesAttestationId) id(value.supersedesAttestationId, "supersedesAttestationId");
  const normalized = { ...value, observedAt: normalizeUtcTimestamp(value.observedAt, "observedAt"), receivedAt: normalizeUtcTimestamp(value.receivedAt, "receivedAt"), createdAt: normalizeUtcTimestamp(value.createdAt, "createdAt"), observedNetworkZones: refs(value.observedNetworkZones, "observedNetworkZones"), observedDomains: refs(value.observedDomains, "observedDomains"), observedTargetIdentifiers: refs(value.observedTargetIdentifiers, "observedTargetIdentifiers"), integrityMetadata: integrity(value.integrityMetadata, "attestation.integrityMetadata") };
  if (Date.parse(normalized.receivedAt) < Date.parse(normalized.observedAt)) fail("Attestation receipt cannot predate observation.", "ATTESTATION_TIME_INVALID");
  return validateEvidenceAttribution(normalized);
}

export function validateScopeAuthorizationLease(value: ScopeAuthorizationLease): ScopeAuthorizationLease {
  id(value.id, "authorization.id"); id(value.enterpriseId, "authorization.enterpriseId");
  choice(value.subjectType, ["organization", "human", "ai_agent", "machine_identity"] as const, "subjectType");
  choice(value.approverType, ["organization", "human", "ai_agent", "machine_identity"] as const, "approverType");
  ref(value.subjectId, "subjectId"); text(value.authorizedObjective, "authorizedObjective"); ref(value.approverId, "approverId");
  if (!Number.isInteger(value.maximumDurationSeconds) || value.maximumDurationSeconds < 1) fail("Maximum duration is invalid.", "AUTHORIZATION_DURATION_INVALID");
  if (!Number.isInteger(value.maximumActionCount) || value.maximumActionCount < 1 || !Number.isInteger(value.consumedActionCount) || value.consumedActionCount < 0) fail("Action count is invalid.", "AUTHORIZATION_ACTION_COUNT_INVALID");
  const [issuedAt, expiresAt] = orderedRange(value.issuedAt, value.expiresAt, "AUTHORIZATION_VALIDITY_INVALID");
  if (Date.parse(expiresAt) - Date.parse(issuedAt) > value.maximumDurationSeconds * 1000) fail("Authorization exceeds its maximum duration.", "AUTHORIZATION_DURATION_EXCEEDED");
  if (value.revokedAt) normalizeUtcTimestamp(value.revokedAt, "revokedAt");
  if (value.requiredAttestationTypes.some((item) => !attestationSourceTypes.includes(item))) fail("Required attestation source is invalid.", "ATTESTATION_SOURCE_INVALID");
  if (value.permittedEnvironments.some((item) => !environmentClasses.includes(item))) fail("Permitted environment is invalid.", "ENVIRONMENT_CLASS_INVALID");
  choice(value.contradictionResponsePolicy, ["require_human_approval", "pause", "deny", "revoke_scope"] as const, "contradictionResponsePolicy");
  return { ...value, issuedAt, expiresAt, permittedTools: refs(value.permittedTools, "permittedTools"), permittedActions: refs(value.permittedActions, "permittedActions"), permittedTargets: refs(value.permittedTargets, "permittedTargets"), dataClassificationBoundary: refs(value.dataClassificationBoundary, "dataClassificationBoundary"), evidenceReferences: refs(value.evidenceReferences, "evidenceReferences"), permittedEnvironments: [...new Set(value.permittedEnvironments)].sort(), requiredAttestationTypes: [...new Set(value.requiredAttestationTypes)].sort() };
}

export function validateScopeActionRequest(value: ScopeActionRequest): ScopeActionRequest {
  ref(value.action, "action"); text(value.objective, "objective"); ref(value.targetIdentifier, "targetIdentifier");
  if (value.tool) ref(value.tool, "tool");
  if (value.dataClassification) ref(value.dataClassification, "dataClassification");
  if (!environmentClasses.includes(value.targetEnvironmentClass)) fail("Target environment is invalid.", "ENVIRONMENT_CLASS_INVALID");
  return { ...value, requestedAt: normalizeUtcTimestamp(value.requestedAt, "requestedAt") };
}

export function validateScopeContinuityPolicy(value: ScopeContinuityPolicy): ScopeContinuityPolicy {
  ref(value.policyId, "policyId"); ref(value.policyVersion, "policyVersion");
  if (!Number.isInteger(value.maximumAttestationAgeSeconds) || value.maximumAttestationAgeSeconds < 1) fail("Attestation age policy is invalid.", "POLICY_INVALID");
  bool(value.requireIndependentAttestation, "requireIndependentAttestation");
  choice(value.missingAttestationOutcome, ["require_human_approval", "deny"] as const, "missingAttestationOutcome", "POLICY_INVALID");
  choice(value.staleAttestationOutcome, ["pause", "require_human_approval"] as const, "staleAttestationOutcome", "POLICY_INVALID");
  choice(value.unexpectedInternetOutcome, ["pause", "deny"] as const, "unexpectedInternetOutcome", "POLICY_INVALID");
  choice(value.monitoringUnavailableOutcome, ["allow_with_reduced_trust", "require_human_approval", "pause"] as const, "monitoringUnavailableOutcome", "POLICY_INVALID");
  choice(value.contradictionAfterAllowOutcome, ["pause", "revoke_scope"] as const, "contradictionAfterAllowOutcome", "POLICY_INVALID");
  choice(value.criticalContradictionOutcome, ["deny", "revoke_scope"] as const, "criticalContradictionOutcome", "POLICY_INVALID");
  return value;
}

export function validateScopeContinuityInput(value: ScopeContinuityEvaluationInput): ScopeContinuityEvaluationInput {
  id(value.correlationId, "correlationId");
  const declaration = validateExecutionContextDeclaration(value.declaration);
  const authorization = validateScopeAuthorizationLease(value.authorization);
  const request = validateScopeActionRequest(value.request);
  const policy = validateScopeContinuityPolicy(value.policy);
  const attestations = value.attestations.map(validateEnvironmentAttestation);
  const evaluatedAt = normalizeUtcTimestamp(value.evaluatedAt, "evaluatedAt");
  const enterpriseIds = [declaration.enterpriseId, authorization.enterpriseId, ...attestations.map((item) => item.enterpriseId)];
  if (enterpriseIds.some((item) => item !== declaration.enterpriseId)) fail("Cross-enterprise evidence is rejected.", "CROSS_ENTERPRISE_REFERENCE");
  if (authorization.subjectId !== declaration.subjectId || attestations.some((item) => item.subjectId !== declaration.subjectId || item.executionContextId !== declaration.id)) fail("Cross-context evidence is rejected.", "CROSS_CONTEXT_REFERENCE");
  return { ...value, declaration, authorization, request, policy, attestations, evaluatedAt };
}
