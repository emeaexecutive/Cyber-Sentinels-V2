import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { deterministicUuid, hashCanonical } from "../../src/lib/trust-core/hash.ts";
import { credentialFingerprint, verifyDetachedEd25519, verifySignedManifest, type NativeCredential, type OperationalEntityManifest } from "./native-verification.ts";

export const CONTROL_PLANE_PROVENANCE = "CYBER_SENTINELS_CONTROL_PLANE_VERIFIED";
export const HEARTBEAT_DOMAIN = "cyber-sentinels:control-plane-heartbeat:v1";
export const HEARTBEAT_MAX_AGE_MS = 120_000;
export const HEARTBEAT_FUTURE_SKEW_MS = 30_000;
export const HEARTBEAT_TTL_MS = 300_000;
export type Heartbeat = {
  agent_id: string; credential_id: string; event_id: string; issued_at: string;
  environment: string; authority_id: string; policy_id: string; policy_version: string;
  signature: string;
};
// Rows originate exclusively from tenant-scoped server repository reads.
type Row = Record<string, any>;
export type ControlPlaneSnapshot = {
  entity: Row; manifest: Row; credential: Row; verification: Row;
  identityEvidence: Row; authority: Row; policy: Row;
};
export type ControlPlaneContext = { tenantId: string; agentId: string; environment: string; audience: string; policyId: string; policyVersion: string };
export class ControlPlaneError extends Error {
  constructor(readonly code: string) { super(code); }
}
function requireClaim(condition: unknown, code: string): asserts condition {
  if (!condition) throw new ControlPlaneError(code);
}
function current(value: unknown, now: number, optional = false) {
  return optional && value == null || typeof value === "string" && Number.isFinite(Date.parse(value)) && Date.parse(value) > now;
}
function started(value: unknown, now: number) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && Date.parse(value) <= now;
}
export function parseHeartbeat(body: Record<string, unknown>): Heartbeat {
  const fields = ["agent_id", "credential_id", "event_id", "issued_at", "environment", "authority_id", "policy_id", "policy_version", "signature"];
  requireClaim(Object.keys(body).length === fields.length && fields.every(key => typeof body[key] === "string" && String(body[key]).length > 0 && String(body[key]).length <= 256), "HEARTBEAT_INVALID_ENVELOPE");
  requireClaim(/^[A-Za-z0-9_-]{22,128}$/.test(String(body.event_id)), "HEARTBEAT_INVALID_EVENT_ID");
  requireClaim(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(String(body.issued_at)) && Number.isFinite(Date.parse(String(body.issued_at))), "HEARTBEAT_INVALID_TIMESTAMP");
  requireClaim(/^[A-Za-z0-9_-]{86}$/.test(String(body.signature)), "HEARTBEAT_INVALID_SIGNATURE");
  return body as Heartbeat;
}
export function heartbeatSigningPayload(heartbeat: Omit<Heartbeat, "signature"> | Heartbeat, context: Pick<ControlPlaneContext, "tenantId" | "audience">) {
  const { agent_id, credential_id, event_id, issued_at, environment, authority_id, policy_id, policy_version } = heartbeat;
  return Buffer.from(canonicalize({ domain: HEARTBEAT_DOMAIN, audience: context.audience, tenant_id: context.tenantId, agent_id, credential_id, event_id, issued_at, environment, authority_id, policy_id, policy_version }), "utf8");
}

export function validateControlPlaneSnapshot(snapshot: ControlPlaneSnapshot, context: ControlPlaneContext, now = Date.now()) {
  const { entity, manifest, credential, verification, identityEvidence, authority, policy } = snapshot;
  requireClaim(entity && manifest && credential && verification && identityEvidence && authority && policy, "CONTROL_PLANE_BASELINE_MISSING");
  requireClaim(context.environment === "production" && entity.lifecycle_state === "active" && entity.environment_references?.includes(context.environment), "CONTROL_PLANE_ENVIRONMENT_MISMATCH");
  requireClaim(entity.entity_id === context.agentId, "CONTROL_PLANE_ENTITY_MISMATCH");
  requireClaim(credential.enterprise_id === context.tenantId && credential.operational_entity_id === context.agentId, "CONTROL_PLANE_CREDENTIAL_BINDING_MISMATCH");
  requireClaim(credential.state === "ACTIVE" && !credential.revoked_at && started(credential.valid_from, now) && current(credential.expires_at, now, true), "CONTROL_PLANE_CREDENTIAL_NOT_CURRENT");
  requireClaim(manifest.status === "ACTIVE" && current(manifest.expires_at, now), "CONTROL_PLANE_MANIFEST_NOT_CURRENT");
  requireClaim(["VERIFIED", "PARTIALLY_VERIFIED"].includes(verification.status) && started(verification.verified_at, now) && current(verification.expires_at, now), "CONTROL_PLANE_VERIFICATION_NOT_CURRENT");
  // Native identity can be fully established while runtime/software remain
  // explicitly unattested. Require every identity claim, confirmed owner, and
  // no conflicts; do not relabel those unattested runtime claims as verified.
  requireClaim(["credential_possession", "manifest_binding", "entity_binding", "tenant_binding"].every(claim => verification.verified_claims?.includes(claim))
    && verification.reason_codes?.includes("OWNER_BINDING_CONFIRMED")
    && Array.isArray(verification.conflicting_claims) && verification.conflicting_claims.length === 0
    && Array.isArray(verification.unverified_claims) && verification.unverified_claims.every((claim: string) => ["runtime_binding", "software_provenance"].includes(claim)), "CONTROL_PLANE_IDENTITY_CLAIMS_INCOMPLETE");
  requireClaim(!identityEvidence.revoked_at && started(identityEvidence.verified_at, now) && current(identityEvidence.expires_at, now), "CONTROL_PLANE_IDENTITY_NOT_CURRENT");
  requireClaim(authority.revocation_state === "active" && started(authority.issued_at, now) && current(authority.expires_at, now), "CONTROL_PLANE_AUTHORITY_NOT_CURRENT");
  requireClaim(policy.active === true && started(policy.valid_from, now) && current(policy.valid_until, now, true), "CONTROL_PLANE_POLICY_NOT_CURRENT");
  const nativeCredential: NativeCredential = {
    credentialId: credential.credential_id, enterpriseId: credential.enterprise_id,
    operationalEntityId: credential.operational_entity_id, signingKeyId: credential.signing_key_id,
    algorithm: credential.algorithm, publicJwk: credential.public_jwk,
    credentialFingerprint: credential.credential_fingerprint, state: credential.state,
    validFrom: credential.valid_from, expiresAt: credential.expires_at, revokedAt: credential.revoked_at,
    rotatedFromCredentialId: credential.rotated_from_credential_id,
  };
  const value = manifest.manifest as OperationalEntityManifest;
  requireClaim(value?.owner?.accountableOwnerId === entity.accountable_owner_id, "CONTROL_PLANE_OWNER_MISMATCH");
  try {
    verifySignedManifest(value, nativeCredential, new Date(now).toISOString());
    requireClaim(credentialFingerprint(nativeCredential.publicJwk) === credential.credential_fingerprint, "CONTROL_PLANE_FINGERPRINT_MISMATCH");
  } catch (error) {
    if (error instanceof ControlPlaneError) throw error;
    throw new ControlPlaneError("CONTROL_PLANE_MANIFEST_SIGNATURE_INVALID");
  }
  requireClaim(identityEvidence.verification_id === verification.verification_id && manifest.manifest_id === verification.manifest_id && credential.credential_id === verification.credential_id
    && manifest.manifest_digest === value.manifestDigest && manifest.manifest_digest === verification.manifest_digest
    && manifest.manifest_digest === identityEvidence.manifest_digest
    && credential.credential_fingerprint === verification.credential_fingerprint
    && credential.credential_fingerprint === identityEvidence.credential_fingerprint
    && manifest.signing_key_id === credential.signing_key_id && identityEvidence.signing_key_id === credential.signing_key_id, "CONTROL_PLANE_BASELINE_LINKAGE_MISMATCH");
  const contract = authority.contract;
  requireClaim(contract?.contractId === authority.contract_id && contract?.subject?.type === "ai_agent" && contract?.subject?.id === context.agentId
    && contract?.policyId === context.policyId && contract?.policyVersion === context.policyVersion
    && policy.policy_id === context.policyId && policy.version === context.policyVersion
    && contract?.authorityScope?.environments?.includes(context.environment), "CONTROL_PLANE_POLICY_AUTHORITY_MISMATCH");
  requireClaim(value.runtime.environment === context.environment && (!value.authority.authorityReference || value.authority.authorityReference === authority.contract_id), "CONTROL_PLANE_MANIFEST_AUTHORITY_MISMATCH");
  let runtime: unknown = value.runtime, model: unknown = value.ai, capabilities: unknown = value.declaredCapabilities;
  if (value.signatureProfile === "PUBLIC_MANIFEST_V1") {
    const claims = value.signedPublicManifest as Row;
    requireClaim(claims?.operational_entity_id === context.agentId && claims.credential_id === credential.credential_id
      && claims.owner_reference === entity.accountable_owner_id && claims.environment === context.environment
      && claims.issued_at === value.issuedAt && claims.expires_at === value.expiresAt, "CONTROL_PLANE_SIGNED_CLAIMS_MISMATCH");
    // Hash only the actual signature-covered declaration, never an unsigned projection.
    runtime = claims.runtime; model = claims.model; capabilities = claims.declared_capabilities;
  }
  const baseline = {
    manifestId: manifest.manifest_id, manifestDigest: manifest.manifest_digest,
    credentialId: credential.credential_id, credentialFingerprint: credential.credential_fingerprint,
    verificationId: verification.verification_id, identityEvidenceId: identityEvidence.evidence_id,
    identityEvidenceDigest: identityEvidence.evidence_digest,
    authorityReference: authority.contract_id, authorityVersion: contract.authorityVersion,
    authorityDigest: hashCanonical(contract), policyReference: policy.policy_id, policyVersion: policy.version, policyHash: policy.policy_hash,
    runtimeConfigurationDigest: hashCanonical({ runtime }), modelConfigurationDigest: hashCanonical({ model }),
    declaredCapabilitiesDigest: hashCanonical({ capabilities }),
  };
  const expiresAt = Math.min(...[manifest.expires_at, value.expiresAt, credential.expires_at, verification.expires_at, identityEvidence.expires_at, authority.expires_at, policy.valid_until].filter(Boolean).map(value => Date.parse(value)));
  return { baseline, baselineDigest: hashCanonical(baseline), nativeCredential, expiresAt };
}

export function verifyControlPlaneHeartbeat(snapshot: ControlPlaneSnapshot, context: ControlPlaneContext, body: Record<string, unknown>, now = Date.now()) {
  const heartbeat = parseHeartbeat(body);
  const verified = validateControlPlaneSnapshot(snapshot, context, now);
  requireClaim(heartbeat.agent_id === context.agentId && heartbeat.credential_id === verified.nativeCredential.credentialId
    && heartbeat.environment === context.environment && heartbeat.authority_id === verified.baseline.authorityReference
    && heartbeat.policy_id === context.policyId && heartbeat.policy_version === context.policyVersion, "HEARTBEAT_BINDING_MISMATCH");
  const issued = Date.parse(heartbeat.issued_at);
  requireClaim(issued >= now - HEARTBEAT_MAX_AGE_MS && issued <= now + HEARTBEAT_FUTURE_SKEW_MS, "HEARTBEAT_NOT_FRESH");
  requireClaim(verifyDetachedEd25519(heartbeatSigningPayload(heartbeat, context), heartbeat.signature, verified.nativeCredential.publicJwk), "HEARTBEAT_SIGNATURE_INVALID");
  const observedAt = new Date(now).toISOString();
  const expiresAt = new Date(Math.min(issued + HEARTBEAT_TTL_MS, verified.expiresAt)).toISOString();
  const facts = {
    provenance: CONTROL_PLANE_PROVENANCE,
    subject: { tenantId: context.tenantId, id: context.agentId },
    observation: { environment: context.environment, audience: context.audience, observedAt, expiresAt },
    baseline: verified.baseline, baselineDigest: verified.baselineDigest,
    heartbeat, signingDomain: HEARTBEAT_DOMAIN,
    configurationMeaning: "AUTHENTICATED_SIGNED_DECLARATION_ONLY",
    monitoring: { coverage: "covered", coverageScope: "SIGNED_CONTROL_PLANE_HEARTBEAT_ONLY", downstreamExecutionObserved: false },
    independence: "FIRST_PARTY_CONTROL_PLANE",
  };
  return [
    { type: "SERVER_VERIFIED_AGENT_CONFIGURATION", domain: "AI_AGENT", assurance: "VERY_HIGH" },
    { type: "SERVER_VERIFIED_MONITORING_HEARTBEAT", domain: "RUNTIME", assurance: "HIGH" },
  ].map(item => {
    const id = deterministicUuid({ tenantId: context.tenantId, agentId: context.agentId, eventId: heartbeat.event_id, domain: HEARTBEAT_DOMAIN, type: item.type });
    return { id, evidence_id: id, enterprise_id: context.tenantId, subject_id: context.agentId, subject_type: "AI_AGENT",
      provider_key: "cyber_sentinels_native", evidence_classification: CONTROL_PLANE_PROVENANCE,
      storage_boundary: "NORMALIZED_LEDGER", normalized_facts: facts, occurred_at: observedAt, observed_at: observedAt,
      received_at: observedAt, retention_expires_at: expiresAt, expires_at: expiresAt, freshness_policy_seconds: HEARTBEAT_TTL_MS / 1000,
      domain_key: item.domain, evidence_type: item.type, source_type: CONTROL_PLANE_PROVENANCE, source_key: "cyber_sentinels",
      result: "POSITIVE", assurance_level: item.assurance, cryptographically_verified: true, server_verified: true,
      payload_hash: hashCanonical(facts), canonicalization: "JCS", hash_algorithm: "SHA-256",
      reason_codes: [CONTROL_PLANE_PROVENANCE, "SIGNED_DECLARATION_AND_HEARTBEAT_ONLY", "DOWNSTREAM_EXECUTION_NOT_OBSERVED"] };
  });
}

export async function persistControlPlaneHeartbeat(snapshot: ControlPlaneSnapshot, context: ControlPlaneContext, body: Record<string, unknown>, insert: (records: ReturnType<typeof verifyControlPlaneHeartbeat>) => Promise<{ error: { code?: string } | null }>, now = Date.now()) {
  const records = verifyControlPlaneHeartbeat(snapshot, context, body, now);
  const result = await insert(records);
  if (result.error) throw new ControlPlaneError(result.error.code === "23505" ? "HEARTBEAT_REPLAY" : "CONTROL_PLANE_PERSISTENCE_FAILED");
  return records;
}

export function eligibleControlPlaneEvidence(snapshot: ControlPlaneSnapshot, context: ControlPlaneContext, rows: Row[], now = Date.now()): Set<string> {
  let baselineDigest: string;
  try { baselineDigest = validateControlPlaneSnapshot(snapshot, context, now).baselineDigest; }
  catch (error) { if (error instanceof ControlPlaneError) return new Set(); throw error; }
  const pairs = new Map<string, { ids: string[]; types: Set<string> }>();
  for (const row of rows) {
    const facts = row.normalized_facts;
    if (row.server_verified !== true || row.provider_key !== "cyber_sentinels_native" || !facts
      || facts.provenance !== CONTROL_PLANE_PROVENANCE || facts.baselineDigest !== baselineDigest
      || !current(row.expires_at, now) || !started(facts.observation?.observedAt, now)) continue;
    try {
      // Reconstruct the original server observation and verify its signature,
      // timestamp bounds, IDs, facts and expiry against today's current baseline.
      const expected = verifyControlPlaneHeartbeat(snapshot, context, facts.heartbeat, Date.parse(facts.observation.observedAt))
        .find(record => record.evidence_id === row.evidence_id && record.evidence_type === row.evidence_type);
      if (!expected || expected.payload_hash !== row.payload_hash || hashCanonical(facts) !== expected.payload_hash
        || Date.parse(expected.expires_at) !== Date.parse(row.expires_at)) continue;
    } catch (error) { if (error instanceof ControlPlaneError) continue; throw error; }
    const pair = pairs.get(facts.heartbeat.event_id) ?? { ids: [], types: new Set<string>() };
    pair.ids.push(row.evidence_id); pair.types.add(row.evidence_type); pairs.set(facts.heartbeat.event_id, pair);
  }
  return new Set([...pairs.values()].filter(pair => pair.types.has("SERVER_VERIFIED_AGENT_CONFIGURATION") && pair.types.has("SERVER_VERIFIED_MONITORING_HEARTBEAT")).flatMap(pair => pair.ids));
}
