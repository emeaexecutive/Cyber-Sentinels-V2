import "server-only";
import { buildScopeContinuityArtifacts } from "./integrations.ts";
import { evaluateScopeContinuity } from "./evaluator.ts";
import { scopeContinuityRepository } from "./repository.ts";
import { hashCanonical } from "../trust-core/hash.ts";
import type { ScopeContinuityEvaluationInput } from "./types.ts";
import { validateEnvironmentAttestation, validateExecutionContextDeclaration, validateScopeAuthorizationLease, validateScopeContinuityInput } from "./validation.ts";

function conflict(code: string, message: string): never {
  throw Object.assign(new Error(message), { status: 409, code });
}

function sameRecord(left: Record<string, unknown>, right: Record<string, unknown>, fields: string[]) {
  const select = (value: Record<string, unknown>) => Object.fromEntries(fields.map((field) => [field, value[field]]));
  return hashCanonical(select(left)) === hashCanonical(select(right));
}

function assertKnownFields(value: unknown, allowed: string[], name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw Object.assign(new TypeError(`${name} contains unsupported fields.`), { code: "UNKNOWN_FIELD" });
}

const declarationFields = ["id", "enterpriseId", "subjectType", "subjectId", "workflowId", "executionId", "environmentClass", "internetAccessExpected", "productionAccessExpected", "permittedNetworkZones", "permittedDomains", "permittedTargetIdentifiers", "testHarnessProvider", "declarationSourceType", "declarationSourceId", "accountableOwnerType", "accountableOwnerId", "validFrom", "validUntil", "declaredAt", "evidenceReference", "integrityMetadata", "createdAt"];
const attestationFields = ["id", "enterpriseId", "executionContextId", "subjectType", "subjectId", "observationType", "observedEnvironmentClass", "internetReachable", "productionReachable", "observedNetworkZones", "observedDomains", "observedTargetIdentifiers", "egressPolicyState", "isolationControlState", "monitoringState", "attestationSourceType", "attestationSourceId", "providerOrThirdPartyIdentity", "sourceAuthority", "observedAt", "receivedAt", "confidence", "freshness", "evidenceStrength", "evidenceReference", "integrityMetadata", "supersedesAttestationId", "createdAt"];
const authorizationFields = ["id", "enterpriseId", "subjectType", "subjectId", "authorizedObjective", "permittedTools", "permittedActions", "permittedTargets", "permittedEnvironments", "maximumDurationSeconds", "maximumActionCount", "dataClassificationBoundary", "approverType", "approverId", "issuedAt", "expiresAt", "revokedAt", "revocationReason", "requiredAttestationTypes", "contradictionResponsePolicy", "authorityReference", "evidenceReferences", "supersedesLeaseId"];

function validateRequest(value: unknown, correlationId: string) {
  try {
    const body = value as Record<string, unknown>;
    assertKnownFields(body, ["declaration", "attestations", "authorization", "request", "policy", "evaluatedAt", "correlationId", "previousDecision"], "request");
    assertKnownFields(body.declaration, declarationFields, "declaration");
    assertKnownFields(body.authorization, [...authorizationFields, "consumedActionCount"], "authorization");
    assertKnownFields(body.request, ["action", "objective", "tool", "targetIdentifier", "targetEnvironmentClass", "dataClassification", "requestedAt"], "action request");
    assertKnownFields(body.policy, ["policyId", "policyVersion", "maximumAttestationAgeSeconds", "requireIndependentAttestation", "missingAttestationOutcome", "staleAttestationOutcome", "unexpectedInternetOutcome", "monitoringUnavailableOutcome", "contradictionAfterAllowOutcome", "criticalContradictionOutcome"], "policy");
    if (Array.isArray(body.attestations)) for (const item of body.attestations) assertKnownFields(item, attestationFields, "attestation");
    assertKnownFields(body.previousDecision, ["id", "outcome", "trustImpact"], "previous decision");
    const previous = body.previousDecision as Record<string, unknown> | undefined;
    assertKnownFields(previous?.trustImpact, ["priorState", "nextState", "reasonCodes"], "previous trust impact");
    for (const item of [body.declaration, ...(Array.isArray(body.attestations) ? body.attestations : [])]) {
      const record = item as Record<string, unknown> | undefined;
      assertKnownFields(record?.integrityMetadata, ["status", "algorithm", "digest", "signatureVerified"], "integrity metadata");
    }
    return validateScopeContinuityInput({ ...(value as ScopeContinuityEvaluationInput), correlationId });
  } catch (error) {
    const candidate = error as Error & { code?: string };
    throw Object.assign(new Error(candidate.message || "Scope Continuity request is invalid."), {
      status: 400,
      code: candidate.code ?? "SCOPE_REQUEST_INVALID",
    });
  }
}

export async function evaluateAndPersistScopeContinuity(input: { enterpriseId: string; actorId: string; value: unknown; correlationId: string }) {
  if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) throw Object.assign(new Error("Scope Continuity request must be an object."), { status: 400, code: "SCOPE_REQUEST_INVALID" });
  const candidate = validateRequest(input.value, input.correlationId);
  if (candidate.declaration?.enterpriseId !== input.enterpriseId || candidate.authorization?.enterpriseId !== input.enterpriseId || candidate.attestations?.some((item) => item.enterpriseId !== input.enterpriseId)) {
    throw Object.assign(new Error("Cross-enterprise scope input is denied."), { status: 403, code: "CROSS_ENTERPRISE_REFERENCE" });
  }
  const repository = scopeContinuityRepository();
  const canonical = await repository.canonicalInputs(input.enterpriseId, candidate);
  const canonicalDeclaration = canonical.declaration ? validateExecutionContextDeclaration(canonical.declaration as ScopeContinuityEvaluationInput["declaration"]) : null;
  const canonicalAuthorization = canonical.authorization ? validateScopeAuthorizationLease(canonical.authorization as ScopeContinuityEvaluationInput["authorization"]) : null;
  const canonicalAttestations = new Map([...canonical.attestations].map(([id, value]) => [id, validateEnvironmentAttestation(value as ScopeContinuityEvaluationInput["attestations"][number])]));
  if (canonicalDeclaration && !sameRecord(candidate.declaration as unknown as Record<string, unknown>, canonicalDeclaration as unknown as Record<string, unknown>, declarationFields)) conflict("CANONICAL_DECLARATION_CONFLICT", "The execution-context identifier is already bound to different canonical evidence.");
  if (canonicalAuthorization && !sameRecord(candidate.authorization as unknown as Record<string, unknown>, canonicalAuthorization as unknown as Record<string, unknown>, authorizationFields)) conflict("CANONICAL_LEASE_CONFLICT", "The scope-authorization identifier is already bound to different canonical evidence.");
  for (const item of candidate.attestations) {
    const existing = canonicalAttestations.get(item.id);
    if (existing && !sameRecord(item as unknown as Record<string, unknown>, existing as unknown as Record<string, unknown>, attestationFields)) conflict("CANONICAL_ATTESTATION_CONFLICT", "The attestation identifier is already bound to different canonical evidence.");
    if (!existing && (item.attestationSourceType === "independent_attestation" || item.evidenceStrength === "cryptographically_attested")) {
      throw Object.assign(new Error("Independent or cryptographic attestations require an existing canonical record from an authorized server integration."), { status: 403, code: "ATTESTATION_SOURCE_NOT_AUTHORIZED" });
    }
  }
  if (!canonical.authorization && candidate.authorization.approverId !== input.actorId) {
    throw Object.assign(new Error("The authenticated administrator must be the recorded lease approver."), { status: 403, code: "LEASE_APPROVER_MISMATCH" });
  }
  if (!canonical.declaration && candidate.declaration.accountableOwnerId !== input.actorId) {
    throw Object.assign(new Error("The authenticated administrator must be the recorded context owner."), { status: 403, code: "CONTEXT_OWNER_MISMATCH" });
  }
  const evaluatedInput: ScopeContinuityEvaluationInput = {
    ...candidate,
    declaration: canonicalDeclaration ?? candidate.declaration,
    authorization: canonicalAuthorization ?? { ...candidate.authorization, consumedActionCount: canonical.consumedActionCount },
    attestations: candidate.attestations.map((item) => canonicalAttestations.get(item.id) ?? item),
  };
  const decision = evaluateScopeContinuity(evaluatedInput);
  const artifacts = buildScopeContinuityArtifacts(evaluatedInput, decision);
  await repository.persist(evaluatedInput, decision, artifacts, input.actorId);
  return { decision, artifacts };
}
