import "server-only";

import { createHmac } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  registerCanonicalNativeAgent,
  type DelegatedAuthorityContext,
} from "@/lib/operational-entities/delegated-authority-server";
import {
  issueStoredNativeChallenge,
  loadNativeVerification,
  registerNativeCredential,
  registerNativeManifest,
  submitNativeProof,
} from "@/lib/operational-entities/native-verification-server";
import {
  deriveManifestDigest,
  type OperationalEntityManifest,
  type PublicJwk,
} from "@/lib/operational-entities/native-verification";
import { createTrustPolicy } from "@/src/lib/trust-architecture/service";
import { validateTrustContract } from "@/src/lib/trust-fabric/validation";
import { deterministicUuid, hashCanonical } from "@/src/lib/trust-core/hash";
import {
  createReferenceProviderAdapter,
  type ProviderAdapterInput,
} from "@/lib/providers/adapters";
import {
  executeCanonicalTrustTransaction,
  type CanonicalContextEvidence,
  type DeploymentAssuranceEvidence,
  type ExecutionContinuityRecord,
} from "@/src/lib/trust-transaction/canonical";
import { createCanonicalTrustTransactionDependenciesForApiClient } from "@/lib/trust-transaction/server";
import type { PublicApiPrincipal } from "./authentication";
import {
  assertOnlyFields,
  optionalIso,
  PublicApiError,
  requiredText,
  type PublicDecision,
} from "./contracts";
import { emitPublicApiWebhookEvent } from "./webhook-delivery";
import {
  CLIENT_EVIDENCE_CLASSIFICATION,
  resolveClientEvidenceProvider,
  resolveClientEvidenceType,
  verifyClientEvidenceDigest,
} from "./client-evidence";

type Row = Record<string, any>;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const referencePattern = /^[A-Za-z0-9_.:/@-]{1,240}$/;
const publicPolicyId = "external-agent-trust-v1";
const publicPolicyVersion = "0.1.0";

function boundedReferenceArray(value: unknown, field: string, maximum = 32) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum) throw new PublicApiError("INVALID_INPUT", `${field} must be a bounded array.`, 400);
  return [...new Set(value.map((item) => requiredText(item, field, 240, referencePattern)))];
}

function assertNoCallerAuthorityClaims(value: unknown) {
  const forbidden = new Set(["tenant", "tenant_id", "enterprise_id", "verified", "trust_score", "cyber_sentinels_trust_score", "decision", "allow", "deny"]);
  const queue: unknown[] = [value];
  while (queue.length) {
    const current = queue.pop();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) { queue.push(...current); continue; }
    for (const [key, nested] of Object.entries(current as Record<string, unknown>)) {
      if (forbidden.has(key.toLowerCase())) throw new PublicApiError("CALLER_AUTHORITY_CLAIM_REJECTED", `Caller-supplied ${key} is not accepted.`, 400);
      queue.push(nested);
    }
  }
}

function context(principal: PublicApiPrincipal): DelegatedAuthorityContext {
  return {
    enterpriseId: principal.tenantId,
    user: principal.user,
    role: principal.role,
  };
}

function translateRuntimeError(error: unknown): never {
  const candidate = error as { code?: string; status?: number; message?: string };
  if (
    candidate?.code
    && /^[A-Z][A-Z0-9_]{1,79}$/.test(candidate.code)
    && candidate?.status
    && [400, 401, 403, 404, 409, 413, 415, 422, 429, 503].includes(candidate.status)
  ) {
    throw new PublicApiError(candidate.code, "The canonical trust runtime rejected the request.", candidate.status);
  }
  throw error;
}

async function entityFor(principal: PublicApiPrincipal, agentId: string) {
  const db = createServiceRoleClient();
  const binding = await db.from("public_api_agent_bindings").select("operational_entity_id").eq("tenant_id", principal.tenantId).eq("client_id", principal.clientId).eq("operational_entity_id", agentId).maybeSingle();
  if (binding.error) throw new PublicApiError("AGENT_LOOKUP_UNAVAILABLE", "The agent could not be resolved safely.", 503);
  if (!binding.data) throw new PublicApiError("AGENT_NOT_FOUND", "The agent is not bound to this API client.", 404);
  const entity = await db.from("operational_entities").select("*").eq("enterprise_id", principal.tenantId).eq("entity_id", agentId).maybeSingle();
  if (entity.error) throw new PublicApiError("AGENT_LOOKUP_UNAVAILABLE", "The agent could not be resolved safely.", 503);
  if (!entity.data) throw new PublicApiError("AGENT_NOT_FOUND", "The agent was not found in this tenant.", 404);
  return entity.data as Row;
}

async function ensurePublicApiPolicy(principal: PublicApiPrincipal) {
  const db = createServiceRoleClient();
  const policy = await db
    .from("trust_policy_versions")
    .select("policy_id")
    .eq("enterprise_id", principal.tenantId)
    .eq("policy_id", publicPolicyId)
    .eq("version", publicPolicyVersion)
    .maybeSingle();
  if (policy.error) throw new PublicApiError("AUTHORITY_UNAVAILABLE", "Agent authority could not be prepared safely.", 503);
  if (!policy.data) {
    await createTrustPolicy({
      enterpriseId: principal.tenantId,
      actorId: principal.clientId,
      correlationId: crypto.randomUUID(),
      value: {
        policyId: publicPolicyId,
        version: publicPolicyVersion,
        layer: "ENTERPRISE_OVERRIDE",
        active: true,
        validFrom: new Date(Date.now() - 1_000).toISOString(),
        rules: {
          purpose: "customer_bounded_authority",
          allowedActions: ["bounded_by_trust_contract"],
          requiredEvidenceTypes: ["NATIVE_ENTITY_IDENTITY_PROOF"],
          providerDependency: "none",
        },
      },
    });
  }
}

export async function registerExternalAgent(principal: PublicApiPrincipal, body: Record<string, unknown>) {
  assertOnlyFields(body, ["display_name", "entity_type", "owner_reference", "runtime", "model"]);
  const displayName = requiredText(body.display_name, "display_name", 120);
  if (body.entity_type !== "AI_AGENT") throw new PublicApiError("ENTITY_TYPE_UNSUPPORTED", "Only AI_AGENT is supported in v0.1.", 400);
  const ownerReference = requiredText(body.owner_reference, "owner_reference", 180, referencePattern);
  const runtime = body.runtime as Record<string, unknown> | undefined;
  const model = body.model as Record<string, unknown> | undefined;
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) throw new PublicApiError("INVALID_INPUT", "runtime is required.", 400);
  if (!model || typeof model !== "object" || Array.isArray(model)) throw new PublicApiError("INVALID_INPUT", "model is required.", 400);
  assertOnlyFields(runtime, ["environment", "framework"]);
  assertOnlyFields(model, ["provider", "identifier"]);
  const environment = requiredText(runtime.environment, "runtime.environment", 80, referencePattern);
  const framework = requiredText(runtime.framework, "runtime.framework", 80, referencePattern);
  const provider = requiredText(model.provider, "model.provider", 120, referencePattern);
  const identifier = requiredText(model.identifier, "model.identifier", 120, referencePattern);
  const agentId = `agent:${crypto.randomUUID()}`;
  try {
    await registerCanonicalNativeAgent(context(principal), {
      displayReference: displayName,
      entityId: agentId,
      accountableOwnerId: ownerReference,
      organizationReference: `tenant:${principal.tenantId}`,
      environmentReference: environment,
      workflowReference: "external-agent-api",
    });
  } catch (error) {
    translateRuntimeError(error);
  }
  const db = createServiceRoleClient();
  const bound = await db.from("public_api_agent_bindings").insert({ tenant_id: principal.tenantId, operational_entity_id: agentId, client_id: principal.clientId });
  if (bound.error) throw new PublicApiError("AGENT_BINDING_UNAVAILABLE", "The external agent could not be bound to this API client safely.", 503);
  return {
    agent_id: agentId,
    operational_entity_id: agentId,
    status: "PENDING_IDENTITY_PROOF",
    next_step: "REGISTER_CREDENTIAL",
    manifest_context: {
      enterprise_id: principal.tenantId,
      display_name: displayName,
      accountable_owner_id: ownerReference,
      organization_id: `tenant:${principal.tenantId}`,
      environment,
      framework,
      model: { provider, identifier },
      authority_reference: null,
    },
  };
}

export async function getExternalAgent(principal: PublicApiPrincipal, agentId: string) {
  const entity = await entityFor(principal, agentId);
  let authority: Awaited<ReturnType<typeof getExternalAuthority>> | null = null;
  try { authority = await getExternalAuthority(principal, agentId); } catch (error) {
    if (!(error instanceof PublicApiError) || error.code !== "AUTHORITY_NOT_FOUND") throw error;
  }
  return {
    agent_id: String(entity.entity_id),
    operational_entity_id: String(entity.entity_id),
    entity_type: String(entity.entity_type).toUpperCase(),
    display_name: String(entity.display_reference),
    lifecycle_state: String(entity.lifecycle_state),
    accountable_owner_reference: String(entity.accountable_owner_id),
    authority_reference: authority?.authority_reference ?? null,
    authority_version: authority?.authority_version ?? null,
    authority_status: authority?.status ?? "UNASSIGNED",
  };
}

export async function registerExternalCredential(principal: PublicApiPrincipal, agentId: string, body: Record<string, unknown>) {
  await entityFor(principal, agentId);
  assertOnlyFields(body, ["public_jwk", "kid", "algorithm", "expires_at", "rotate_from_credential_id"]);
  if (body.algorithm !== "Ed25519" && body.algorithm !== "EdDSA") {
    throw new PublicApiError("UNSUPPORTED_ALGORITHM", "Only Ed25519 is supported in v0.1.", 400);
  }
  const kid = requiredText(body.kid, "kid", 180, referencePattern);
  try {
    const result = await registerNativeCredential(context(principal), agentId, {
      publicJwk: body.public_jwk as PublicJwk,
      signingKeyId: kid,
      authorizationReference: `api-client:${principal.clientId}`,
      expiresAt: optionalIso(body.expires_at, "expires_at"),
      rotateFromCredentialId: body.rotate_from_credential_id,
    });
    return {
      credential_id: result.credentialId,
      kid: result.signingKeyId,
      algorithm: result.algorithm,
      fingerprint: result.credentialFingerprint,
      status: result.state,
      private_key_stored: false,
    };
  } catch (error) {
    translateRuntimeError(error);
  }
}

function publicManifestClaims(body: Record<string, unknown>) {
  assertOnlyFields(body, [
    "manifest_version", "operational_entity_id", "entity_type", "owner_reference", "model", "runtime",
    "environment", "declared_capabilities", "credential_id", "issued_at", "expires_at", "nonce", "signature",
  ]);
  const model = body.model as Record<string, unknown>;
  const runtime = body.runtime as Record<string, unknown>;
  if (!model || typeof model !== "object" || Array.isArray(model)) throw new PublicApiError("INVALID_INPUT", "model is required.", 400);
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) throw new PublicApiError("INVALID_INPUT", "runtime is required.", 400);
  assertOnlyFields(model, ["provider", "identifier", "version"]);
  assertOnlyFields(runtime, ["framework", "runtime_type", "region", "version", "workload_identifier", "deployment_identifier", "build_digest"]);
  const capabilities = Array.isArray(body.declared_capabilities)
    ? [...new Set(body.declared_capabilities.map(String))].sort()
    : [];
  if (capabilities.length > 128 || capabilities.some((item) => !/^[a-z][a-z0-9_.:-]{0,127}$/.test(item))) {
    throw new PublicApiError("CAPABILITY_MANIFEST_INVALID", "declared_capabilities is invalid.", 400);
  }
  return {
    manifest_version: body.manifest_version,
    operational_entity_id: requiredText(body.operational_entity_id, "operational_entity_id", 180, referencePattern),
    entity_type: body.entity_type,
    owner_reference: requiredText(body.owner_reference, "owner_reference", 180, referencePattern),
    model: {
      provider: requiredText(model.provider, "model.provider", 120, referencePattern),
      identifier: requiredText(model.identifier, "model.identifier", 120, referencePattern),
      version: model.version ? requiredText(model.version, "model.version", 120, referencePattern) : null,
    },
    runtime: {
      framework: requiredText(runtime.framework, "runtime.framework", 120, referencePattern),
      runtime_type: runtime.runtime_type ? requiredText(runtime.runtime_type, "runtime.runtime_type", 120, referencePattern) : null,
      region: runtime.region ? requiredText(runtime.region, "runtime.region", 120, referencePattern) : null,
      version: runtime.version ? requiredText(runtime.version, "runtime.version", 120, referencePattern) : null,
      workload_identifier: runtime.workload_identifier ? requiredText(runtime.workload_identifier, "runtime.workload_identifier", 180, referencePattern) : null,
      deployment_identifier: runtime.deployment_identifier ? requiredText(runtime.deployment_identifier, "runtime.deployment_identifier", 180, referencePattern) : null,
      build_digest: runtime.build_digest ? requiredText(runtime.build_digest, "runtime.build_digest", 64, /^[a-f0-9]{64}$/) : null,
    },
    environment: requiredText(body.environment, "environment", 120, referencePattern),
    declared_capabilities: capabilities,
    credential_id: requiredText(body.credential_id, "credential_id", 180, referencePattern),
    issued_at: optionalIso(body.issued_at, "issued_at") ?? new Date().toISOString(),
    expires_at: optionalIso(body.expires_at, "expires_at") ?? "",
    nonce: requiredText(body.nonce, "nonce", 256, /^[A-Za-z0-9_-]{22,256}$/),
  };
}

export async function registerExternalManifest(principal: PublicApiPrincipal, agentId: string, body: Record<string, unknown>) {
  const entity = await entityFor(principal, agentId);
  const claims = publicManifestClaims(body);
  if (claims.manifest_version !== "1.0" || claims.entity_type !== "AI_AGENT") {
    throw new PublicApiError("MANIFEST_VERSION_UNSUPPORTED", "Only AI_AGENT manifest version 1.0 is supported.", 400);
  }
  if (claims.operational_entity_id !== agentId || claims.owner_reference !== String(entity.accountable_owner_id)) {
    throw new PublicApiError("MANIFEST_ENTITY_MISMATCH", "The manifest does not match the tenant-scoped agent.", 403);
  }
  const db = createServiceRoleClient();
  const credential = await db
    .from("operational_entity_native_credentials")
    .select("credential_id,signing_key_id")
    .eq("enterprise_id", principal.tenantId)
    .eq("operational_entity_id", agentId)
    .eq("credential_id", claims.credential_id)
    .in("state", ["ACTIVE", "PENDING"])
    .maybeSingle();
  if (credential.error) throw new PublicApiError("CREDENTIAL_LOOKUP_UNAVAILABLE", "The credential could not be resolved safely.", 503);
  if (!credential.data) throw new PublicApiError("UNKNOWN_SIGNING_KEY", "The credential is not active for this agent.", 409);
  const expiresAt = claims.expires_at;
  if (!expiresAt || Date.parse(expiresAt) <= Date.now()) throw new PublicApiError("MANIFEST_EXPIRED", "expires_at must be in the future.", 409);
  const authorityReference = Array.isArray(entity.current_authority_references)
    ? String(entity.current_authority_references[0] ?? "") || null
    : null;
  const manifestBase: OperationalEntityManifest = {
    manifestVersion: "1.0",
    operationalEntityId: agentId,
    entityType: "AI_AGENT",
    displayName: String(entity.display_reference),
    enterpriseId: principal.tenantId,
    owner: { accountableOwnerId: String(entity.accountable_owner_id), organizationId: String(entity.organization_reference) },
    software: {
      applicationId: null,
      version: null,
      buildDigest: claims.runtime.build_digest,
      sourceDigest: null,
      artifactDigest: null,
      packageReference: null,
    },
    ai: {
      modelProvider: claims.model.provider,
      modelIdentifier: claims.model.identifier,
      modelVersion: claims.model.version,
      agentFramework: claims.runtime.framework,
      declaredTools: [],
    },
    runtime: {
      runtimeType: claims.runtime.runtime_type ?? claims.runtime.framework,
      environment: claims.environment,
      region: claims.runtime.region,
      workloadIdentifier: claims.runtime.workload_identifier,
      deploymentIdentifier: claims.runtime.deployment_identifier,
      runtimeVersion: claims.runtime.version,
    },
    authority: { authorityReference },
    credentials: { publicCredentialReferences: [String(credential.data.signing_key_id)] },
    declaredCapabilities: claims.declared_capabilities,
    issuedAt: claims.issued_at,
    expiresAt,
    nonce: claims.nonce,
    signingKeyId: String(credential.data.signing_key_id),
    manifestDigest: "",
    signature: requiredText(body.signature, "signature", 128, /^[A-Za-z0-9_-]{86}$/),
    signatureProfile: "PUBLIC_MANIFEST_V1",
    signedPublicManifest: claims,
  };
  manifestBase.manifestDigest = deriveManifestDigest(manifestBase);
  try {
    const result = await registerNativeManifest(context(principal), agentId, manifestBase);
    return {
      manifest_id: result.manifestId,
      manifest_digest: result.manifestDigest,
      status: result.status,
      classification: {
        declared: ["entity_type", "owner_reference", "model", "runtime", "environment", "declared_capabilities"],
        verified: ["credential_signature", "operational_entity_binding", "tenant_binding"],
        derived: ["manifest_digest", "credential_fingerprint"],
      },
    };
  } catch (error) {
    translateRuntimeError(error);
  }
}

export async function issueExternalChallenge(principal: PublicApiPrincipal, agentId: string, audience: string) {
  await entityFor(principal, agentId);
  try {
    const challenge = await issueStoredNativeChallenge(context(principal), agentId, audience);
    return {
      challenge_id: challenge.challengeId,
      nonce: challenge.nonce,
      audience: challenge.audience,
      issuer: challenge.issuer,
      subject: challenge.subject,
      operational_entity_id: challenge.operationalEntityId,
      manifest_digest: challenge.manifestDigest,
      signing_key_id: challenge.signingKeyId,
      issued_at: challenge.issuedAt,
      expires_at: challenge.expiresAt,
    };
  } catch (error) {
    translateRuntimeError(error);
  }
}

export async function submitExternalProof(principal: PublicApiPrincipal, agentId: string, body: Record<string, unknown>, expectedAudience: string) {
  await entityFor(principal, agentId);
  assertOnlyFields(body, ["challenge_id", "credential_id", "signature", "signed_payload"]);
  const payload = body.signed_payload as Record<string, unknown>;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new PublicApiError("NATIVE_PROOF_REQUIRED", "signed_payload is required.", 400);
  assertOnlyFields(payload, ["challenge_id", "enterprise_id", "operational_entity_id", "nonce", "audience", "issuer", "subject", "manifest_digest", "signing_key_id", "issued_at", "expires_at", "submitted_at"]);
  const db = createServiceRoleClient();
  const credential = await db
    .from("operational_entity_native_credentials")
    .select("credential_id,signing_key_id")
    .eq("enterprise_id", principal.tenantId)
    .eq("operational_entity_id", agentId)
    .eq("credential_id", requiredText(body.credential_id, "credential_id", 180, referencePattern))
    .maybeSingle();
  if (credential.error) throw new PublicApiError("CREDENTIAL_LOOKUP_UNAVAILABLE", "The credential could not be resolved safely.", 503);
  if (!credential.data || String(payload.signing_key_id) !== String(credential.data.signing_key_id)) {
    throw new PublicApiError("UNKNOWN_SIGNING_KEY", "The proof credential is not bound to this agent.", 409);
  }
  try {
    const submitted = optionalIso(payload.submitted_at, "signed_payload.submitted_at") ?? new Date().toISOString();
    const result = await submitNativeProof(context(principal), agentId, {
      proof: {
        challengeId: requiredText(body.challenge_id, "challenge_id", 180, referencePattern),
        enterpriseId: requiredText(payload.enterprise_id, "signed_payload.enterprise_id", 180, referencePattern),
        operationalEntityId: requiredText(payload.operational_entity_id, "signed_payload.operational_entity_id", 180, referencePattern),
        nonce: requiredText(payload.nonce, "signed_payload.nonce", 256, /^[A-Za-z0-9_-]{22,256}$/),
        audience: requiredText(payload.audience, "signed_payload.audience", 180, referencePattern),
        manifestDigest: requiredText(payload.manifest_digest, "signed_payload.manifest_digest", 64, /^[a-f0-9]{64}$/),
        signingKeyId: requiredText(payload.signing_key_id, "signed_payload.signing_key_id", 180, referencePattern),
        signature: requiredText(body.signature, "signature", 128, /^[A-Za-z0-9_-]{86}$/),
        submittedAt: submitted,
      },
      runtimeObservation: null,
      softwareObservation: null,
    }, expectedAudience);
    if (!result.result.evidence) {
      throw new PublicApiError(
        result.result.reasonCodes[0] ?? "PROOF_REJECTED",
        "The cryptographic proof was rejected.",
        409,
      );
    }
    return {
      identity: "VERIFIED",
      trust: "NOT_DETERMINED_BY_IDENTITY",
      verification_id: result.result.verificationId,
      evidence_references: result.result.evidenceReferences,
      evidence_provenance: result.result.evidence.provenance,
      continuity: result.result.continuityResult,
      reason_codes: result.result.reasonCodes,
      canonical_reevaluation: result.canonicalReevaluation,
    };
  } catch (error) {
    translateRuntimeError(error);
  }
}

function authorityView(row: Row, identityCurrent: boolean) {
  const value = row.contract as Row;
  const scope = (value.authorityScope ?? {}) as Row;
  const active = row.revocation_state === "active"
    && Date.parse(String(row.issued_at)) <= Date.now()
    && Date.parse(String(row.expires_at)) > Date.now();
  return {
    authority_id: String(row.contract_id),
    authority_reference: String(row.contract_id),
    authority_version: value.authorityVersion ?? null,
    status: !active ? row.revocation_state === "revoked" ? "REVOKED" : Date.parse(String(row.expires_at)) <= Date.now() ? "EXPIRED" : "SCHEDULED" : identityCurrent ? "ACTIVE" : "PENDING_IDENTITY",
    action: String((scope.permittedActions ?? value.permittedScope ?? [])[0] ?? ""),
    actions: scope.permittedActions ?? value.permittedScope ?? [],
    target: String((scope.permittedTargets ?? [])[0] ?? ""),
    targets: scope.permittedTargets ?? [],
    purpose: String(value.authorizedObjective ?? ""),
    tools: scope.permittedTools ?? [],
    environment: scope.environments ?? [],
    valid_from: String(row.issued_at),
    expires_at: String(row.expires_at),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    supersedes_authority_id: value.supersedesContractId ?? null,
    issuer: value.issuer,
    approver: value.approver,
    delegated_from: null,
    delegation_depth: 0,
  };
}

async function currentIdentity(principal: PublicApiPrincipal, agentId: string) {
  const db = createServiceRoleClient();
  const verification = await db.from("native_entity_identity_evidence").select("evidence_id,expires_at").eq("enterprise_id", principal.tenantId).eq("operational_entity_id", agentId).is("revoked_at", null).order("verified_at", { ascending: false }).limit(1).maybeSingle();
  if (verification.error) throw new PublicApiError("AUTHORITY_UNAVAILABLE", "Authority identity state could not be resolved safely.", 503);
  return Boolean(verification.data && Date.parse(String(verification.data.expires_at)) > Date.now());
}

export async function listExternalAuthorities(principal: PublicApiPrincipal, agentId: string) {
  await entityFor(principal, agentId);
  const db = createServiceRoleClient();
  const [contracts, identityCurrent] = await Promise.all([
    db.from("trust_contracts").select("contract_id,contract,revocation_state,revoked_at,issued_at,expires_at,created_at").eq("enterprise_id", principal.tenantId).eq("subject_type", "ai_agent").eq("subject_id", agentId).order("issued_at", { ascending: false }).limit(100),
    currentIdentity(principal, agentId),
  ]);
  if (contracts.error) throw new PublicApiError("AUTHORITY_UNAVAILABLE", "Authority history could not be resolved safely.", 503);
  return { authorities: (contracts.data ?? []).map((row) => authorityView(row as Row, identityCurrent)) };
}

export async function getExternalAuthorityById(principal: PublicApiPrincipal, agentId: string, authorityId: string) {
  await entityFor(principal, agentId);
  if (!uuidPattern.test(authorityId)) throw new PublicApiError("AUTHORITY_NOT_FOUND", "The authority is unavailable to this API client.", 404);
  const db = createServiceRoleClient();
  const [contract, identityCurrent] = await Promise.all([
    db.from("trust_contracts").select("contract_id,contract,revocation_state,revoked_at,issued_at,expires_at,created_at").eq("enterprise_id", principal.tenantId).eq("subject_type", "ai_agent").eq("subject_id", agentId).eq("contract_id", authorityId).maybeSingle(),
    currentIdentity(principal, agentId),
  ]);
  if (contract.error) throw new PublicApiError("AUTHORITY_UNAVAILABLE", "Authority could not be resolved safely.", 503);
  if (!contract.data) throw new PublicApiError("AUTHORITY_NOT_FOUND", "The authority is unavailable to this API client.", 404);
  return authorityView(contract.data as Row, identityCurrent);
}

export async function getExternalAuthority(principal: PublicApiPrincipal, agentId: string) {
  const result = await listExternalAuthorities(principal, agentId);
  const authority = result.authorities[0];
  if (!authority) throw new PublicApiError("AUTHORITY_NOT_FOUND", "No authority is assigned to this agent.", 404);
  return authority;
}

function authorityAdministration(principal: PublicApiPrincipal) {
  if (!principal.scopes.includes("authority:write") || !["owner", "admin"].includes(principal.role)) {
    throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "This API principal cannot administer authority.", 403);
  }
  if (!principal.authorityManagementBoundary) {
    throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "This API key has no authority-management boundary.", 403);
  }
  return principal.authorityManagementBoundary;
}

function authorityRpcFailure(error: { message?: string } | null): never {
  const message = String(error?.message ?? "");
  if (/not owned|not found/i.test(message)) throw new PublicApiError("AUTHORITY_NOT_FOUND", "The authority or agent is unavailable to this API client.", 404);
  if (/verified current agent identity/i.test(message)) throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "Current verified agent identity is required before authority can be granted.", 409);
  if (/boundary|forbidden|backdating|scheduling|expiry/i.test(message)) throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "The authority grant is outside this principal's administrative boundary.", 403);
  if (/version conflict/i.test(message)) throw new PublicApiError("IDEMPOTENCY_CONFLICT", "The authority version changed; reload authority history before retrying.", 409);
  throw new PublicApiError("AUTHORITY_UNAVAILABLE", "Authority could not be changed safely.", 503);
}

export async function grantExternalAuthority(principal: PublicApiPrincipal, agentId: string, body: Record<string, unknown>, correlationId: string) {
  const boundary = authorityAdministration(principal);
  const entity = await entityFor(principal, agentId);
  assertOnlyFields(body, ["action", "target", "purpose", "environment", "valid_from", "expires_at", "data_boundary", "execution_limit"]);
  const action = requiredText(body.action, "action", 120, referencePattern);
  const target = requiredText(body.target, "target", 240, referencePattern);
  const purpose = requiredText(body.purpose, "purpose", 180, referencePattern);
  const environment = requiredText(body.environment, "environment", 120, referencePattern);
  if (!boundary.actions.includes(action) || !boundary.purposes.includes(purpose) || !boundary.environments.includes(environment) || !boundary.targetPrefixes.some((prefix) => target.startsWith(prefix))) {
    throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "The requested authority exceeds this API key's management boundary.", 403);
  }
  const entityEnvironments = Array.isArray(entity.environment_references) ? entity.environment_references.map(String) : [];
  if (entityEnvironments.length && !entityEnvironments.includes(environment)) {
    throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "The authority environment does not match the registered agent environment.", 403);
  }
  const validFrom = optionalIso(body.valid_from, "valid_from") ?? new Date().toISOString();
  const expiresAt = optionalIso(body.expires_at, "expires_at");
  if (!expiresAt) throw new PublicApiError("INVALID_REQUEST", "expires_at is required; indefinite authority is not supported.", 400);
  if (Date.parse(validFrom) < Date.now() - 60_000 || Date.parse(validFrom) > Date.now() + 300_000) {
    throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "valid_from cannot backdate authority or schedule it more than five minutes ahead.", 403);
  }
  if (Date.parse(expiresAt) <= Date.parse(validFrom) || Date.parse(expiresAt) - Date.parse(validFrom) > boundary.maxTtlSeconds * 1000) {
    throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "expires_at exceeds the API key's maximum authority lifetime.", 403);
  }
  const dataBoundary = String(body.data_boundary ?? "INTERNAL").toUpperCase();
  if (!["PUBLIC", "INTERNAL"].includes(dataBoundary)) throw new PublicApiError("INVALID_REQUEST", "Public V1 authority supports PUBLIC or INTERNAL data boundaries.", 400);
  const executionLimit = body.execution_limit === undefined ? 100 : Number(body.execution_limit);
  if (!Number.isSafeInteger(executionLimit) || executionLimit < 1 || executionLimit > 10_000) throw new PublicApiError("INVALID_REQUEST", "execution_limit must be between 1 and 10000.", 400);
  if (!await currentIdentity(principal, agentId)) throw new PublicApiError("AUTHORITY_GRANT_FORBIDDEN", "Current verified agent identity is required before authority can be granted.", 409);
  await ensurePublicApiPolicy(principal);
  const db = createServiceRoleClient();
  const latest = await db.from("trust_contracts").select("contract_id").eq("enterprise_id", principal.tenantId).eq("subject_type", "ai_agent").eq("subject_id", agentId).order("issued_at", { ascending: false }).limit(1).maybeSingle();
  if (latest.error) throw new PublicApiError("AUTHORITY_UNAVAILABLE", "Authority history could not be resolved safely.", 503);
  const contractId = crypto.randomUUID();
  const contract = validateTrustContract({
    contractId,
    subject: { type: "ai_agent", id: agentId, displayName: String(entity.display_reference ?? agentId) },
    workflow: { id: "external-agent-api", objective: `Customer-authorized ${action} on ${target}.` },
    authorizedObjective: purpose,
    requiredIdentityState: "verified",
    requiredAuthority: ["tenant_admin_grant"],
    requiredEnvironmentState: "degraded",
    permittedScope: [action],
    permittedProviders: ["cyber_sentinels_native"],
    requiredEvidenceTypes: ["NATIVE_ENTITY_IDENTITY_PROOF"],
    maximumEvidenceAgeSeconds: 3_600,
    monitoringRequirements: [],
    humanReviewThresholds: [],
    contradictionPolicy: "review",
    incidentThreshold: "material",
    expiresAt,
    revokedAt: null,
    revocationState: "active",
    issuer: `tenant-admin:${principal.createdBy}`,
    approver: `api-client:${principal.clientId}`,
    policyId: publicPolicyId,
    policyVersion: publicPolicyVersion,
    evidenceReferences: [{ type: "native_identity_evidence", id: agentId }],
    issuedAt: validFrom,
    supersedesContractId: latest.data?.contract_id ? String(latest.data.contract_id) : null,
    authorityScope: { permittedActions: [action], permittedTools: [], permittedTargets: [target], environments: [environment], dataBoundary, financialLimit: 0, executionLimit },
    canDelegate: false,
    maximumDelegationDepth: 0,
    authorityVersion: `customer-authority:${contractId}`,
  }, principal.tenantId);
  const recordHash = hashCanonical(contract as unknown as Record<string, unknown>);
  const persisted = await db.rpc("persist_public_api_authority_v1", { p_tenant_id: principal.tenantId, p_key_id: principal.keyId, p_client_id: principal.clientId, p_agent_id: agentId, p_contract: contract, p_record_hash: recordHash, p_correlation_id: correlationId });
  if (persisted.error) authorityRpcFailure(persisted.error);
  return getExternalAuthorityById(principal, agentId, contractId);
}

export async function revokeExternalAuthority(principal: PublicApiPrincipal, agentId: string, authorityId: string, body: Record<string, unknown>, correlationId: string) {
  authorityAdministration(principal);
  await entityFor(principal, agentId);
  if (!uuidPattern.test(authorityId)) throw new PublicApiError("AUTHORITY_NOT_FOUND", "The authority is unavailable to this API client.", 404);
  assertOnlyFields(body, ["reason"]);
  const reason = requiredText(body.reason, "reason", 500, /^[A-Za-z0-9_.:/@,;'() -]+$/);
  const db = createServiceRoleClient();
  const result = await db.rpc("revoke_public_api_authority_v1", { p_tenant_id: principal.tenantId, p_key_id: principal.keyId, p_client_id: principal.clientId, p_agent_id: agentId, p_authority_id: authorityId, p_reason: reason, p_correlation_id: correlationId });
  if (result.error) authorityRpcFailure(result.error);
  return { authority_id: authorityId, authority_reference: authorityId, status: "REVOKED", revocation_reference: `authority-revocation:${authorityId}`, correlation_id: correlationId };
}

export async function getExternalTrustState(principal: PublicApiPrincipal, agentId: string) {
  await entityFor(principal, agentId);
  const native = await loadNativeVerification(context(principal), agentId);
  const latest = native.verifications[0] as Row | undefined;
  let authority: Awaited<ReturnType<typeof getExternalAuthority>> | null = null;
  try { authority = await getExternalAuthority(principal, agentId); } catch (error) {
    if (!(error instanceof PublicApiError) || error.code !== "AUTHORITY_NOT_FOUND") throw error;
  }
  const lastMaterial = [...native.replay]
    .reverse()
    .find((event: Row) => ["ENTITY_CHANGED", "CREDENTIAL_ROTATED", "CREDENTIAL_REVOKED", "AUTHORITY_REVOKED", "MANIFEST_REVOKED"].includes(String(event.event_type))) as Row | undefined;
  return {
    identity: latest?.evidence_references?.length ? "VERIFIED" : "UNVERIFIED",
    authority: authority?.status ?? "UNASSIGNED",
    continuity: latest?.continuity_result ?? "UNKNOWN",
    health: latest?.status === "VERIFIED" ? "HEALTHY" : latest ? "DEGRADED" : "UNKNOWN",
    drift: Array.isArray(latest?.changed_attributes) && latest.changed_attributes.length ? "MATERIAL_CHANGE" : "NONE_OBSERVED",
    confidence: latest?.status === "VERIFIED" ? "HIGH" : latest ? "LIMITED" : "INSUFFICIENT",
    stability: latest?.continuity_result === "CONTINUITY_PRESERVED" ? "STABLE" : "UNESTABLISHED",
    current_restrictions: authority?.status === "ACTIVE" ? [] : ["NO_EXECUTION_AUTHORIZATION"],
    last_material_change: lastMaterial ? { event_type: lastMaterial.event_type, occurred_at: lastMaterial.occurred_at } : null,
  };
}

function executionAuthorization(receipt: Row) {
  if (receipt.decision !== "ALLOW") return null;
  const secret = process.env.PUBLIC_API_EXECUTION_SIGNING_SECRET?.trim() || process.env.TRUST_ACTION_RELAY_SECRET?.trim();
  if (!secret) return null;
  const artifact = {
    version: "transaction-execution-authorization-v1",
    transaction_id: receipt.transactionId,
    operational_entity_id: receipt.operationalEntityId,
    action: receipt.action.type,
    target: receipt.action.resource,
    decision_digest: receipt.digest,
    audience: "external-executor",
    nonce: crypto.randomUUID(),
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
  return { ...artifact, signature: `sha256=${createHmac("sha256", secret).update(JSON.stringify(artifact)).digest("hex")}` };
}

function consequenceTimeProjection(snapshot: Row | null | undefined) {
  const value = snapshot?.consequenceTime;
  if (!value || typeof value !== "object") return null;
  const conditions = value.currentConditions ?? {};
  const currentConditionReferences = [...new Set([
    ...(Array.isArray(conditions.evidenceReferences) ? conditions.evidenceReferences.map(String) : []),
    conditions.runtimeAuthorityEvidenceReference ? String(conditions.runtimeAuthorityEvidenceReference) : null,
    conditions.destinationAuthorityEvidenceReference ? String(conditions.destinationAuthorityEvidenceReference) : null,
    conditions.humanApprovalReference ? String(conditions.humanApprovalReference) : null,
    ...(Array.isArray(conditions.materialChangeReferences) ? conditions.materialChangeReferences.map(String) : []),
  ].filter((item): item is string => Boolean(item)))];
  return {
    evaluated_at: value.evaluatedAt,
    agent_identity_reference: value.agentIdentityReference,
    authority: value.authority,
    delegation_lineage: value.delegationLineage ?? [],
    intent: value.intent,
    current_conditions: {
      identity_assurance: conditions.identityAssurance,
      evidence_complete: conditions.evidenceComplete,
      evidence_fresh: conditions.evidenceFresh,
      policy_reference: conditions.policyReference,
      policy_version: conditions.policyVersion,
      runtime_authority_state: conditions.runtimeAuthorityState,
      destination_authority_state: conditions.destinationAuthorityState,
      authorization_propagation_state: conditions.authorizationPropagationState,
      material_changes: conditions.materialChanges ?? [],
      material_change_references: conditions.materialChangeReferences ?? [],
      human_approval_required: conditions.humanApprovalRequired,
      human_approval_state: conditions.humanApprovalState,
      current_condition_references: currentConditionReferences,
    },
    consequence: value.consequence,
    canonical_decision: value.canonicalDecision,
    reason_codes: value.reasonCodes ?? [],
    previous_evaluation: value.previousEvaluation,
    decision_differs_from_previous: Boolean(value.decisionDiffersFromPrevious),
    previous_allow_standing_authorization: false,
  };
}

export async function requestExternalDecision(principal: PublicApiPrincipal, body: Record<string, unknown>, idempotencyKey: string, origin: string, correlationId?: string) {
  assertOnlyFields(body, ["operational_entity_id", "action", "idempotency_key", "decision_type", "context"]);
  const agentId = requiredText(body.operational_entity_id, "operational_entity_id", 180, referencePattern);
  await entityFor(principal, agentId);
  const action = body.action as Record<string, unknown>;
  if (!action || typeof action !== "object" || Array.isArray(action)) throw new PublicApiError("INVALID_INPUT", "action is required.", 400);
  assertOnlyFields(action, ["type", "target", "purpose", "environment"]);
  const decisionType = body.decision_type ? requiredText(body.decision_type, "decision_type", 120, /^[A-Za-z0-9_.:-]+$/) : null;
  const deploymentContext = body.context && typeof body.context === "object" && !Array.isArray(body.context)
    ? (body.context as Record<string, unknown>)
    : null;
  if (deploymentContext) assertOnlyFields(deploymentContext, [
    "environment", "release", "material_changes", "mission", "monitoring", "sensor_evidence", "command_target", "execution_stages", "oversight",
    "intent_reference", "previous_transaction_id", "authority_version", "policy_version", "current_evidence_references", "material_change_references", "human_approval_reference",
  ]);
  const materialChanges = deploymentContext && Array.isArray(deploymentContext.material_changes)
    ? deploymentContext.material_changes.filter((item): item is string => typeof item === "string")
    : deploymentContext && Array.isArray(deploymentContext.materialChanges)
      ? deploymentContext.materialChanges.filter((item): item is string => typeof item === "string")
      : [];
  if (materialChanges.length > 32) throw new PublicApiError("INVALID_INPUT", "context.material_changes must be bounded.", 400);
  const intentReference = deploymentContext?.intent_reference ? requiredText(deploymentContext.intent_reference, "context.intent_reference", 240, referencePattern) : null;
  const previousTransactionId = deploymentContext?.previous_transaction_id ? requiredText(deploymentContext.previous_transaction_id, "context.previous_transaction_id", 36, uuidPattern) : null;
  const expectedAuthorityVersion = deploymentContext?.authority_version ? requiredText(deploymentContext.authority_version, "context.authority_version", 180, referencePattern) : null;
  const expectedPolicyVersion = deploymentContext?.policy_version ? requiredText(deploymentContext.policy_version, "context.policy_version", 180, referencePattern) : null;
  const currentEvidenceReferences = boundedReferenceArray(deploymentContext?.current_evidence_references, "context.current_evidence_references");
  const materialChangeReferences = boundedReferenceArray(deploymentContext?.material_change_references, "context.material_change_references");
  const humanApprovalReference = deploymentContext?.human_approval_reference ? requiredText(deploymentContext.human_approval_reference, "context.human_approval_reference", 36, uuidPattern) : null;
  // Decision-eligible assurance evidence must arrive through an authenticated provider ingestion path.
  const assuranceEvidence: DeploymentAssuranceEvidence[] = [];
  const monitoring = deploymentContext?.monitoring && typeof deploymentContext.monitoring === "object" && !Array.isArray(deploymentContext.monitoring)
    ? deploymentContext.monitoring as Record<string, unknown>
    : null;
  if (monitoring) assertOnlyFields(monitoring, ["expected_providers", "observed_providers", "telemetry_gap_seconds", "connection"]);
  const expectedProviders = Array.isArray(monitoring?.expected_providers) ? monitoring.expected_providers.filter((item): item is string => typeof item === "string") : [];
  const observedProviders = Array.isArray(monitoring?.observed_providers) ? monitoring.observed_providers.filter((item): item is string => typeof item === "string") : [];
  const monitoringCoverage = observedProviders.length > 0 ? "partial" as const : "not_observed" as const;
  const executionStages = Array.isArray(deploymentContext?.execution_stages)
    ? deploymentContext.execution_stages.map((value) => {
        const item = value as Record<string, unknown>;
        assertOnlyFields(item, ["stage", "status", "occurred_at", "evidence_reference"]);
        const stage = requiredText(item.stage, "execution_stages.stage", 80, /^[A-Z_]+$/) as ExecutionContinuityRecord["stage"];
        const claimedStatus = requiredText(item.status, "execution_stages.status", 40, /^[a-z_]+$/) as ExecutionContinuityRecord["status"];
        const status: ExecutionContinuityRecord["status"] = claimedStatus === "not_applicable" ? "not_applicable" : "asserted";
        return { stage, status, occurredAt: optionalIso(item.occurred_at, "execution_stages.occurred_at"), evidenceReference: item.evidence_reference ? requiredText(item.evidence_reference, "execution_stages.evidence_reference", 240, referencePattern) : null };
      })
    : [];
  const sensors = Array.isArray(deploymentContext?.sensor_evidence) ? deploymentContext.sensor_evidence.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new PublicApiError("INVALID_INPUT", "sensor_evidence entries must be objects.", 400);
    const { digest, ...facts } = value as Record<string, unknown>;
    const computedDigest = hashCanonical(facts);
    const suppliedDigest = digest ? requiredText(digest, "sensor_evidence.digest", 64, /^[a-f0-9]{64}$/) : null;
    verifyClientEvidenceDigest(suppliedDigest, computedDigest);
    return { facts, computedDigest };
  }) : [];
  const sensorObservations = new Set(sensors.map((item) => String(item.facts.observation ?? "")).filter(Boolean));
  const contradictions = [
    ...(expectedProviders.some((provider) => !observedProviders.includes(provider)) ? ["MONITORING_COVERAGE_GAP"] : []),
    ...(Number(monitoring?.telemetry_gap_seconds ?? 0) > 0 && executionStages.some((item) => ["COMMAND_SENT", "ACTION_EXECUTED", "WORLD_STATE_CHANGED", "CONSEQUENCE_OBSERVED"].includes(item.stage)) ? ["ACTION_DURING_EVIDENCE_GAP"] : []),
    ...(sensorObservations.size > 1 ? ["SENSOR_DISAGREEMENT"] : []),
  ];
  const contextEvidence: CanonicalContextEvidence[] = [
    ...sensors.map((item) => ({
      providerClass: "APPLICATION_SIGNAL",
      providerKey: `api-client:${principal.clientId}`,
      evidenceType: sensorObservations.size > 1 ? "AGENT_ASSERTED:SENSOR_DISAGREEMENT" : "AGENT_ASSERTED:SENSOR_OBSERVATION",
      observedAt: typeof item.facts.observed_at === "string" && Number.isFinite(Date.parse(item.facts.observed_at)) ? new Date(item.facts.observed_at).toISOString() : new Date().toISOString(),
      outcome: "ASSERTED",
      evidenceDigest: item.computedDigest,
      metadata: { ...item.facts, classification: CLIENT_EVIDENCE_CLASSIFICATION },
    })),
  ];
  const normalized = {
    type: requiredText(action.type, "action.type", 120, referencePattern),
    target: requiredText(action.target, "action.target", 240, referencePattern),
    purpose: requiredText(action.purpose, "action.purpose", 180, referencePattern),
    environment: requiredText(action.environment, "action.environment", 120, referencePattern),
  };
  const db = createServiceRoleClient();
  if (previousTransactionId) {
    const previous = await db.from("canonical_trust_transactions")
      .select("transaction_id")
      .eq("enterprise_id", principal.tenantId)
      .eq("actor_id", principal.clientId)
      .eq("operational_entity_id", agentId)
      .eq("transaction_id", previousTransactionId)
      .maybeSingle();
    if (previous.error) throw new PublicApiError("TRANSACTION_UNAVAILABLE", "The prior transaction reference could not be resolved safely.", 503);
    if (!previous.data) throw new PublicApiError("PREVIOUS_TRANSACTION_NOT_FOUND", "The prior transaction reference is unavailable to this API client and agent.", 404);
  }
  // Signed human intent must be resolved through an existing verified intent path.
  let humanIntent: {
    signed: boolean;
    status: "provided" | "pending";
    reference: string;
    expiresAt: string | null;
    sourceClassification: "human_reviewed" | "agent_asserted";
  } | undefined;
  if (humanApprovalReference) {
    const approval = await db.from("trust_manual_reviews")
      .select("id,status,entity_id,original_transaction_id,expires_at")
      .eq("tenant_id", principal.tenantId)
      .eq("requested_client_id", principal.clientId)
      .eq("entity_id", agentId)
      .eq("id", humanApprovalReference)
      .maybeSingle();
    if (approval.error) throw new PublicApiError("REVIEW_UNAVAILABLE", "The human approval reference could not be resolved safely.", 503);
    let exactApprovedAction = false;
    if (approval.data?.status === "APPROVED" && Date.parse(String(approval.data.expires_at)) > Date.now()) {
      const approvedTransaction = await db.from("canonical_trust_transactions")
        .select("action_type,action_resource,action_purpose,action_environment")
        .eq("enterprise_id", principal.tenantId)
        .eq("actor_id", principal.clientId)
        .eq("operational_entity_id", agentId)
        .eq("transaction_id", String(approval.data.original_transaction_id))
        .maybeSingle();
      if (approvedTransaction.error) throw new PublicApiError("REVIEW_UNAVAILABLE", "The approval transaction could not be resolved safely.", 503);
      exactApprovedAction = Boolean(approvedTransaction.data
        && approvedTransaction.data.action_type === normalized.type
        && approvedTransaction.data.action_resource === normalized.target
        && approvedTransaction.data.action_purpose === normalized.purpose
        && approvedTransaction.data.action_environment === normalized.environment);
    }
    humanIntent = exactApprovedAction ? {
      signed: true,
      status: "provided",
      reference: humanApprovalReference,
      expiresAt: approval.data?.expires_at ? String(approval.data.expires_at) : null,
      sourceClassification: "human_reviewed",
    } : {
      signed: false,
      status: "pending",
      reference: humanApprovalReference,
      expiresAt: approval.data?.expires_at ? String(approval.data.expires_at) : null,
      sourceClassification: "agent_asserted",
    };
  }
  const requestDigest = hashCanonical({
    operationalEntityId: agentId,
    action: normalized,
    decisionType,
    context: deploymentContext ?? null,
  });
  const bodyKey = body.idempotency_key ? requiredText(body.idempotency_key, "idempotency_key", 120, /^[A-Za-z0-9_.:-]+$/) : idempotencyKey;
  if (!idempotencyKey || idempotencyKey.length < 8 || bodyKey !== idempotencyKey) {
    throw new PublicApiError("IDEMPOTENCY_KEY_REQUIRED", "A matching Idempotency-Key header is required.", 400);
  }
  try {
    const receipt = await executeCanonicalTrustTransaction({
      trustObject: { subjectType: "ai_agent", subjectId: agentId },
      operationalEntityId: agentId,
      decisionType,
      deploymentContext: decisionType === "AI_DEPLOYMENT_TRUST_GATE" ? {
        environment: deploymentContext?.environment && typeof deploymentContext.environment === "string" ? deploymentContext.environment : normalized.environment,
        release: deploymentContext?.release && typeof deploymentContext.release === "string" ? deploymentContext.release : undefined,
        materialChanges,
        assuranceEvidence,
      } : null,
      managedControl: {
        contradictions,
        monitoringCoverage: monitoring ? monitoringCoverage : undefined,
        oversightMode: deploymentContext?.oversight && ["HUMAN_IN_THE_LOOP", "HUMAN_ON_THE_LOOP", "HUMAN_OVER_THE_LOOP", "AUTONOMOUS"].includes(String(deploymentContext.oversight)) ? deploymentContext.oversight as "HUMAN_IN_THE_LOOP" | "HUMAN_ON_THE_LOOP" | "HUMAN_OVER_THE_LOOP" | "AUTONOMOUS" : undefined,
        executionStages,
        contextEvidence,
        humanIntent,
      },
      action: {
        type: normalized.type,
        purpose: normalized.purpose,
        resource: normalized.target,
        environment: normalized.environment,
        payloadDigest: requestDigest,
      },
      idempotencyKey: `${principal.clientId}:${idempotencyKey}`,
      previousTransactionId,
      decisionContext: {
        intentReference,
        expectedAuthorityVersion,
        expectedPolicyVersion,
        currentEvidenceReferences,
        materialChangeReferences,
        clientAssertedMaterialChanges: materialChanges,
      },
      correlationId,
    }, createCanonicalTrustTransactionDependenciesForApiClient({
      enterpriseId: principal.tenantId,
      clientId: principal.clientId,
    }));
    const decision = receipt.decision as PublicDecision;
    if (decision === "REVIEW") {
      const review = await createServiceRoleClient().rpc("create_public_api_review_v1", {
        p_tenant_id: principal.tenantId,
        p_client_id: principal.clientId,
        p_review_id: receipt.decisionReference,
        p_transaction_id: receipt.transactionId,
        p_correlation_id: receipt.correlationId,
        p_reason: "Canonical Trust Fabric decision requires governed human review.",
        p_expires_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      });
      if (review.error) throw new PublicApiError("REVIEW_UNAVAILABLE", "The canonical decision was recorded, but its review lifecycle could not be prepared safely. Retry the unchanged request with the same idempotency key.", 503);
    }
    if (!receipt.idempotentReplay) await emitDecisionWebhooks(principal.tenantId, receipt as unknown as Row);
    return {
      decision_id: receipt.decisionReference,
      transaction_id: receipt.transactionId,
      receipt_id: receipt.transactionId,
      replay_id: receipt.transactionId,
      decision,
      reason_codes: receipt.reasonCodes,
      consequence: receipt.consequence,
      confidence: receipt.confidenceInConclusion,
      agent_id: receipt.operationalEntityId,
      authority_reference: receipt.authorityReference,
      authority_version: receipt.authorityVersion,
      policy_reference: receipt.policy.id,
      policy: { id: receipt.policy.id, version: receipt.policy.version },
      policy_version: receipt.policy.version,
      correlation_id: receipt.correlationId,
      created_at: receipt.timestamp,
      continuity: {
        identity_continuity: receipt.continuitySignals.identityContinuity,
        monitoring_coverage: receipt.continuitySignals.monitoringCoverage,
        signed_human_intent: receipt.continuitySignals.signedHumanIntent,
        consequential_impact_lineage: receipt.continuitySignals.consequentialImpactLineage,
      },
      deployment_gate: receipt.deploymentGate,
      provider_neutral_evidence: receipt.providerNeutralEvidence,
      execution_continuity: receipt.executionContinuity,
      consequence_time: consequenceTimeProjection(receipt.decisionTimeSnapshot as unknown as Row),
      transaction_url: `${origin}/api/v1/trust/transactions/${receipt.transactionId}`,
      receipt_url: `${origin}/api/v1/trust/transactions/${receipt.transactionId}/receipt`,
      replay_url: `${origin}/api/v1/trust/transactions/${receipt.transactionId}/replay`,
      review_required: decision === "REVIEW",
      review_reference: decision === "REVIEW" ? receipt.decisionReference : null,
      blocking_reason_codes: decision === "REVIEW" ? receipt.reasonCodes : [],
      required_evidence: decision === "REVIEW" ? ["NATIVE_ENTITY_IDENTITY_PROOF"] : [],
      human_approval_required: decision === "REVIEW",
      execution_authorization: executionAuthorization(receipt as unknown as Row),
      idempotent_replay: receipt.idempotentReplay,
    };
  } catch (error) {
    if (error instanceof TypeError && /idempotency key/i.test(error.message)) {
      throw new PublicApiError("IDEMPOTENCY_CONFLICT", "The idempotency key is already bound to a different request.", 409);
    }
    translateRuntimeError(error);
  }
}

async function transactionRows(principal: PublicApiPrincipal, transactionId: string) {
  if (!uuidPattern.test(transactionId)) throw new PublicApiError("INVALID_TRANSACTION_ID", "The transaction identifier is invalid.", 400);
  const db = createServiceRoleClient();
  const transaction = await db
    .from("canonical_trust_transactions")
    .select("*")
    .eq("enterprise_id", principal.tenantId)
    .eq("actor_id", principal.clientId)
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (transaction.error) throw new PublicApiError("TRANSACTION_UNAVAILABLE", "The transaction could not be retrieved safely.", 503);
  if (!transaction.data) throw new PublicApiError("TRANSACTION_NOT_FOUND", "The transaction is unavailable to this API client.", 404);
  const [events, outcomes, nativeOutcomes] = await Promise.all([
    db.from("canonical_trust_transaction_events").select("event_id,event_type,actor_id,reason,evidence_references,authority_reference,policy_id,policy_version,correlation_id,record_digest,occurred_at").eq("enterprise_id", principal.tenantId).eq("transaction_id", transactionId).order("occurred_at", { ascending: true }),
    db.from("public_api_outcome_submissions").select("submission_id,source_id,destination,result,observed_at,evidence_reference,independence,submission_digest").eq("tenant_id", principal.tenantId).eq("transaction_id", transactionId).order("observed_at", { ascending: true }),
    db.from("native_enforcement_outcomes").select("outcome_id,outcome,control_status,reason_codes,contradiction_codes,evidence_independence,correlated_at").eq("enterprise_id", principal.tenantId).eq("transaction_id", transactionId).order("correlated_at", { ascending: true }),
  ]);
  for (const result of [events, outcomes, nativeOutcomes]) {
    if (result.error) throw new PublicApiError("TRANSACTION_UNAVAILABLE", "The transaction could not be retrieved safely.", 503);
  }
  return { transaction: transaction.data as Row, events: events.data ?? [], outcomes: outcomes.data ?? [], nativeOutcomes: nativeOutcomes.data ?? [] };
}

function reviewRpcFailure(error: { message?: string } | null): never {
  const message = String(error?.message ?? "");
  if (/not found/i.test(message)) throw new PublicApiError("REVIEW_NOT_FOUND", "The review is unavailable to this API client.", 404);
  if (/already resolved/i.test(message)) throw new PublicApiError("REVIEW_ALREADY_RESOLVED", "The review has already been resolved.", 409);
  if (/expired/i.test(message)) throw new PublicApiError("REVIEW_EXPIRED", "The review has expired and cannot be resolved.", 409);
  if (/authority is not current/i.test(message)) throw new PublicApiError("REVIEW_AUTHORITY_INVALID", "The authority linked to the review is no longer current.", 409);
  if (/forbidden/i.test(message)) throw new PublicApiError("REVIEW_RESOLUTION_FORBIDDEN", "This API principal cannot resolve the review.", 403);
  if (/invalid review resolution/i.test(message)) throw new PublicApiError("INVALID_REQUEST", "The review resolution is invalid.", 400);
  throw new PublicApiError("REVIEW_UNAVAILABLE", "The review could not be changed safely.", 503);
}

export async function getExternalReview(principal: PublicApiPrincipal, reviewReference: string) {
  if (!uuidPattern.test(reviewReference)) throw new PublicApiError("REVIEW_NOT_FOUND", "The review is unavailable to this API client.", 404);
  const db = createServiceRoleClient();
  const review = await db.from("trust_manual_reviews").select("id,entity_id,status,reason,decision,decision_reason,created_at,completed_at,original_transaction_id,requested_client_id,reviewer_principal_id,correlation_id,expires_at,evidence_reference").eq("tenant_id", principal.tenantId).eq("requested_client_id", principal.clientId).eq("id", reviewReference).maybeSingle();
  if (review.error) throw new PublicApiError("REVIEW_UNAVAILABLE", "The review could not be retrieved safely.", 503);
  if (!review.data) throw new PublicApiError("REVIEW_NOT_FOUND", "The review is unavailable to this API client.", 404);
  const history = await db.from("trust_manual_review_history").select("previous_status,new_status,actor_id,reason,created_at").eq("tenant_id", principal.tenantId).eq("review_id", reviewReference).order("created_at", { ascending: true });
  if (history.error) throw new PublicApiError("REVIEW_UNAVAILABLE", "The review history could not be retrieved safely.", 503);
  return {
    review_reference: String(review.data.id),
    status: String(review.data.status),
    disposition: ["APPROVED", "REJECTED"].includes(String(review.data.status)) ? String(review.data.status) : null,
    original_decision: "REVIEW",
    original_transaction_id: String(review.data.original_transaction_id),
    agent_id: String(review.data.entity_id),
    reason: String(review.data.reason),
    resolution_reason: review.data.decision_reason ? String(review.data.decision_reason) : null,
    evidence_reference: review.data.evidence_reference ? String(review.data.evidence_reference) : null,
    reviewer_principal_id: review.data.reviewer_principal_id ? String(review.data.reviewer_principal_id) : null,
    correlation_id: String(review.data.correlation_id),
    created_at: String(review.data.created_at),
    expires_at: String(review.data.expires_at),
    resolved_at: review.data.completed_at ? String(review.data.completed_at) : null,
    next_action: review.data.status === "APPROVED" ? "SUBMIT_NEW_CANONICAL_EVALUATION" : review.data.status === "REJECTED" ? "DO_NOT_EXECUTE" : "WAIT_FOR_AUTHORIZED_REVIEWER",
    original_decision_immutable: true,
    history: history.data ?? [],
  };
}

export async function resolveExternalReview(principal: PublicApiPrincipal, reviewReference: string, body: Record<string, unknown>, correlationId: string) {
  if (!uuidPattern.test(reviewReference)) throw new PublicApiError("REVIEW_NOT_FOUND", "The review is unavailable to this API client.", 404);
  if (!principal.scopes.includes("review:write") || !["owner", "admin", "reviewer"].includes(principal.role)) {
    throw new PublicApiError("REVIEW_RESOLUTION_FORBIDDEN", "This API principal cannot resolve reviews.", 403);
  }
  assertOnlyFields(body, ["resolution", "reason", "evidence_reference"]);
  const resolution = requiredText(body.resolution, "resolution", 20, /^[A-Z_]+$/);
  if (!new Set(["APPROVED", "REJECTED"]).has(resolution)) throw new PublicApiError("INVALID_REQUEST", "resolution must be APPROVED or REJECTED.", 400);
  const reason = requiredText(body.reason, "reason", 1000, /^[A-Za-z0-9_.:/@,;'()!? -]+$/);
  const evidenceReference = requiredText(body.evidence_reference, "evidence_reference", 240, referencePattern);
  const db = createServiceRoleClient();
  const result = await db.rpc("resolve_public_api_review_v1", { p_tenant_id: principal.tenantId, p_key_id: principal.keyId, p_client_id: principal.clientId, p_review_id: reviewReference, p_resolution: resolution, p_reason: reason, p_evidence_reference: evidenceReference, p_correlation_id: correlationId });
  if (result.error) reviewRpcFailure(result.error);
  return getExternalReview(principal, reviewReference);
}

export async function getExternalTransaction(principal: PublicApiPrincipal, transactionId: string) {
  const history = await transactionRows(principal, transactionId);
  const row = history.transaction;
  const consequenceTime = consequenceTimeProjection(row.decision_time_snapshot);
  return {
    decision_id: row.decision_id,
    transaction_id: row.transaction_id,
    receipt_id: row.transaction_id,
    replay_id: row.transaction_id,
    agent_id: row.operational_entity_id,
    correlation_id: row.correlation_id,
    entity: { operational_entity_id: row.operational_entity_id, type: row.entity_type, accountable_owner_id: row.accountable_owner_id },
    identity_state: row.decision_time_snapshot?.identityState ?? "captured_in_decision_snapshot",
    authority: { reference: row.authority_reference, lineage: row.authority_lineage_references ?? [] },
    delegation: (row.authority_lineage_references ?? []).filter((item: Row) => item.type === "authority_delegation"),
    action: { type: row.action_type, purpose: row.action_purpose, target: row.action_resource, environment: row.action_environment, request_digest: row.request_digest },
    evidence_summary: { references: row.evidence_references ?? [], complete: row.evidence_complete, fresh: row.evidence_fresh, independence: row.evidence_independence },
    consequence: row.decision_time_snapshot?.consequence ?? "unknown",
    decision: row.decision,
    reason_codes: row.reason_codes ?? [],
    enforcement_state: row.decision_time_snapshot?.enforcementState ?? { policyDecision: row.decision },
    continuity: row.continuity_signals ?? null,
    consequence_time: consequenceTime,
    execution_continuity: row.execution_continuity ?? [],
    deployment_gate: row.deployment_gate ?? null,
    outcome: { public_submissions: history.outcomes, canonical_outcomes: history.nativeOutcomes },
    timestamps: { requested_at: row.requested_at, created_at: row.created_at, updated_at: row.updated_at },
    digests: { request: row.request_digest, evidence: row.evidence_digest, decision: row.decision_time_snapshot?.decisionDigest ?? null },
  };
}

export async function getExternalReplay(principal: PublicApiPrincipal, transactionId: string) {
  const history = await transactionRows(principal, transactionId);
  const consequenceTime = consequenceTimeProjection(history.transaction.decision_time_snapshot);
  return {
    replay_id: transactionId,
    decision_id: history.transaction.decision_id,
    transaction_id: transactionId,
    receipt_id: transactionId,
    agent_id: history.transaction.operational_entity_id,
    authority_reference: history.transaction.authority_reference,
    authority_version: consequenceTime?.authority?.version ?? null,
    correlation_id: history.transaction.correlation_id,
    consequence_time: consequenceTime,
    decision_comparison: consequenceTime ? {
      previous_evaluation: consequenceTime.previous_evaluation,
      current_decision: history.transaction.decision,
      changed_conditions: consequenceTime.current_conditions.material_changes,
      decision_differs_from_previous: consequenceTime.decision_differs_from_previous,
    } : null,
    outcome_evidence: { public_submissions: history.outcomes, canonical_outcomes: history.nativeOutcomes },
    events: history.events.map((event: Row) => ({
      timestamp: event.occurred_at,
      actor: event.actor_id ? `principal:${event.actor_id}` : "cyber-sentinels",
      entity: history.transaction.operational_entity_id,
      event_type: event.event_type,
      source: "canonical_trust_transaction",
      references: {
        event_id: event.event_id,
        authority: event.authority_reference,
        evidence: event.evidence_references ?? [],
        policy: `${event.policy_id}:${event.policy_version}`,
        digest: event.record_digest,
      },
    })),
  };
}

export async function getExternalReceipt(principal: PublicApiPrincipal, transactionId: string) {
  const history = await transactionRows(principal, transactionId);
  const row = history.transaction;
  const consequenceTime = consequenceTimeProjection(row.decision_time_snapshot);
  return {
    receipt_version: "canonical-trust-transaction-v1",
    receipt_id: row.transaction_id,
    decision_id: row.decision_id,
    transaction_id: row.transaction_id,
    replay_id: row.transaction_id,
    agent_id: row.operational_entity_id,
    correlation_id: row.correlation_id,
    entity: { operational_entity_id: row.operational_entity_id, type: row.entity_type, accountable_owner_id: row.accountable_owner_id },
    decision: row.decision,
    trust_state: row.trust_state,
    timestamp: row.requested_at,
    action: { type: row.action_type, purpose: row.action_purpose, resource: row.action_resource, environment: row.action_environment, request_digest: row.request_digest },
    reason_codes: row.reason_codes ?? [],
    evidence_references: row.evidence_references ?? [],
    authority_reference: row.authority_reference,
    authority_version: consequenceTime?.authority?.version ?? null,
    authority_lineage_references: row.authority_lineage_references ?? [],
    policy: { id: row.policy_id, version: row.policy_version, hash: row.policy_hash },
    decision_digest: row.decision_time_snapshot?.decisionDigest ?? null,
    current_condition_references: consequenceTime?.current_conditions.current_condition_references ?? [],
    material_change_references: consequenceTime?.current_conditions.material_change_references ?? [],
    consequence_time: consequenceTime,
    continuity: {
      identity_continuity: row.continuity_signals?.identityContinuity ?? "review_required",
      monitoring_coverage: row.continuity_signals?.monitoringCoverage ?? "not_observed",
      signed_human_intent: row.continuity_signals?.signedHumanIntent ?? "not_provided",
      consequential_impact_lineage: row.continuity_signals?.consequentialImpactLineage ?? null,
    },
    provider_neutral_evidence: row.provider_neutral_evidence ?? [],
    deployment_gate: row.deployment_gate ?? null,
    execution_continuity: row.execution_continuity ?? [],
    evidence_graph_reference: `evidence-graph:${row.transaction_id}`,
    replay_reference: `replay:${row.transaction_id}`,
    trust_memory_reference: row.material_change ? `trust-memory:${row.transaction_id}` : null,
  };
}

export async function submitExternalOutcome(principal: PublicApiPrincipal, transactionId: string, body: Record<string, unknown>) {
  assertOnlyFields(body, ["source_id", "destination", "action_reference", "target", "result", "observed_at", "evidence_reference", "digest"]);
  const history = await transactionRows(principal, transactionId);
  const requestedSourceId = requiredText(body.source_id, "source_id", 180, /^(?:self|[A-Za-z0-9][A-Za-z0-9:._/-]{0,179})$/);
  const sourceId = requestedSourceId === "self" ? `api-client:${principal.clientId}` : requestedSourceId;
  if (sourceId !== `api-client:${principal.clientId}`) {
    throw new PublicApiError("OUTCOME_SOURCE_NOT_APPROVED", "The outcome source is not approved for this API client.", 403);
  }
  const result = String(body.result ?? "").toUpperCase();
  if (!new Set(["SUCCEEDED", "FAILED", "UNKNOWN"]).has(result)) throw new PublicApiError("INVALID_INPUT", "result is invalid.", 400);
  if (history.transaction.decision !== "ALLOW" && result === "SUCCEEDED") {
    throw new PublicApiError("OUTCOME_CONTRADICTS_DECISION", "A successful outcome cannot be asserted for REVIEW or DENY.", 409);
  }
  const record = {
    transactionId,
    sourceId,
    destination: requiredText(body.destination, "destination", 240, referencePattern),
    actionReference: requiredText(body.action_reference, "action_reference", 240, referencePattern),
    target: requiredText(body.target, "target", 240, referencePattern),
    result,
    observedAt: optionalIso(body.observed_at, "observed_at") ?? new Date().toISOString(),
    evidenceReference: requiredText(body.evidence_reference, "evidence_reference", 240, referencePattern),
    suppliedDigest: body.digest ? requiredText(body.digest, "digest", 64, /^[a-f0-9]{64}$/) : null,
  };
  const submissionDigest = hashCanonical(record);
  const db = createServiceRoleClient();
  const inserted = await db.from("public_api_outcome_submissions").insert({
    submission_id: crypto.randomUUID(),
    tenant_id: principal.tenantId,
    transaction_id: transactionId,
    client_id: principal.clientId,
    source_id: sourceId,
    destination: record.destination,
    action_reference: record.actionReference,
    target: record.target,
    result,
    observed_at: record.observedAt,
    evidence_reference: record.evidenceReference,
    supplied_digest: record.suppliedDigest,
    independence: "AGENT_ASSERTED",
    submission_digest: submissionDigest,
  }).select("submission_id").single();
  if (inserted.error && inserted.error.code !== "23505") throw new PublicApiError("OUTCOME_UNAVAILABLE", "The outcome could not be recorded safely.", 503);
  await emitPublicApiWebhookEvent(principal.tenantId, "execution.outcome", `transaction:${transactionId}`);
  return {
    submission_id: inserted.data?.submission_id ?? null,
    transaction_id: transactionId,
    status: inserted.error?.code === "23505" ? "DUPLICATE" : "RECORDED",
    evidence_independence: "AGENT_ASSERTED",
    independent_destination_evidence: false,
    submission_digest: submissionDigest,
  };
}

export async function submitExternalEvidence(principal: PublicApiPrincipal, body: Record<string, unknown>) {
  assertNoCallerAuthorityClaims(body);
  assertOnlyFields(body, ["provider", "type", "subject", "evidence", "occurred_at", "expires_at", "digest"]);
  const provider = body.provider as Record<string, unknown>;
  const subject = body.subject as Record<string, unknown>;
  const evidence = body.evidence as Record<string, unknown>;
  if (!provider || typeof provider !== "object" || Array.isArray(provider)) throw new PublicApiError("INVALID_INPUT", "provider is required.", 400);
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) throw new PublicApiError("INVALID_INPUT", "subject is required.", 400);
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) throw new PublicApiError("INVALID_INPUT", "evidence is required.", 400);
  assertOnlyFields(provider, ["key", "class", "event_id", "finding"]);
  assertOnlyFields(subject, ["type", "id"]);
  const requestedProvider = {
    key: requiredText(provider.key, "provider.key", 180, referencePattern),
    class: requiredText(provider.class, "provider.class", 80, /^[A-Z_]+$/),
  };
  const { providerKey, providerClass } = resolveClientEvidenceProvider(requestedProvider, principal.clientId);
  const subjectType = requiredText(subject.type, "subject.type", 80, /^[A-Z_]+$/);
  if (!["AI_AGENT", "OPERATIONAL_ENTITY"].includes(subjectType)) {
    throw new PublicApiError("EVIDENCE_SUBJECT_UNSUPPORTED", "Public API evidence must concern an agent registered to this API client.", 400);
  }
  const subjectId = requiredText(subject.id, "subject.id", 180, referencePattern);
  await entityFor(principal, subjectId);
  const evidenceType = resolveClientEvidenceType(requiredText(body.type, "type", 120, /^[A-Za-z0-9_.:-]+$/));
  const occurredAt = optionalIso(body.occurred_at, "occurred_at") ?? new Date().toISOString();
  const expiresAt = optionalIso(body.expires_at, "expires_at");
  const adapter = createReferenceProviderAdapter(providerKey, providerClass);
  const input: ProviderAdapterInput = {
    providerKey,
    eventId: requiredText(provider.event_id, "provider.event_id", 180, referencePattern),
    subject: { type: subjectType, id: subjectId },
    evidenceType: evidenceType.assertedType,
    finding: requiredText(provider.finding, "provider.finding", 120, /^[A-Z0-9_.:-]+$/),
    evidence,
    occurredAt,
    expiresAt,
    digest: null,
  };
  const mapped = await adapter.mapEvidence(input);
  const normalizedFacts = {
    ...mapped.normalizedFacts,
    assertion: {
      classification: CLIENT_EVIDENCE_CLASSIFICATION,
      assertedEvidenceType: evidenceType.assertedType,
      authenticatedClientId: principal.clientId,
      subjectBinding: "PUBLIC_API_AGENT_BINDING",
    },
  };
  const computedDigest = hashCanonical(normalizedFacts);
  const suppliedDigest = body.digest ? requiredText(body.digest, "digest", 64, /^[a-f0-9]{64}$/) : null;
  verifyClientEvidenceDigest(suppliedDigest, computedDigest);
  const evidenceId = deterministicUuid({
    tenantId: principal.tenantId,
    clientId: principal.clientId,
    eventId: input.eventId,
    subjectId,
  });
  const db = createServiceRoleClient();
  const inserted = await db.from("evidence_objects").insert({
    evidence_id: evidenceId,
    enterprise_id: principal.tenantId,
    provider_key: mapped.providerKey,
    evidence_classification: CLIENT_EVIDENCE_CLASSIFICATION,
    storage_boundary: "NORMALIZED_LEDGER",
    normalized_facts: normalizedFacts,
    occurred_at: mapped.occurredAt,
    observed_at: mapped.occurredAt,
    freshness_policy_seconds: 86_400,
    retention_expires_at: mapped.expiresAt,
    domain_key: "PUBLIC_API_CLIENT_ASSERTION",
    subject_id: subjectId,
    subject_type: subjectType,
    evidence_type: evidenceType.storedType,
    source_type: "PUBLIC_API_CLIENT_ASSERTION",
    source_key: mapped.providerKey,
    result: "INCONCLUSIVE",
    assurance_level: "NONE",
    cryptographically_verified: mapped.cryptographicallyVerified,
    server_verified: mapped.serverVerified,
    received_at: mapped.receivedAt,
    expires_at: mapped.expiresAt,
    payload_hash: computedDigest,
    canonicalization: "JCS",
    hash_algorithm: "SHA-256",
    reason_codes: mapped.reasonCodes,
  }).select("evidence_id").single();
  if (inserted.error?.code === "23505") {
    const existing = await db.from("evidence_objects")
      .select("payload_hash")
      .eq("enterprise_id", principal.tenantId)
      .eq("evidence_id", evidenceId)
      .maybeSingle();
    if (existing.error) throw new PublicApiError("EVIDENCE_UNAVAILABLE", "The evidence could not be resolved safely.", 503);
    if (!existing.data || existing.data.payload_hash !== computedDigest) {
      throw new PublicApiError("EVIDENCE_EVENT_CONFLICT", "The provider event identifier is already bound to different evidence.", 409);
    }
  } else if (inserted.error) {
    throw new PublicApiError("EVIDENCE_UNAVAILABLE", "The evidence could not be recorded safely.", 503);
  }
  return {
    evidence_id: evidenceId,
    status: inserted.error?.code === "23505" ? "DUPLICATE" : "RECORDED",
    provider: { key: providerKey, class: providerClass },
    subject: mapped.subject,
    type: evidenceType.storedType,
    asserted_type: evidenceType.assertedType,
    classification: CLIENT_EVIDENCE_CLASSIFICATION,
    canonical_result: "INCONCLUSIVE",
    independent_evidence: false,
    server_verified: false,
    evidence_digest: computedDigest,
    reason_codes: [...mapped.reasonCodes, "CLIENT_EVIDENCE_IS_AGENT_ASSERTED"],
    evidence_graph_reference: `evidence:${evidenceId}`,
  };
}

async function emitDecisionWebhooks(tenantId: string, receipt: Row) {
  const tasks: Promise<void>[] = [
    emitPublicApiWebhookEvent(tenantId, "decision.created", `transaction:${receipt.transactionId}`),
    emitPublicApiWebhookEvent(tenantId, "receipt.available", `transaction:${receipt.transactionId}`),
  ];
  if (receipt.decision === "REVIEW") tasks.push(emitPublicApiWebhookEvent(tenantId, "decision.review_required", `transaction:${receipt.transactionId}`));
  if (receipt.decision === "DENY") tasks.push(emitPublicApiWebhookEvent(tenantId, "decision.denied", `transaction:${receipt.transactionId}`));
  if (receipt.materialChange) tasks.push(emitPublicApiWebhookEvent(tenantId, "trust.material_change", `transaction:${receipt.transactionId}`));
  if (receipt.changedConditions?.includes("AUTHORITY_CHANGED")) tasks.push(emitPublicApiWebhookEvent(tenantId, "authority.changed", `transaction:${receipt.transactionId}`));
  if (receipt.reasonCodes?.includes("MONITORING_COVERAGE_GAP") || receipt.reasonCodes?.includes("ACTION_DURING_EVIDENCE_GAP")) tasks.push(emitPublicApiWebhookEvent(tenantId, "monitoring.coverage_gap", `transaction:${receipt.transactionId}`));
  if (receipt.reasonCodes?.includes("REAUTHORIZATION_REQUIRED")) tasks.push(emitPublicApiWebhookEvent(tenantId, "deployment.reauthorization_required", `transaction:${receipt.transactionId}`));
  if (receipt.reasonCodes?.includes("INTENT_EXECUTION_MISMATCH")) tasks.push(emitPublicApiWebhookEvent(tenantId, "intent.execution_mismatch", `transaction:${receipt.transactionId}`));
  if (receipt.reasonCodes?.some((code: string) => /DATA|PRIVACY|RESTRICTED/.test(code))) tasks.push(emitPublicApiWebhookEvent(tenantId, "data.impact_detected", `transaction:${receipt.transactionId}`));
  await Promise.all(tasks);
}
