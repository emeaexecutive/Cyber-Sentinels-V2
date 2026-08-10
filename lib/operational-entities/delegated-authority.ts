import { randomUUID } from "node:crypto";
import { evaluateAuthorityGraph, type AuthorityGrant } from "../core/authority-graph.ts";
import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { hashCanonical, hashesEqual } from "../../src/lib/trust-core/hash.ts";
import { verifyDetachedEd25519, type NativeCredential } from "./native-verification.ts";

export const DELEGATED_AUTHORITY_SUBSET_VERSION = "delegated-authority-subset-v1" as const;
export const DELEGATION_LINEAGE_VERSION = "delegation-lineage-validation-v1" as const;

export type DelegationStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "SUPERSEDED" | "REJECTED";
export type DelegationPolicyDecision = "ACTIVATE" | "REVIEW" | "REJECT";
export type DelegatedActionDecision = "ALLOW" | "REVIEW" | "DENY";
export type DataBoundary = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

export type DelegatedAuthorityScope = {
  permittedActions: string[];
  permittedTools: string[];
  permittedTargets: string[];
  environments: string[];
  dataBoundary: DataBoundary;
  financialLimit: number | null;
  executionLimit: number | null;
};

export type ParentAuthority = {
  authorityId: string;
  enterpriseId: string;
  operationalEntityId: string;
  accountableOwnerId: string;
  objective: string;
  scope: DelegatedAuthorityScope;
  canDelegate: boolean;
  maximumDelegationDepth: number;
  issuedAt: string;
  notBefore: string;
  expiresAt: string;
  revokedAt: string | null;
  policyVersion: string;
  authorityVersion: string;
  evidenceReferences: string[];
};

export type AuthorityDelegation = {
  delegationId: string;
  enterpriseId: string;
  delegatorOperationalEntityId: string;
  delegateOperationalEntityId: string;
  parentAuthorityId: string;
  parentDelegationId: string | null;
  objective: string;
  scope: DelegatedAuthorityScope;
  canRedelegate: boolean;
  maximumDelegationDepth: number;
  depth: number;
  issuedAt: string;
  notBefore: string;
  expiresAt: string;
  revokedAt: string | null;
  policyVersion: string;
  authorityVersion: string;
  nonce: string;
  signingKeyId: string;
  delegationDigest: string;
  signature: string;
  status: DelegationStatus;
  evidenceReferences: string[];
};

export type DelegationAcceptance = {
  acceptanceId: string;
  enterpriseId: string;
  delegationId: string;
  delegationDigest: string;
  delegateOperationalEntityId: string;
  credentialFingerprint: string;
  manifestDigest: string;
  signingKeyId: string;
  acceptedAt: string;
  nonce: string;
  signature: string;
  acceptanceDigest: string;
};

export type NativeIdentityState = {
  operationalEntityId: string;
  enterpriseId: string;
  status: "VERIFIED" | "PARTIALLY_VERIFIED" | "REVIEW_REQUIRED" | "FAILED" | "EXPIRED" | "UNKNOWN";
  ownerState: string;
  accountableOwnerId: string;
  runtimeBinding: string;
  manifestDigest: string;
  credentialFingerprint: string;
  continuityFingerprint?: string;
  evidenceReference: string;
  expiresAt: string;
};

export type DelegationLineageEdge = {
  issuer: string;
  recipient: string;
  relationship: "ENTERPRISE_OWNS" | "HUMAN_AUTHORIZES" | "ENTITY_DELEGATES" | "ENTITY_ACCEPTS";
  authorityReference: string;
  scopeDigest: string;
  version: string;
  effectiveAt: string;
  expiresAt: string;
  policyVersion: string;
  evidenceReferences: string[];
  revocationState: "ACTIVE" | "REVOKED" | "EXPIRED";
};

export type SubsetValidation = {
  valid: boolean;
  decision: "ALLOW" | "DENY";
  reasonCodes: string[];
  violations: Array<{ field: string; values: Array<string | number> }>;
  algorithmVersion: typeof DELEGATED_AUTHORITY_SUBSET_VERSION;
  parentScopeDigest: string;
  delegatedScopeDigest: string;
};

export class DelegatedAuthorityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "DelegatedAuthorityError";
    this.code = code;
    this.status = status;
  }
}

const referencePattern = /^[A-Za-z0-9_.:/-]{1,240}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const capabilityPattern = /^[a-z][a-z0-9_.:-]{0,127}$/;
const dataBoundaryRank: Record<DataBoundary, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, RESTRICTED: 3 };

function unique(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function requireReference(value: string, code = "DELEGATION_SCHEMA_INVALID") {
  if (!referencePattern.test(value)) throw new DelegatedAuthorityError("A delegation reference is invalid.", code);
}

function time(value: string, code = "DELEGATION_TIMESTAMP_INVALID") {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new DelegatedAuthorityError("A delegation timestamp is invalid.", code);
  return parsed;
}

function subset(child: readonly string[], parent: readonly string[]) {
  const allowed = new Set(parent);
  return child.filter((value) => !allowed.has(value));
}

export function canonicalDelegatedScope(scope: DelegatedAuthorityScope): DelegatedAuthorityScope {
  const result = {
    permittedActions: unique(scope.permittedActions),
    permittedTools: unique(scope.permittedTools),
    permittedTargets: unique(scope.permittedTargets),
    environments: unique(scope.environments),
    dataBoundary: scope.dataBoundary,
    financialLimit: scope.financialLimit,
    executionLimit: scope.executionLimit,
  };
  for (const value of [...result.permittedActions, ...result.permittedTools]) {
    if (!capabilityPattern.test(value)) throw new DelegatedAuthorityError("A delegated action or tool is invalid.", "DELEGATION_SCOPE_INVALID");
  }
  for (const value of [...result.permittedTargets, ...result.environments]) requireReference(value, "DELEGATION_SCOPE_INVALID");
  if (!(result.dataBoundary in dataBoundaryRank)) throw new DelegatedAuthorityError("The delegated data boundary is invalid.", "DELEGATION_SCOPE_INVALID");
  for (const limit of [result.financialLimit, result.executionLimit]) {
    if (limit !== null && (!Number.isSafeInteger(limit) || limit < 0)) throw new DelegatedAuthorityError("Delegation limits must be non-negative safe integers.", "DELEGATION_SCOPE_INVALID");
  }
  return result;
}

export function delegatedScopeDigest(scope: DelegatedAuthorityScope) {
  return hashCanonical(canonicalDelegatedScope(scope));
}

export function delegationSigningClaims(delegation: AuthorityDelegation) {
  return {
    delegationId: delegation.delegationId,
    delegatorOperationalEntityId: delegation.delegatorOperationalEntityId,
    delegateOperationalEntityId: delegation.delegateOperationalEntityId,
    parentAuthorityId: delegation.parentAuthorityId,
    parentDelegationId: delegation.parentDelegationId,
    scopeDigest: delegatedScopeDigest(delegation.scope),
    policyVersion: delegation.policyVersion,
    authorityVersion: delegation.authorityVersion,
    issuedAt: delegation.issuedAt,
    expiresAt: delegation.expiresAt,
    nonce: delegation.nonce,
  };
}

export function delegationSigningPayload(delegation: AuthorityDelegation) {
  return Buffer.from(canonicalize(delegationSigningClaims(delegation)), "utf8");
}

export function deriveDelegationDigest(delegation: AuthorityDelegation) {
  return hashCanonical({
    enterpriseId: delegation.enterpriseId,
    objective: delegation.objective,
    scope: canonicalDelegatedScope(delegation.scope),
    canRedelegate: delegation.canRedelegate,
    maximumDelegationDepth: delegation.maximumDelegationDepth,
    depth: delegation.depth,
    notBefore: delegation.notBefore,
    ...delegationSigningClaims(delegation),
  });
}

export function validateDelegatedAuthoritySubset(input: {
  parentScope: DelegatedAuthorityScope;
  delegatedScope: DelegatedAuthorityScope;
  parentNotBefore: string;
  parentExpiresAt: string;
  delegatedNotBefore: string;
  delegatedExpiresAt: string;
  parentMaximumDelegationDepth: number;
  requestedDepth: number;
}): SubsetValidation {
  const parent = canonicalDelegatedScope(input.parentScope);
  const delegated = canonicalDelegatedScope(input.delegatedScope);
  const violations: SubsetValidation["violations"] = [];
  for (const [field, child, allowed] of [
    ["permittedActions", delegated.permittedActions, parent.permittedActions],
    ["permittedTools", delegated.permittedTools, parent.permittedTools],
    ["permittedTargets", delegated.permittedTargets, parent.permittedTargets],
    ["environments", delegated.environments, parent.environments],
  ] as const) {
    const outside = subset(child, allowed);
    if (outside.length) violations.push({ field, values: outside });
  }
  if (dataBoundaryRank[delegated.dataBoundary] > dataBoundaryRank[parent.dataBoundary]) violations.push({ field: "dataBoundary", values: [delegated.dataBoundary] });
  if (parent.financialLimit !== null && (delegated.financialLimit === null || delegated.financialLimit > parent.financialLimit)) violations.push({ field: "financialLimit", values: [delegated.financialLimit ?? "unbounded"] });
  if (parent.executionLimit !== null && (delegated.executionLimit === null || delegated.executionLimit > parent.executionLimit)) violations.push({ field: "executionLimit", values: [delegated.executionLimit ?? "unbounded"] });
  if (time(input.delegatedNotBefore) < time(input.parentNotBefore) || time(input.delegatedExpiresAt) > time(input.parentExpiresAt)) violations.push({ field: "temporalLimits", values: [input.delegatedNotBefore, input.delegatedExpiresAt] });
  if (!Number.isSafeInteger(input.requestedDepth) || input.requestedDepth < 1 || input.requestedDepth > input.parentMaximumDelegationDepth) violations.push({ field: "maximumDelegationDepth", values: [input.requestedDepth] });
  const valid = violations.length === 0;
  return {
    valid,
    decision: valid ? "ALLOW" : "DENY",
    reasonCodes: valid ? ["DELEGATED_AUTHORITY_SUBSET_VALID"] : ["AUTHORITY_AMPLIFICATION_ATTEMPT"],
    violations,
    algorithmVersion: DELEGATED_AUTHORITY_SUBSET_VERSION,
    parentScopeDigest: delegatedScopeDigest(parent),
    delegatedScopeDigest: delegatedScopeDigest(delegated),
  };
}

export function verifySignedDelegation(input: {
  delegation: AuthorityDelegation;
  credential: NativeCredential;
  expectedEnterpriseId: string;
  expectedDelegatorId: string;
  expectedDelegateId: string;
  now?: string;
}) {
  const { delegation, credential } = input;
  if (delegation.enterpriseId !== input.expectedEnterpriseId || credential.enterpriseId !== input.expectedEnterpriseId) throw new DelegatedAuthorityError("The delegation belongs to another tenant.", "WRONG_TENANT", 403);
  if (delegation.delegatorOperationalEntityId !== input.expectedDelegatorId || credential.operationalEntityId !== input.expectedDelegatorId) throw new DelegatedAuthorityError("The delegation was not signed by the declared delegator.", "WRONG_DELEGATOR_KEY", 403);
  if (delegation.delegateOperationalEntityId !== input.expectedDelegateId) throw new DelegatedAuthorityError("The delegation recipient does not match.", "WRONG_DELEGATE", 403);
  if (credential.signingKeyId !== delegation.signingKeyId || credential.state !== "ACTIVE") throw new DelegatedAuthorityError("The delegation signing credential is not active.", "WRONG_DELEGATOR_KEY", 409);
  const now = time(input.now ?? new Date().toISOString());
  if (time(delegation.notBefore) > now || time(delegation.issuedAt) > now) throw new DelegatedAuthorityError("The delegation is not yet active.", "DELEGATION_NOT_YET_VALID", 409);
  if (time(delegation.expiresAt) <= now) throw new DelegatedAuthorityError("The delegation has expired.", "DELEGATION_EXPIRED", 409);
  if (!digestPattern.test(delegation.delegationDigest) || !hashesEqual(deriveDelegationDigest(delegation), delegation.delegationDigest)) throw new DelegatedAuthorityError("The delegation digest no longer matches the signed record.", "DELEGATION_DIGEST_MISMATCH", 409);
  if (!verifyDetachedEd25519(delegationSigningPayload(delegation), delegation.signature, credential.publicJwk)) throw new DelegatedAuthorityError("The delegation signature is invalid.", "INVALID_SIGNATURE", 409);
  return true;
}

export function evaluateDelegationPolicy(input: {
  parentAuthority: ParentAuthority;
  delegation: AuthorityDelegation;
  subsetValidation: SubsetValidation;
  delegatorIdentity: NativeIdentityState;
  delegateIdentity: NativeIdentityState;
  humanApprovalRequired: boolean;
  humanApprovalPresent: boolean;
  lineageEntityIds?: string[];
  parentDelegation?: AuthorityDelegation | null;
  now?: string;
}): { decision: DelegationPolicyDecision; reasonCodes: string[] } {
  const now = time(input.now ?? new Date().toISOString());
  const reasons: string[] = [];
  if (input.delegation.enterpriseId !== input.parentAuthority.enterpriseId || input.delegatorIdentity.enterpriseId !== input.parentAuthority.enterpriseId || input.delegateIdentity.enterpriseId !== input.parentAuthority.enterpriseId) reasons.push("WRONG_TENANT");
  if (!input.delegation.parentDelegationId && input.parentAuthority.operationalEntityId !== input.delegation.delegatorOperationalEntityId) reasons.push("PARENT_AUTHORITY_DELEGATOR_MISMATCH");
  if (!input.parentAuthority.canDelegate) reasons.push("PARENT_AUTHORITY_NOT_DELEGABLE");
  if (input.parentAuthority.revokedAt) reasons.push("PARENT_AUTHORITY_REVOKED");
  if (time(input.parentAuthority.notBefore) > now || time(input.parentAuthority.expiresAt) <= now) reasons.push("PARENT_AUTHORITY_EXPIRED");
  if (!input.subsetValidation.valid) reasons.push(...input.subsetValidation.reasonCodes);
  if (input.delegation.parentDelegationId) {
    if (!input.parentDelegation || input.parentDelegation.delegationId !== input.delegation.parentDelegationId) reasons.push("PARENT_DELEGATION_NOT_FOUND");
    else {
      if (input.parentDelegation.delegateOperationalEntityId !== input.delegation.delegatorOperationalEntityId) reasons.push("PARENT_AUTHORITY_DELEGATOR_MISMATCH");
      if (!input.parentDelegation.canRedelegate) reasons.push("UNAUTHORIZED_REDELEGATION");
      if (input.delegation.depth !== input.parentDelegation.depth + 1 || input.delegation.depth > input.parentDelegation.maximumDelegationDepth) reasons.push("MAX_DELEGATION_DEPTH_EXCEEDED");
    }
  }
  if (input.delegation.depth > input.parentAuthority.maximumDelegationDepth) reasons.push("MAX_DELEGATION_DEPTH_EXCEEDED");
  if ((input.lineageEntityIds ?? []).includes(input.delegation.delegateOperationalEntityId)) reasons.push("DELEGATION_CYCLE_DETECTED");
  if (input.delegatorIdentity.status !== "VERIFIED") reasons.push("DELEGATOR_IDENTITY_NOT_VERIFIED");
  if (input.delegateIdentity.status !== "VERIFIED") reasons.push("BETA_IDENTITY_NOT_VERIFIED");
  if (input.delegateIdentity.ownerState !== "CONFIRMED") reasons.push("BETA_OWNER_NOT_CONFIRMED");
  if (input.delegateIdentity.runtimeBinding !== "RUNTIME_MATCH") reasons.push("BETA_RUNTIME_NOT_SUPPORTED");
  const uniqueReasons = unique(reasons);
  if (uniqueReasons.length) return { decision: "REJECT", reasonCodes: uniqueReasons };
  if (input.humanApprovalRequired && !input.humanApprovalPresent) return { decision: "REVIEW", reasonCodes: ["HUMAN_APPROVAL_REQUIRED"] };
  return { decision: "ACTIVATE", reasonCodes: ["DELEGATION_POLICY_SATISFIED", "BETA_IDENTITY_VERIFIED", "BETA_OWNER_CONFIRMED"] };
}

export function acceptanceSigningClaims(acceptance: Omit<DelegationAcceptance, "signature" | "acceptanceDigest">) {
  return {
    acceptanceId: acceptance.acceptanceId,
    enterpriseId: acceptance.enterpriseId,
    delegationId: acceptance.delegationId,
    delegationDigest: acceptance.delegationDigest,
    delegateOperationalEntityId: acceptance.delegateOperationalEntityId,
    credentialFingerprint: acceptance.credentialFingerprint,
    manifestDigest: acceptance.manifestDigest,
    signingKeyId: acceptance.signingKeyId,
    acceptedAt: acceptance.acceptedAt,
    nonce: acceptance.nonce,
  };
}

export function acceptanceSigningPayload(acceptance: Omit<DelegationAcceptance, "acceptanceDigest">) {
  return Buffer.from(canonicalize(acceptanceSigningClaims(acceptance)), "utf8");
}

export function deriveAcceptanceDigest(acceptance: Omit<DelegationAcceptance, "acceptanceDigest">) {
  return hashCanonical({ ...acceptanceSigningClaims(acceptance), signature: acceptance.signature });
}

export function verifyDelegationAcceptance(input: { acceptance: DelegationAcceptance; delegation: AuthorityDelegation; credential: NativeCredential; identity: NativeIdentityState; now?: string }) {
  const { acceptance, delegation, credential, identity } = input;
  if (acceptance.enterpriseId !== delegation.enterpriseId || credential.enterpriseId !== delegation.enterpriseId || identity.enterpriseId !== delegation.enterpriseId) throw new DelegatedAuthorityError("The acceptance belongs to another tenant.", "WRONG_TENANT", 403);
  if (acceptance.delegateOperationalEntityId !== delegation.delegateOperationalEntityId || credential.operationalEntityId !== delegation.delegateOperationalEntityId || identity.operationalEntityId !== delegation.delegateOperationalEntityId) throw new DelegatedAuthorityError("The acceptance credential belongs to another entity.", "WRONG_DELEGATE_KEY", 403);
  if (acceptance.delegationId !== delegation.delegationId || acceptance.delegationDigest !== delegation.delegationDigest) throw new DelegatedAuthorityError("The acceptance does not bind the current delegation.", "DELEGATION_DIGEST_MISMATCH", 409);
  if (acceptance.credentialFingerprint !== credential.credentialFingerprint || acceptance.credentialFingerprint !== identity.credentialFingerprint || acceptance.manifestDigest !== identity.manifestDigest) throw new DelegatedAuthorityError("The acceptance is not bound to Beta's current native identity.", "IDENTITY_PROOF_FAILED", 409);
  if (credential.state !== "ACTIVE" || credential.signingKeyId !== acceptance.signingKeyId || identity.status !== "VERIFIED" || time(identity.expiresAt) <= time(input.now ?? new Date().toISOString())) throw new DelegatedAuthorityError("Beta's current native identity proof is unavailable.", "IDENTITY_PROOF_FAILED", 409);
  if (!hashesEqual(deriveAcceptanceDigest(acceptance), acceptance.acceptanceDigest)) throw new DelegatedAuthorityError("The acceptance digest is invalid.", "ACCEPTANCE_DIGEST_MISMATCH", 409);
  if (!verifyDetachedEd25519(acceptanceSigningPayload(acceptance), acceptance.signature, credential.publicJwk)) throw new DelegatedAuthorityError("Beta's acceptance signature is invalid.", "INVALID_SIGNATURE", 409);
  return true;
}

export function buildAuthorityLineage(input: { parentAuthority: ParentAuthority; delegation: AuthorityDelegation; acceptance: DelegationAcceptance }): DelegationLineageEdge[] {
  const revoked = input.parentAuthority.revokedAt || input.delegation.revokedAt;
  const expired = Date.parse(input.delegation.expiresAt) <= Date.now();
  const state: DelegationLineageEdge["revocationState"] = revoked ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE";
  const scopeDigest = delegatedScopeDigest(input.delegation.scope);
  return [
    { issuer: input.parentAuthority.enterpriseId, recipient: input.parentAuthority.accountableOwnerId, relationship: "ENTERPRISE_OWNS", authorityReference: input.parentAuthority.authorityId, scopeDigest: delegatedScopeDigest(input.parentAuthority.scope), version: input.parentAuthority.authorityVersion, effectiveAt: input.parentAuthority.notBefore, expiresAt: input.parentAuthority.expiresAt, policyVersion: input.parentAuthority.policyVersion, evidenceReferences: input.parentAuthority.evidenceReferences, revocationState: input.parentAuthority.revokedAt ? "REVOKED" : "ACTIVE" },
    { issuer: input.parentAuthority.accountableOwnerId, recipient: input.parentAuthority.operationalEntityId, relationship: "HUMAN_AUTHORIZES", authorityReference: input.parentAuthority.authorityId, scopeDigest: delegatedScopeDigest(input.parentAuthority.scope), version: input.parentAuthority.authorityVersion, effectiveAt: input.parentAuthority.notBefore, expiresAt: input.parentAuthority.expiresAt, policyVersion: input.parentAuthority.policyVersion, evidenceReferences: input.parentAuthority.evidenceReferences, revocationState: input.parentAuthority.revokedAt ? "REVOKED" : "ACTIVE" },
    { issuer: input.delegation.delegatorOperationalEntityId, recipient: input.delegation.delegateOperationalEntityId, relationship: "ENTITY_DELEGATES", authorityReference: input.delegation.delegationId, scopeDigest, version: input.delegation.authorityVersion, effectiveAt: input.delegation.notBefore, expiresAt: input.delegation.expiresAt, policyVersion: input.delegation.policyVersion, evidenceReferences: input.delegation.evidenceReferences, revocationState: state },
    { issuer: input.delegation.delegateOperationalEntityId, recipient: input.delegation.delegateOperationalEntityId, relationship: "ENTITY_ACCEPTS", authorityReference: input.acceptance.acceptanceId, scopeDigest, version: input.delegation.authorityVersion, effectiveAt: input.acceptance.acceptedAt, expiresAt: input.delegation.expiresAt, policyVersion: input.delegation.policyVersion, evidenceReferences: [`acceptance:${input.acceptance.acceptanceId}`], revocationState: state },
  ];
}

export function evaluateDelegatedAction(input: {
  parentAuthority: ParentAuthority;
  delegation: AuthorityDelegation;
  acceptance: DelegationAcceptance;
  delegateIdentity: NativeIdentityState;
  action: { type: string; tool: string; target: string; environment: string; purpose: string; dataBoundary: DataBoundary; financialAmount?: number; executionCount?: number; workflowId: string };
  now?: string;
}): { decision: DelegatedActionDecision; reasonCodes: string[]; authorityLineage: DelegationLineageEdge[]; authorityGraph: ReturnType<typeof evaluateAuthorityGraph>; decisionSnapshot: Record<string, unknown> } {
  const now = input.now ?? new Date().toISOString();
  const reasons: string[] = [];
  if (input.delegateIdentity.status !== "VERIFIED" || time(input.delegateIdentity.expiresAt) <= time(now)) reasons.push("IDENTITY_PROOF_FAILED");
  if (input.delegateIdentity.runtimeBinding !== "RUNTIME_MATCH") reasons.push("RUNTIME_CONTINUITY_REVIEW_REQUIRED");
  if (input.delegation.status === "REVOKED" || input.delegation.revokedAt) reasons.push("DELEGATION_REVOKED");
  if (input.parentAuthority.revokedAt) reasons.push("PARENT_AUTHORITY_REVOKED");
  if (time(input.parentAuthority.expiresAt) <= time(now)) reasons.push("PARENT_AUTHORITY_EXPIRED");
  if (input.delegation.status === "EXPIRED" || time(input.delegation.expiresAt) <= time(now)) reasons.push("DELEGATION_EXPIRED");
  if (input.acceptance.delegationDigest !== input.delegation.delegationDigest) reasons.push("DELEGATION_DIGEST_MISMATCH");
  if (!input.delegation.scope.permittedActions.includes(input.action.type)) reasons.push("ACTION_OUT_OF_DELEGATED_SCOPE");
  if (!input.delegation.scope.permittedTools.includes(input.action.tool)) reasons.push("TOOL_OUT_OF_DELEGATED_SCOPE");
  if (!input.delegation.scope.permittedTargets.includes(input.action.target)) reasons.push("TARGET_OUT_OF_DELEGATED_SCOPE");
  if (!input.delegation.scope.environments.includes(input.action.environment)) reasons.push("ENVIRONMENT_OUT_OF_DELEGATED_SCOPE");
  if (dataBoundaryRank[input.action.dataBoundary] > dataBoundaryRank[input.delegation.scope.dataBoundary]) reasons.push("DATA_BOUNDARY_OUT_OF_DELEGATED_SCOPE");
  if (input.delegation.scope.financialLimit !== null && (input.action.financialAmount ?? 0) > input.delegation.scope.financialLimit) reasons.push("FINANCIAL_LIMIT_EXCEEDED");
  if (input.delegation.scope.executionLimit !== null && (input.action.executionCount ?? 1) > input.delegation.scope.executionLimit) reasons.push("EXECUTION_LIMIT_EXCEEDED");

  const grants: AuthorityGrant[] = [
    { id: `enterprise:${input.parentAuthority.authorityId}`, tenantId: input.parentAuthority.enterpriseId, grantorId: input.parentAuthority.enterpriseId, grantorType: "organization", granteeId: input.parentAuthority.accountableOwnerId, granteeType: "human", scope: input.parentAuthority.scope.permittedActions, permittedActions: input.parentAuthority.scope.permittedActions, resourceScope: input.parentAuthority.scope.permittedTargets, maxDelegationDepth: input.parentAuthority.maximumDelegationDepth + 1, issuedAt: input.parentAuthority.issuedAt, expiresAt: input.parentAuthority.expiresAt, revokedAt: input.parentAuthority.revokedAt, evidenceRefs: input.parentAuthority.evidenceReferences },
    { id: input.parentAuthority.authorityId, tenantId: input.parentAuthority.enterpriseId, grantorId: input.parentAuthority.accountableOwnerId, grantorType: "human", granteeId: input.parentAuthority.operationalEntityId, granteeType: "ai_agent", scope: input.parentAuthority.scope.permittedActions, permittedActions: input.parentAuthority.scope.permittedActions, resourceScope: input.parentAuthority.scope.permittedTargets, parentGrantId: `enterprise:${input.parentAuthority.authorityId}`, maxDelegationDepth: input.parentAuthority.maximumDelegationDepth, issuedAt: input.parentAuthority.issuedAt, expiresAt: input.parentAuthority.expiresAt, revokedAt: input.parentAuthority.revokedAt, evidenceRefs: input.parentAuthority.evidenceReferences },
    { id: input.delegation.delegationId, tenantId: input.delegation.enterpriseId, grantorId: input.delegation.delegatorOperationalEntityId, grantorType: "ai_agent", granteeId: input.delegation.delegateOperationalEntityId, granteeType: "ai_agent", scope: input.delegation.scope.permittedActions, permittedActions: input.delegation.scope.permittedActions, resourceScope: input.delegation.scope.permittedTargets, parentGrantId: input.parentAuthority.authorityId, maxDelegationDepth: input.delegation.maximumDelegationDepth, issuedAt: input.delegation.notBefore, expiresAt: input.delegation.expiresAt, revokedAt: input.delegation.revokedAt, evidenceRefs: input.delegation.evidenceReferences, policyVersion: input.delegation.policyVersion, purpose: input.delegation.objective },
  ];
  const authorityGraph = evaluateAuthorityGraph({ tenantId: input.delegation.enterpriseId, subjectId: input.delegation.delegateOperationalEntityId, workflowId: input.action.workflowId, action: input.action.type, purpose: input.action.purpose, requestedScope: [input.action.type], resource: input.action.target, policyVersion: input.delegation.policyVersion, grants, evaluatedAt: now });
  if (!authorityGraph.valid) reasons.push("AUTHORITY_LINEAGE_INVALID");
  const hardReasons = unique(reasons.filter((reason) => reason !== "RUNTIME_CONTINUITY_REVIEW_REQUIRED"));
  const decision: DelegatedActionDecision = hardReasons.length ? "DENY" : reasons.includes("RUNTIME_CONTINUITY_REVIEW_REQUIRED") ? "REVIEW" : "ALLOW";
  const authorityLineage = buildAuthorityLineage(input);
  const reasonCodes = unique([...reasons, ...(decision === "ALLOW" ? ["DELEGATED_AUTHORITY_VALID", "CANONICAL_POLICY_ALLOW"] : [])]);
  return {
    decision,
    reasonCodes,
    authorityLineage,
    authorityGraph,
    decisionSnapshot: {
      snapshotVersion: "delegated-action-decision-v1",
      evaluatedAt: now,
      beta: input.delegateIdentity,
      delegation: { ...input.delegation, signature: undefined },
      delegationDigest: input.delegation.delegationDigest,
      alpha: { operationalEntityId: input.parentAuthority.operationalEntityId, parentAuthority: input.parentAuthority },
      authorityLineage,
      responsibilityLineage: { alphaAccountableOwner: input.parentAuthority.accountableOwnerId, betaAccountableOwner: input.delegateIdentity.accountableOwnerId },
      action: input.action,
      policy: { version: input.delegation.policyVersion },
      decision,
      reasonCodes,
      algorithmVersions: [DELEGATED_AUTHORITY_SUBSET_VERSION, DELEGATION_LINEAGE_VERSION],
      digest: hashCanonical({ delegationDigest: input.delegation.delegationDigest, action: input.action, decision, reasonCodes, evaluatedAt: now }),
    },
  };
}

export function calculateDelegationBlastRadius(input: { rootAuthorityId: string; delegations: AuthorityDelegation[]; workflowReferences?: Record<string, string[]>; pendingTransactionReferences?: Record<string, string[]> }) {
  const affected = new Set<string>([input.rootAuthorityId]);
  const direct: AuthorityDelegation[] = [];
  const dependent: AuthorityDelegation[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const delegation of input.delegations) {
      if (affected.has(delegation.delegationId)) continue;
      const sourceAffected = affected.has(delegation.parentAuthorityId) || Boolean(delegation.parentDelegationId && affected.has(delegation.parentDelegationId));
      if (!sourceAffected) continue;
      affected.add(delegation.delegationId);
      (delegation.parentAuthorityId === input.rootAuthorityId ? direct : dependent).push(delegation);
      changed = true;
    }
  }
  const entities = unique([...direct, ...dependent].map((item) => item.delegateOperationalEntityId));
  return {
    rootAuthorityId: input.rootAuthorityId,
    directAffectedDelegations: direct.map((item) => item.delegationId),
    dependentDelegations: dependent.map((item) => item.delegationId),
    affectedOperationalEntities: entities,
    affectedActions: unique([...direct, ...dependent].flatMap((item) => item.scope.permittedActions)),
    affectedWorkflows: unique(entities.flatMap((entity) => input.workflowReferences?.[entity] ?? [])),
    affectedPendingTransactions: unique(entities.flatMap((entity) => input.pendingTransactionReferences?.[entity] ?? [])),
    classifications: Object.fromEntries(input.delegations.map((item) => [item.delegationId, direct.includes(item) ? "DIRECT" : dependent.includes(item) ? "DEPENDENT" : item.parentAuthorityId === input.rootAuthorityId ? "POTENTIAL" : "UNAFFECTED"])),
    reasonCodes: ["PARENT_AUTHORITY_REVOKED", "DELEGATION_INVALIDATED"],
    algorithmVersion: DELEGATION_LINEAGE_VERSION,
  };
}

export function newDelegationId() {
  return randomUUID();
}
