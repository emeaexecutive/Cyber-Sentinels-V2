import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  verifySignedManifest,
  type NativeCredential,
  type OperationalEntityManifest,
  type PublicJwk,
} from "@/lib/operational-entities/native-verification";
import { deterministicUuid, hashCanonical } from "@/src/lib/trust-core/hash";
import type { PublicApiPrincipal } from "./authentication";
import { PublicApiError } from "./contracts";
import {
  resolveSyntheticStagingBoundary,
  SERVER_VERIFIED_AGENT_CONFIGURATION,
  SERVER_VERIFIED_MONITORING,
  SyntheticStagingBoundaryError,
} from "./synthetic-staging-provider";

type Row = Record<string, any>;

function unavailable(code: string): never {
  throw new PublicApiError(code, "The server-controlled Staging verification provider is unavailable.", 503);
}

function current(value: unknown, now: number) {
  return !value || (Number.isFinite(Date.parse(String(value))) && Date.parse(String(value)) > now);
}

function credentialFromRow(row: Row): NativeCredential {
  return {
    credentialId: String(row.credential_id),
    enterpriseId: String(row.enterprise_id),
    operationalEntityId: String(row.operational_entity_id),
    signingKeyId: String(row.signing_key_id),
    algorithm: String(row.algorithm) as NativeCredential["algorithm"],
    publicJwk: row.public_jwk as PublicJwk,
    credentialFingerprint: String(row.credential_fingerprint),
    state: String(row.state) as NativeCredential["state"],
    validFrom: String(row.valid_from),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    rotatedFromCredentialId: row.rotated_from_credential_id ? String(row.rotated_from_credential_id) : null,
  };
}

async function persistEvidence(row: Row) {
  const db = createServiceRoleClient();
  const inserted = await db.from("evidence_objects").insert(row);
  if (!inserted.error) return;
  if (inserted.error.code !== "23505") unavailable("SYNTHETIC_STAGING_EVIDENCE_PERSISTENCE_FAILED");
  const existing = await db.from("evidence_objects")
    .select("payload_hash")
    .eq("enterprise_id", row.enterprise_id)
    .eq("evidence_id", row.evidence_id)
    .maybeSingle();
  if (existing.error || existing.data?.payload_hash !== row.payload_hash) {
    unavailable("SYNTHETIC_STAGING_EVIDENCE_CONFLICT");
  }
}

export async function establishTrustedStagingEvidence(input: {
  principal: PublicApiPrincipal;
  agentId: string;
  actionEnvironment: string;
  policyId: string;
  policyVersion: string;
}) {
  let boundary;
  try {
    boundary = resolveSyntheticStagingBoundary(process.env);
  } catch (error) {
    if (error instanceof SyntheticStagingBoundaryError) unavailable(error.code);
    throw error;
  }
  if (!boundary) return null;
  if (input.actionEnvironment.toLowerCase() !== boundary.environment) {
    unavailable("SYNTHETIC_STAGING_ACTION_ENVIRONMENT_MISMATCH");
  }

  const db = createServiceRoleClient();
  const [entity, manifest, credential, verification, identityEvidence, authority, policy] = await Promise.all([
    db.from("operational_entities").select("entity_id,lifecycle_state,environment_references,canonical_digest").eq("enterprise_id", input.principal.tenantId).eq("entity_id", input.agentId).maybeSingle(),
    db.from("operational_entity_manifests").select("manifest_id,manifest_digest,manifest,signing_key_id,status,expires_at").eq("enterprise_id", input.principal.tenantId).eq("operational_entity_id", input.agentId).eq("status", "ACTIVE").order("issued_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("operational_entity_native_credentials").select("*").eq("enterprise_id", input.principal.tenantId).eq("operational_entity_id", input.agentId).eq("state", "ACTIVE").order("valid_from", { ascending: false }).limit(1).maybeSingle(),
    db.from("operational_entity_native_verifications").select("verification_id,status,manifest_id,credential_id,manifest_digest,credential_fingerprint,verified_at,expires_at").eq("enterprise_id", input.principal.tenantId).eq("operational_entity_id", input.agentId).order("verified_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("native_entity_identity_evidence").select("evidence_id,manifest_digest,credential_fingerprint,evidence_digest,verified_at,expires_at,revoked_at").eq("enterprise_id", input.principal.tenantId).eq("operational_entity_id", input.agentId).is("revoked_at", null).order("verified_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("trust_contracts").select("contract_id,contract,revocation_state,issued_at,expires_at").eq("enterprise_id", input.principal.tenantId).eq("subject_type", "ai_agent").eq("subject_id", input.agentId).order("issued_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("trust_policy_versions").select("policy_id,version,active,valid_from,valid_until,policy_hash").eq("enterprise_id", input.principal.tenantId).eq("policy_id", input.policyId).eq("version", input.policyVersion).maybeSingle(),
  ]);
  for (const result of [entity, manifest, credential, verification, identityEvidence, authority, policy]) {
    if (result.error) unavailable("SYNTHETIC_STAGING_VERIFICATION_QUERY_FAILED");
  }
  // Authority absence and revocation belong to the canonical decision engine. Do
  // not turn either state into a verifier outage or mint new positive evidence.
  if (!authority.data || authority.data.revocation_state !== "active") return null;
  const nowMs = Date.now();
  const manifestValue = manifest.data?.manifest as OperationalEntityManifest | undefined;
  const authorityValue = authority.data?.contract as Row | undefined;
  if (
    !entity.data || entity.data.lifecycle_state !== "active"
    || !Array.isArray(entity.data.environment_references) || !entity.data.environment_references.map(String).includes(boundary.environment)
    || !manifest.data || !manifestValue || !current(manifest.data.expires_at, nowMs)
    || !credential.data || !current(credential.data.expires_at, nowMs)
    || !verification.data || !["VERIFIED", "PARTIALLY_VERIFIED"].includes(String(verification.data.status)) || !current(verification.data.expires_at, nowMs)
    || !identityEvidence.data || !current(identityEvidence.data.expires_at, nowMs)
    || !current(authority.data.expires_at, nowMs)
    || !policy.data || !policy.data.active || Date.parse(String(policy.data.valid_from)) > nowMs || !current(policy.data.valid_until, nowMs)
  ) unavailable("SYNTHETIC_STAGING_BASELINE_NOT_CURRENT");

  const nativeCredential = credentialFromRow(credential.data as Row);
  try {
    verifySignedManifest(manifestValue, nativeCredential);
  } catch {
    unavailable("SYNTHETIC_STAGING_MANIFEST_VERIFICATION_FAILED");
  }
  if (
    String(manifest.data.manifest_id) !== String(verification.data.manifest_id)
    || String(credential.data.credential_id) !== String(verification.data.credential_id)
    || String(manifest.data.manifest_digest) !== String(verification.data.manifest_digest)
    || String(manifest.data.manifest_digest) !== String(identityEvidence.data.manifest_digest)
    || String(credential.data.credential_fingerprint) !== String(verification.data.credential_fingerprint)
    || String(credential.data.credential_fingerprint) !== String(identityEvidence.data.credential_fingerprint)
    || String(manifest.data.signing_key_id) !== String(credential.data.signing_key_id)
    || String(authorityValue?.policyId) !== input.policyId
    || String(authorityValue?.policyVersion) !== input.policyVersion
  ) unavailable("SYNTHETIC_STAGING_BASELINE_MISMATCH");

  const observedAt = new Date(Math.floor(nowMs / 300_000) * 300_000).toISOString();
  const verifiedAt = new Date().toISOString();
  const expiresAt = new Date(Date.parse(observedAt) + 10 * 60_000).toISOString();
  const observationCorrelationId = deterministicUuid({
    tenantId: input.principal.tenantId,
    subjectId: input.agentId,
    provider: boundary.providerKey,
    observedAt,
    verificationId: String(verification.data.verification_id),
  });
  const common = {
    fixture: { synthetic: true, classification: boundary.classification, productionEligible: false },
    provider: { key: boundary.providerKey, source: "CYBER_SENTINELS_SERVER", projectRef: boundary.projectRef },
    subject: { type: "AI_AGENT", id: input.agentId, tenantId: input.principal.tenantId },
    observation: { environment: boundary.environment, origin: boundary.origin, observedAt, verifiedAt, expiresAt },
    correlation: { correlationId: observationCorrelationId, verificationId: String(verification.data.verification_id), identityEvidenceId: String(identityEvidence.data.evidence_id) },
  };
  const configurationFacts = {
    ...common,
    verification: { method: "SERVER_STORED_SIGNED_MANIFEST_BASELINE_MATCH", class: "SERVER_VERIFIED" },
    configuration: {
      manifestId: String(manifest.data.manifest_id), manifestDigest: String(manifest.data.manifest_digest),
      credentialId: String(credential.data.credential_id), credentialFingerprint: String(credential.data.credential_fingerprint),
      runtimeConfigurationDigest: hashCanonical(manifestValue.runtime as unknown as Record<string, unknown>),
      modelConfigurationDigest: hashCanonical(manifestValue.ai as unknown as Record<string, unknown>),
      declaredCapabilitiesDigest: hashCanonical({ declaredCapabilities: manifestValue.declaredCapabilities }),
      authorityReference: String(authority.data.contract_id), authorityVersion: String(authorityValue?.authorityVersion),
      policyReference: input.policyId, policyVersion: input.policyVersion, policyHash: String(policy.data.policy_hash),
    },
  };
  const monitoringFacts = {
    ...common,
    verification: { method: "SERVER_CONTROL_PLANE_SYNTHETIC_OBSERVATION", class: "SERVER_VERIFIED" },
    monitoring: {
      fixture: "SERVER_OWNED_STAGING_HEARTBEAT", coverage: "covered", status: "HEALTHY",
      controlPlaneChecks: ["DATABASE_READ", "IDENTITY_BASELINE", "AUTHORITY_BASELINE", "POLICY_BASELINE"],
      agentCanSetResult: false,
    },
  };
  const records = [
    { type: SERVER_VERIFIED_AGENT_CONFIGURATION, domain: "AI_AGENT", facts: configurationFacts, assurance: "VERY_HIGH" },
    { type: SERVER_VERIFIED_MONITORING, domain: "RUNTIME", facts: monitoringFacts, assurance: "HIGH" },
  ].map((value) => {
    const evidenceId = deterministicUuid({
      tenantId: input.principal.tenantId,
      subjectId: input.agentId,
      provider: boundary.providerKey,
      type: value.type,
      observedAt,
      manifestDigest: String(manifest.data!.manifest_digest),
      authorityId: String(authority.data!.contract_id),
      policyVersion: input.policyVersion,
    });
    return {
      id: evidenceId,
      evidence_id: evidenceId,
      enterprise_id: input.principal.tenantId,
      provider_key: boundary.providerKey,
      evidence_classification: boundary.classification,
      storage_boundary: "NORMALIZED_LEDGER",
      normalized_facts: value.facts,
      occurred_at: observedAt,
      observed_at: observedAt,
      received_at: verifiedAt,
      retention_expires_at: expiresAt,
      expires_at: expiresAt,
      freshness_policy_seconds: 600,
      domain_key: value.domain,
      subject_id: input.agentId,
      subject_type: "AI_AGENT",
      evidence_type: value.type,
      source_type: boundary.classification,
      source_key: "cyber_sentinels",
      result: "POSITIVE",
      assurance_level: value.assurance,
      cryptographically_verified: false,
      server_verified: true,
      payload_hash: hashCanonical(value.facts),
      canonicalization: "JCS",
      hash_algorithm: "SHA-256",
      reason_codes: [boundary.classification, `${value.type}_CURRENT`, "SYNTHETIC_NOT_PRODUCTION_EVIDENCE"],
    };
  });
  await Promise.all(records.map(persistEvidence));
  return {
    monitoringCoverage: "covered" as const,
    evidenceReferences: records.map((record) => record.evidence_id),
    evidenceTypes: records.map((record) => record.evidence_type),
  };
}
