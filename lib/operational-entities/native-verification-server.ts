import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ingestContinuousTrustSignal } from "@/src/lib/continuous-trust/signal-service";
import { hashCanonical } from "@/src/lib/trust-core/hash";
import {
  NATIVE_SIGNATURE_ALGORITHM,
  NativeVerificationError,
  assertSupportedPublicJwk,
  credentialFingerprint,
  issueNativeChallenge,
  verifyNativeEntity,
  verifySignedManifest,
  type ContinuityFingerprint,
  type NativeChallenge,
  type NativeCredential,
  type NativeProofSubmission,
  type OperationalEntityManifest,
  type OwnerBindingState,
  type PublicJwk,
  type RuntimeObservation,
  type SoftwareObservation,
} from "./native-verification";

type Row = Record<string, any>;
type EnterpriseRole = "owner" | "admin" | "reviewer" | "observer";
type NativeContext = { enterpriseId: string; user: User; role: EnterpriseRole };

export class NativeVerificationServerError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "NativeVerificationServerError";
    this.code = code;
    this.status = status;
  }
}

function fail(operation: string, error: unknown): never {
  console.error(`${operation} failed.`, { code: (error as { code?: string })?.code });
  throw new NativeVerificationServerError(`${operation} failed safely.`, "NATIVE_VERIFICATION_PERSISTENCE_FAILED", 503);
}

function ensureMutationRole(role: EnterpriseRole) {
  if (!new Set<EnterpriseRole>(["owner", "admin"]).has(role)) {
    throw new NativeVerificationServerError("Only enterprise owners or administrators can mutate native verification state.", "ENTERPRISE_ROLE_DENIED", 403);
  }
}

function text(value: unknown, field: string, max = 240) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max || !/^[A-Za-z0-9_.:/@-]+$/.test(result)) throw new NativeVerificationServerError(`${field} is invalid.`, "NATIVE_INPUT_INVALID");
  return result;
}

function iso(value: unknown, field: string, required = true) {
  const result = String(value ?? "").trim();
  if (!result && !required) return null;
  if (!result || !Number.isFinite(Date.parse(result))) throw new NativeVerificationServerError(`${field} must be an ISO timestamp.`, "NATIVE_INPUT_INVALID");
  return new Date(result).toISOString();
}

function continuousEntityType(value: unknown) {
  const normalized = String(value ?? "").toUpperCase();
  if (["AI_AGENT", "DEVICE", "SERVICE", "APPLICATION", "MODEL_ENDPOINT", "MACHINE", "WORKLOAD"].includes(normalized)) return normalized;
  if (normalized === "SERVICE_ACCOUNT" || normalized === "API_CLIENT") return "SERVICE";
  return "APPLICATION";
}

function evidenceDomain(value: unknown) {
  const normalized = continuousEntityType(value);
  if (normalized === "AI_AGENT" || normalized === "MODEL_ENDPOINT") return "AI_AGENT";
  if (normalized === "DEVICE" || normalized === "MACHINE") return "DEVICE";
  return "IDENTITY";
}

function nativeCredential(row: Row): NativeCredential {
  return {
    credentialId: String(row.credential_id), enterpriseId: String(row.enterprise_id), operationalEntityId: String(row.operational_entity_id),
    signingKeyId: String(row.signing_key_id), algorithm: String(row.algorithm) as NativeCredential["algorithm"], publicJwk: row.public_jwk as PublicJwk,
    credentialFingerprint: String(row.credential_fingerprint), state: String(row.state) as NativeCredential["state"],
    validFrom: String(row.valid_from), expiresAt: row.expires_at ? String(row.expires_at) : null, revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    rotatedFromCredentialId: row.rotated_from_credential_id ? String(row.rotated_from_credential_id) : null,
  };
}

function nativeChallenge(row: Row, nonce: string): NativeChallenge {
  return {
    challengeId: String(row.challenge_id), enterpriseId: String(row.enterprise_id), operationalEntityId: String(row.operational_entity_id), nonce,
    nonceHash: String(row.nonce_hash), audience: String(row.audience), issuer: "cyber-sentinels", subject: String(row.subject),
    manifestDigest: String(row.manifest_digest), signingKeyId: String(row.signing_key_id), issuedAt: String(row.issued_at), expiresAt: String(row.expires_at),
    status: String(row.status) as NativeChallenge["status"],
  };
}

async function entityFor(context: NativeContext, operationalEntityId: string) {
  const db = createServiceRoleClient();
  const result = await db.from("operational_entities").select("*").eq("enterprise_id", context.enterpriseId).eq("entity_id", operationalEntityId).maybeSingle();
  if (result.error) fail("Operational Entity resolution", result.error);
  if (!result.data) throw new NativeVerificationServerError("The Operational Entity was not found in this tenant.", "WRONG_ENTITY", 404);
  return result.data as Row;
}

async function appendNativeEvent(context: NativeContext, operationalEntityId: string, input: {
  eventType: string;
  attribution?: string;
  evidenceReferences?: string[];
  reasonCodes?: string[];
  payload?: Record<string, unknown>;
  occurredAt?: string;
}) {
  const db = createServiceRoleClient();
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const eventId = crypto.randomUUID();
  const event = {
    event_id: eventId, enterprise_id: context.enterpriseId, operational_entity_id: operationalEntityId, event_type: input.eventType,
    actor_reference: `user:${context.user.id}`, attribution: input.attribution ?? "CUSTOMER_DECISION", evidence_references: input.evidenceReferences ?? [],
    reason_codes: input.reasonCodes ?? [], payload: input.payload ?? {}, occurred_at: occurredAt,
  };
  const result = await db.from("operational_entity_native_replay_events").insert({ ...event, event_digest: hashCanonical(event) });
  if (result.error) fail("Native Replay append", result.error);
  const audit = await db.from("trust_architecture_audit_log").insert({
    enterprise_id: context.enterpriseId, action: input.eventType, actor_reference: `user:${context.user.id}`,
    target_type: "OPERATIONAL_ENTITY", target_id: operationalEntityId, correlation_id: crypto.randomUUID(), metadata: { eventId },
  });
  if (audit.error) fail("Native verification audit", audit.error);
  return eventId;
}

async function extendNativeIdentityGraph(context: NativeContext, input: {
  entityId: string;
  displayName: string;
  accountableOwnerId: string;
  credentialFingerprint: string;
  manifestDigest: string;
  evidenceId: string;
}) {
  const db = createServiceRoleClient();
  const nodes = [
    { node_type: "HUMAN", external_id: input.accountableOwnerId, label: input.accountableOwnerId },
    { node_type: "OPERATIONAL_ENTITY", external_id: input.entityId, label: input.displayName },
    { node_type: "CREDENTIAL", external_id: input.credentialFingerprint, label: `Ed25519 ${input.credentialFingerprint.slice(0, 12)}` },
    { node_type: "OPERATIONAL_ENTITY_MANIFEST", external_id: input.manifestDigest, label: `Manifest ${input.manifestDigest.slice(0, 12)}` },
    { node_type: "NATIVE_IDENTITY_EVIDENCE", external_id: input.evidenceId, label: `Native identity proof ${input.evidenceId}` },
  ];
  const insertedNodes = await db.from("evidence_graph_nodes").upsert(nodes.map((node) => ({ ...node, enterprise_id: context.enterpriseId, domain_key: "IDENTITY", metadata: {} })), { onConflict: "enterprise_id,node_type,external_id", ignoreDuplicates: true });
  if (insertedNodes.error) fail("Native identity Evidence Graph nodes", insertedNodes.error);
  const stored = await db.from("evidence_graph_nodes").select("node_id,node_type,external_id").eq("enterprise_id", context.enterpriseId).in("external_id", nodes.map((node) => node.external_id));
  if (stored.error) fail("Native identity Evidence Graph resolution", stored.error);
  const by = new Map((stored.data ?? []).map((node) => [`${node.node_type}:${node.external_id}`, String(node.node_id)]));
  const owner = by.get(`HUMAN:${input.accountableOwnerId}`);
  const entity = by.get(`OPERATIONAL_ENTITY:${input.entityId}`);
  const credential = by.get(`CREDENTIAL:${input.credentialFingerprint}`);
  const manifest = by.get(`OPERATIONAL_ENTITY_MANIFEST:${input.manifestDigest}`);
  const evidence = by.get(`NATIVE_IDENTITY_EVIDENCE:${input.evidenceId}`);
  if (!owner || !entity || !credential || !manifest || !evidence) fail("Native identity Evidence Graph resolution", { code: "GRAPH_NODE_MISSING" });
  const edges = [
    { from_node_id: owner, to_node_id: entity, edge_type: "ASSERTS" },
    { from_node_id: credential, to_node_id: entity, edge_type: "ASSERTS" },
    { from_node_id: manifest, to_node_id: entity, edge_type: "APPLIES_TO" },
    { from_node_id: evidence, to_node_id: credential, edge_type: "SUPPORTED" },
    { from_node_id: evidence, to_node_id: entity, edge_type: "SUPPORTED" },
  ];
  const inserted = await db.from("evidence_graph_edges").insert(edges.map((edge) => ({ ...edge, enterprise_id: context.enterpriseId, evidence_id: input.evidenceId, correlation_id: null })));
  if (inserted.error && inserted.error.code !== "23505") fail("Native identity Evidence Graph edges", inserted.error);
}

function replayEvent(context: NativeContext, input: {
  eventType: string;
  attribution: string;
  evidenceReferences: string[];
  reasonCodes: string[];
  payload: Record<string, unknown>;
  occurredAt: string;
}) {
  const eventBase = {
    eventId: crypto.randomUUID(), eventType: input.eventType, actorReference: `user:${context.user.id}`, attribution: input.attribution,
    evidenceReferences: input.evidenceReferences, reasonCodes: input.reasonCodes, payload: input.payload, occurredAt: input.occurredAt,
  };
  return { ...eventBase, eventDigest: hashCanonical(eventBase) };
}

export async function registerNativeCredential(context: NativeContext, operationalEntityId: string, raw: Record<string, unknown>) {
  ensureMutationRole(context.role);
  const entity = await entityFor(context, operationalEntityId);
  const signingKeyId = text(raw.signingKeyId, "signingKeyId");
  const authorizationReference = text(raw.authorizationReference, "authorizationReference");
  const publicJwk = raw.publicJwk as JsonWebKey;
  assertSupportedPublicJwk(publicJwk);
  if (publicJwk.kid && publicJwk.kid !== signingKeyId) throw new NativeVerificationServerError("The public JWK key identifier must match signingKeyId.", "UNKNOWN_SIGNING_KEY", 409);
  const fingerprint = credentialFingerprint(publicJwk);
  const db = createServiceRoleClient();
  const active = await db.from("operational_entity_native_credentials").select("credential_id,state").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("state", "ACTIVE").order("valid_from", { ascending: false }).limit(1).maybeSingle();
  if (active.error) fail("Native credential resolution", active.error);
  const rotateFrom = raw.rotateFromCredentialId ? text(raw.rotateFromCredentialId, "rotateFromCredentialId") : null;
  if (active.data && !rotateFrom) throw new NativeVerificationServerError("An active credential already exists; use the rotation contract.", "CREDENTIAL_ROTATION_REQUIRED", 409);
  if (rotateFrom && String(active.data?.credential_id ?? "") !== rotateFrom) throw new NativeVerificationServerError("Credential rotation must reference the current active credential.", "ROTATION_SOURCE_INVALID", 409);
  const now = new Date().toISOString();
  const credentialId = crypto.randomUUID();
  const expiresAt = iso(raw.expiresAt, "expiresAt", false);
  if (expiresAt && Date.parse(expiresAt) <= Date.parse(now)) throw new NativeVerificationServerError("The credential expiry must be in the future.", "EXPIRED_CREDENTIAL", 409);
  const row = {
    credential_id: credentialId, enterprise_id: context.enterpriseId, operational_entity_id: operationalEntityId, signing_key_id: signingKeyId,
    algorithm: NATIVE_SIGNATURE_ALGORITHM, public_jwk: publicJwk, credential_fingerprint: fingerprint, state: rotateFrom ? "PENDING" : "ACTIVE",
    valid_from: now, expires_at: expiresAt, revoked_at: null, rotated_from_credential_id: rotateFrom, authorized_by: context.user.id,
    authorization_reference: authorizationReference,
  };
  const inserted = await db.from("operational_entity_native_credentials").insert(row);
  if (inserted.error) fail("Native credential registration", inserted.error);
  let ownerConfirmed = false;
  if (!rotateFrom && entity.accountable_owner_id && entity.organization_reference) {
    const owner = await db.from("operational_entity_owner_bindings").insert({
      enterprise_id: context.enterpriseId, operational_entity_id: operationalEntityId, accountable_owner_id: String(entity.accountable_owner_id),
      organization_id: String(entity.organization_reference), state: entity.accountable_owner_id ? "CONFIRMED" : "UNKNOWN", approved_by: context.user.id,
      approval_reference: authorizationReference, effective_from: now,
    });
    if (owner.error && owner.error.code !== "23505") fail("Accountable owner binding", owner.error);
    ownerConfirmed = !owner.error;
  }
  await appendNativeEvent(context, operationalEntityId, {
    eventType: "CREDENTIAL_REGISTERED", reasonCodes: [rotateFrom ? "CREDENTIAL_ROTATION_PENDING" : "PUBLIC_CREDENTIAL_REGISTERED"],
    payload: { credentialId, signingKeyId, credentialFingerprint: fingerprint, state: row.state, privateKeyStored: false }, occurredAt: now,
  });
  if (ownerConfirmed) await appendNativeEvent(context, operationalEntityId, {
    eventType: "OWNER_CONFIRMED", reasonCodes: ["OWNER_BINDING_CONFIRMED"],
    payload: { accountableOwnerId: String(entity.accountable_owner_id), organizationId: String(entity.organization_reference), authorizationReference }, occurredAt: now,
  });
  return { credentialId, signingKeyId, credentialFingerprint: fingerprint, algorithm: NATIVE_SIGNATURE_ALGORITHM, state: row.state, privateKeyStored: false };
}

export async function registerNativeManifest(context: NativeContext, operationalEntityId: string, manifest: OperationalEntityManifest) {
  ensureMutationRole(context.role);
  const entity = await entityFor(context, operationalEntityId);
  if (manifest.enterpriseId !== context.enterpriseId) throw new NativeVerificationServerError("The manifest belongs to another tenant.", "WRONG_TENANT", 403);
  if (manifest.operationalEntityId !== operationalEntityId) throw new NativeVerificationServerError("The manifest belongs to another Operational Entity.", "WRONG_ENTITY", 403);
  if (manifest.owner.accountableOwnerId !== String(entity.accountable_owner_id) || manifest.owner.organizationId !== String(entity.organization_reference)) {
    throw new NativeVerificationServerError("The manifest owner does not match the canonical accountable owner.", "OWNER_CONFLICTING", 409);
  }
  const db = createServiceRoleClient();
  const credentialResult = await db.from("operational_entity_native_credentials").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("signing_key_id", manifest.signingKeyId).in("state", ["ACTIVE", "PENDING"]).maybeSingle();
  if (credentialResult.error) fail("Manifest credential resolution", credentialResult.error);
  if (!credentialResult.data) throw new NativeVerificationServerError("The manifest signing key is unknown.", "UNKNOWN_SIGNING_KEY", 409);
  const credential = nativeCredential(credentialResult.data as Row);
  try { verifySignedManifest(manifest, credential); } catch (error) {
    if (error instanceof NativeVerificationError) throw new NativeVerificationServerError(error.message, error.code, error.status);
    throw error;
  }
  if (!manifest.credentials.publicCredentialReferences.includes(manifest.signingKeyId)) throw new NativeVerificationServerError("The manifest does not bind its signing credential.", "MANIFEST_CREDENTIAL_BINDING_MISSING", 409);
  const manifestId = crypto.randomUUID();
  const registered = await db.rpc("register_native_entity_manifest_v1", {
    p_manifest_id: manifestId, p_enterprise_id: context.enterpriseId, p_operational_entity_id: operationalEntityId,
    p_manifest_version: manifest.manifestVersion, p_manifest: manifest, p_manifest_digest: manifest.manifestDigest,
    p_signature: manifest.signature, p_signing_key_id: manifest.signingKeyId, p_issued_at: manifest.issuedAt,
    p_expires_at: manifest.expiresAt, p_registered_by: context.user.id,
  });
  if (registered.error) fail("Atomic native manifest registration", registered.error);
  const supersedesManifestId = (registered.data as Row | null)?.supersedesManifestId ? String((registered.data as Row).supersedesManifestId) : null;
  await appendNativeEvent(context, operationalEntityId, {
    eventType: "MANIFEST_REGISTERED", reasonCodes: ["MANIFEST_SIGNATURE_VERIFIED", supersedesManifestId ? "MANIFEST_VERSION_SUPERSEDES_PRIOR" : "INITIAL_MANIFEST_REGISTERED"],
    evidenceReferences: [`manifest:${manifestId}`], payload: { manifestId, manifestDigest: manifest.manifestDigest, manifestVersion: manifest.manifestVersion, signingKeyId: manifest.signingKeyId },
  });
  return { manifestId, manifestDigest: manifest.manifestDigest, status: "ACTIVE", supersedesManifestId };
}

export async function issueStoredNativeChallenge(context: NativeContext, operationalEntityId: string, expectedAudience: string) {
  ensureMutationRole(context.role);
  await entityFor(context, operationalEntityId);
  const audience = text(expectedAudience, "audience");
  const db = createServiceRoleClient();
  const manifestResult = await db.from("operational_entity_manifests").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("status", "ACTIVE").order("issued_at", { ascending: false }).limit(1).maybeSingle();
  if (manifestResult.error) fail("Active manifest resolution", manifestResult.error);
  if (!manifestResult.data) throw new NativeVerificationServerError("An active signed manifest is required.", "MANIFEST_NOT_FOUND", 409);
  const credentialResult = await db.from("operational_entity_native_credentials").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("signing_key_id", manifestResult.data.signing_key_id).in("state", ["ACTIVE", "PENDING"]).maybeSingle();
  if (credentialResult.error) fail("Challenge credential resolution", credentialResult.error);
  if (!credentialResult.data) throw new NativeVerificationServerError("The active manifest credential is unavailable.", "UNKNOWN_SIGNING_KEY", 409);
  const challenge = issueNativeChallenge({ enterpriseId: context.enterpriseId, operationalEntityId, audience, manifestDigest: String(manifestResult.data.manifest_digest), signingKeyId: String(manifestResult.data.signing_key_id) });
  const inserted = await db.from("operational_entity_native_challenges").insert({
    challenge_id: challenge.challengeId, enterprise_id: challenge.enterpriseId, operational_entity_id: challenge.operationalEntityId,
    nonce_hash: challenge.nonceHash, audience: challenge.audience, issuer: challenge.issuer, subject: challenge.subject,
    manifest_digest: challenge.manifestDigest, signing_key_id: challenge.signingKeyId, issued_at: challenge.issuedAt, expires_at: challenge.expiresAt,
    status: challenge.status, issued_by: context.user.id,
  });
  if (inserted.error) fail("Native challenge issuance", inserted.error);
  await appendNativeEvent(context, operationalEntityId, {
    eventType: "CHALLENGE_ISSUED", reasonCodes: ["SHORT_LIVED_SINGLE_USE_CHALLENGE"],
    payload: { challengeId: challenge.challengeId, audience: challenge.audience, manifestDigest: challenge.manifestDigest, signingKeyId: challenge.signingKeyId, issuedAt: challenge.issuedAt, expiresAt: challenge.expiresAt, noncePersisted: false },
    occurredAt: challenge.issuedAt,
  });
  const safeChallenge: Omit<NativeChallenge, "nonceHash"> = {
    challengeId: challenge.challengeId,
    enterpriseId: challenge.enterpriseId,
    operationalEntityId: challenge.operationalEntityId,
    nonce: challenge.nonce,
    audience: challenge.audience,
    issuer: challenge.issuer,
    subject: challenge.subject,
    manifestDigest: challenge.manifestDigest,
    signingKeyId: challenge.signingKeyId,
    issuedAt: challenge.issuedAt,
    expiresAt: challenge.expiresAt,
    status: challenge.status,
  };
  return safeChallenge;
}

function runtimeObservation(raw: unknown): RuntimeObservation | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  return {
    runtimeType: value.runtimeType ? text(value.runtimeType, "runtimeType") : null, environment: value.environment ? text(value.environment, "environment") : null,
    region: value.region ? text(value.region, "region") : null, workloadIdentifier: value.workloadIdentifier ? text(value.workloadIdentifier, "workloadIdentifier") : null,
    deploymentIdentifier: value.deploymentIdentifier ? text(value.deploymentIdentifier, "deploymentIdentifier") : null, runtimeVersion: value.runtimeVersion ? text(value.runtimeVersion, "runtimeVersion") : null,
    manifestDigest: value.manifestDigest ? text(value.manifestDigest, "manifestDigest") : null, credentialFingerprint: value.credentialFingerprint ? text(value.credentialFingerprint, "credentialFingerprint") : null,
    observedAt: iso(value.observedAt, "observedAt")!, source: text(value.source, "source"),
  };
}

function softwareObservation(raw: unknown): SoftwareObservation | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  return {
    buildDigest: value.buildDigest ? text(value.buildDigest, "buildDigest") : null, artifactDigest: value.artifactDigest ? text(value.artifactDigest, "artifactDigest") : null,
    sourceDigest: value.sourceDigest ? text(value.sourceDigest, "sourceDigest") : null, observedAt: iso(value.observedAt, "observedAt")!, source: text(value.source, "source"),
  };
}

function proofSubmission(raw: unknown): NativeProofSubmission {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new NativeVerificationServerError("A signed proof is required.", "NATIVE_PROOF_REQUIRED");
  const value = raw as Record<string, unknown>;
  return {
    challengeId: text(value.challengeId, "proof.challengeId"), enterpriseId: text(value.enterpriseId, "proof.enterpriseId"),
    operationalEntityId: text(value.operationalEntityId, "proof.operationalEntityId"), nonce: text(value.nonce, "proof.nonce", 256),
    audience: text(value.audience, "proof.audience"), manifestDigest: text(value.manifestDigest, "proof.manifestDigest"),
    signingKeyId: text(value.signingKeyId, "proof.signingKeyId"), signature: text(value.signature, "proof.signature", 128),
    submittedAt: iso(value.submittedAt, "proof.submittedAt")!,
  };
}

export async function submitNativeProof(context: NativeContext, operationalEntityId: string, raw: Record<string, unknown>, expectedAudience: string) {
  ensureMutationRole(context.role);
  const entity = await entityFor(context, operationalEntityId);
  const proof = proofSubmission(raw.proof);
  const challengeId = proof.challengeId;
  const db = createServiceRoleClient();
  const challengeResult = await db.from("operational_entity_native_challenges").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("challenge_id", challengeId).maybeSingle();
  if (challengeResult.error) fail("Native challenge resolution", challengeResult.error);
  if (!challengeResult.data) throw new NativeVerificationServerError("The challenge was not found in this tenant.", "CHALLENGE_NOT_FOUND", 404);
  const manifestResult = await db.from("operational_entity_manifests").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("manifest_digest", challengeResult.data.manifest_digest).maybeSingle();
  if (manifestResult.error) fail("Native manifest resolution", manifestResult.error);
  if (!manifestResult.data) throw new NativeVerificationServerError("The challenge manifest is unavailable.", "MANIFEST_NOT_FOUND", 409);
  const manifest = manifestResult.data.manifest as OperationalEntityManifest;
  const credentialResult = await db.from("operational_entity_native_credentials").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("signing_key_id", challengeResult.data.signing_key_id).maybeSingle();
  if (credentialResult.error) fail("Native credential resolution", credentialResult.error);
  if (!credentialResult.data) throw new NativeVerificationServerError("The challenge signing key is unknown.", "UNKNOWN_SIGNING_KEY", 409);
  const ownerResult = await db.from("operational_entity_owner_bindings").select("state,accountable_owner_id,organization_id,effective_from,effective_to").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("effective_from", { ascending: false }).limit(1).maybeSingle();
  if (ownerResult.error) fail("Owner binding resolution", ownerResult.error);
  const priorVerification = await db.from("operational_entity_native_verifications").select("continuity_snapshot,manifest_id").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("verified_at", { ascending: false }).limit(1).maybeSingle();
  if (priorVerification.error) fail("Continuity history resolution", priorVerification.error);
  let priorManifest: OperationalEntityManifest | null = null;
  if (priorVerification.data?.manifest_id) {
    const prior = await db.from("operational_entity_manifests").select("manifest").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("manifest_id", priorVerification.data.manifest_id).maybeSingle();
    if (prior.error) fail("Prior manifest resolution", prior.error);
    priorManifest = (prior.data?.manifest as OperationalEntityManifest | undefined) ?? null;
  }
  const runtime = runtimeObservation(raw.runtimeObservation);
  const software = softwareObservation(raw.softwareObservation);
  const verificationTime = Date.now();
  const recordedOwnerState = !ownerResult.data
    ? "UNKNOWN"
    : Date.parse(String(ownerResult.data.effective_from)) > verificationTime
      ? "PENDING"
      : ownerResult.data.effective_to && Date.parse(String(ownerResult.data.effective_to)) <= verificationTime
        ? "EXPIRED"
        : String(ownerResult.data.state) as OwnerBindingState;
  const ownerState: OwnerBindingState = !entity.accountable_owner_id
    ? "UNKNOWN"
    : ownerResult.data && (String(ownerResult.data.accountable_owner_id) !== String(entity.accountable_owner_id) || String(ownerResult.data.organization_id) !== String(entity.organization_reference))
      ? "CONFLICTING"
      : recordedOwnerState;
  const result = verifyNativeEntity({
    expectedEnterpriseId: context.enterpriseId, expectedOperationalEntityId: operationalEntityId, expectedAudience,
    entityLifecycleState: String(entity.lifecycle_state), manifestState: String(manifestResult.data.status), manifest, priorManifest, credential: nativeCredential(credentialResult.data as Row),
    challenge: nativeChallenge(challengeResult.data as Row, String(proof.nonce ?? "")), proof,
    ownerState, runtimeObservation: runtime, softwareObservation: software,
    previousContinuityFingerprint: (priorVerification.data?.continuity_snapshot as ContinuityFingerprint | undefined) ?? null,
  });
  const attemptDigest = hashCanonical({ enterpriseId: context.enterpriseId, operationalEntityId, challengeId, submittedAt: proof.submittedAt, signatureDigest: hashCanonical({ signature: proof.signature }) });
  if (!result.evidence) {
    const attempt = await db.from("operational_entity_native_verification_attempts").insert({ enterprise_id: context.enterpriseId, operational_entity_id: operationalEntityId, challenge_id: challengeId, status: result.status === "EXPIRED" ? "EXPIRED" : result.reasonCodes.includes("CHALLENGE_REPLAY") ? "REPLAYED" : "REJECTED", reason_codes: result.reasonCodes, attempt_digest: attemptDigest, submitted_at: proof.submittedAt, actor_id: context.user.id });
    if (attempt.error && attempt.error.code !== "23505") fail("Rejected proof audit", attempt.error);
    if (challengeResult.data.status === "ISSUED") {
      const rejected = await db.from("operational_entity_native_challenges").update({ status: result.status === "EXPIRED" ? "EXPIRED" : "REJECTED", consumed_at: proof.submittedAt }).eq("challenge_id", challengeId).eq("status", "ISSUED");
      if (rejected.error) fail("Rejected challenge transition", rejected.error);
    }
    await appendNativeEvent(context, operationalEntityId, { eventType: result.status === "EXPIRED" ? "VERIFICATION_EXPIRED" : "ENTITY_CHANGED", reasonCodes: result.reasonCodes, payload: { challengeId, status: result.status } });
    return { result, canonicalReevaluation: "NOT_TRIGGERED" };
  }
  const wasPreviouslyVerified = Boolean(priorVerification.data);
  const verifiedCredential = nativeCredential(credentialResult.data as Row);
  const isRotation = verifiedCredential.state === "PENDING" && Boolean(verifiedCredential.rotatedFromCredentialId);
  const normalizedDisplayName = String(entity.display_reference ?? "").trim().toLowerCase();
  const establishedIdentityEvent = normalizedDisplayName === "agent alpha"
    ? "ALPHA_VERIFIED"
    : normalizedDisplayName === "agent beta"
      ? "BETA_VERIFIED"
      : "NATIVE_IDENTITY_VERIFIED";
  const replay = replayEvent(context, {
    eventType: isRotation ? "CREDENTIAL_ROTATED" : wasPreviouslyVerified ? "REVERIFICATION_COMPLETED" : establishedIdentityEvent,
    attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: result.evidenceReferences, reasonCodes: result.reasonCodes,
    payload: { verificationId: result.verificationId, evidenceId: result.evidence.evidenceId, continuityResult: result.continuityResult, changedAttributes: result.changedAttributes },
    occurredAt: result.verifiedAt,
  });
  const additionalReplay = [
    replayEvent(context, {
      eventType: "CHALLENGE_VERIFIED", attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: result.evidenceReferences,
      reasonCodes: ["NATIVE_SIGNATURE_VERIFIED", "CHALLENGE_CONSUMED"], payload: { challengeId, verificationId: result.verificationId }, occurredAt: result.verifiedAt,
    }),
    ...(isRotation ? [replayEvent(context, {
      eventType: "REVERIFICATION_COMPLETED", attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: result.evidenceReferences,
      reasonCodes: result.reasonCodes, payload: { verificationId: result.verificationId, rotatedFromCredentialId: verifiedCredential.rotatedFromCredentialId, credentialId: verifiedCredential.credentialId }, occurredAt: result.verifiedAt,
    })] : []),
    ...(result.runtimeBinding === "RUNTIME_MATCH" ? [replayEvent(context, {
      eventType: "RUNTIME_BOUND", attribution: "RUNTIME_OBSERVATION", evidenceReferences: result.evidenceReferences,
      reasonCodes: ["RUNTIME_BINDING_VERIFIED"], payload: { verificationId: result.verificationId, continuityFingerprint: result.continuityFingerprint.fingerprint }, occurredAt: result.verifiedAt,
    })] : []),
    ...(result.softwareProvenance === "VERIFIED_DIGEST" ? [replayEvent(context, {
      eventType: "BUILD_VERIFIED", attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: result.evidenceReferences,
      reasonCodes: ["VERIFIED_DIGEST"], payload: { verificationId: result.verificationId, manifestDigest: result.manifestDigest }, occurredAt: result.verifiedAt,
    })] : []),
    ...(result.changedAttributes.length ? [replayEvent(context, {
      eventType: "ENTITY_CHANGED", attribution: "CYBER_SENTINELS_INTERPRETATION", evidenceReferences: result.evidenceReferences,
      reasonCodes: result.changedAttributes, payload: { verificationId: result.verificationId, changedAttributes: result.changedAttributes }, occurredAt: result.verifiedAt,
    })] : []),
  ];
  const additionalMemories: Array<Record<string, unknown>> = [];
  if (result.changedAttributes.includes("OWNER_CHANGED")) additionalMemories.push({ memoryType: "ACCOUNTABLE_OWNER_CHANGED" });
  if (result.changedAttributes.includes("MANIFEST_CHANGED")) additionalMemories.push({ memoryType: "MATERIAL_MANIFEST_CHANGE" });
  if (result.changedAttributes.includes("RUNTIME_CHANGED")) additionalMemories.push({ memoryType: "RUNTIME_IDENTITY_CHANGED" });
  if (result.changedAttributes.includes("BUILD_CHANGED") || result.softwareProvenance === "MISMATCH") additionalMemories.push({ memoryType: "BUILD_PROVENANCE_CONFLICT" });
  for (const material of additionalMemories) Object.assign(material, {
    sourceId: result.verificationId, domainKey: evidenceDomain(entity.entity_type), occurredAt: result.verifiedAt,
    summary: { verificationId: result.verificationId, changedAttributes: result.changedAttributes, softwareProvenance: result.softwareProvenance },
  });
  const establishedIdentityMemory = normalizedDisplayName === "agent alpha"
    ? "ALPHA_NATIVE_IDENTITY_ESTABLISHED"
    : normalizedDisplayName === "agent beta"
      ? "BETA_NATIVE_IDENTITY_ESTABLISHED"
      : "NATIVE_ENTITY_VERIFIED";
  const memory = {
    memoryType: isRotation ? "SIGNING_KEY_ROTATED" : wasPreviouslyVerified ? "ENTITY_REVERIFIED" : establishedIdentityMemory, sourceId: result.verificationId,
    domainKey: evidenceDomain(entity.entity_type), occurredAt: result.verifiedAt, summary: { evidenceId: result.evidence.evidenceId, continuityResult: result.continuityResult, changedAttributes: result.changedAttributes },
  };
  const consumed = await db.rpc("consume_native_entity_challenge_v1", {
    p_enterprise_id: context.enterpriseId, p_operational_entity_id: operationalEntityId, p_challenge_id: challengeId, p_actor_id: context.user.id,
    p_submitted_at: proof.submittedAt, p_attempt_digest: attemptDigest,
    p_verification: {
      ...result, evidence: undefined, manifestId: manifestResult.data.manifest_id, credentialId: credentialResult.data.credential_id,
      continuityFingerprint: result.continuityFingerprint.fingerprint, continuitySnapshot: result.continuityFingerprint,
      runtimeObservation: runtime, runtimeObservationDigest: runtime ? hashCanonical(runtime) : null,
      softwareObservation: software, softwareObservationDigest: software ? hashCanonical(software) : null,
    },
    p_evidence: result.evidence, p_replay: { ...replay, additionalEvents: additionalReplay }, p_memory: { ...memory, additionalMemories },
  });
  if (consumed.error) fail("Atomic native challenge consumption", consumed.error);
  if (String((consumed.data as Row)?.status) !== "VERIFIED") throw new NativeVerificationServerError("The challenge was already consumed.", "CHALLENGE_REPLAY", 409);
  await extendNativeIdentityGraph(context, {
    entityId: operationalEntityId,
    displayName: String(entity.display_reference),
    accountableOwnerId: String(entity.accountable_owner_id),
    credentialFingerprint: result.credentialFingerprint,
    manifestDigest: result.manifestDigest,
    evidenceId: result.evidence.evidenceId,
  });
  let canonicalReevaluation = "TRIGGERED";
  try {
    await ingestContinuousTrustSignal({
      tenantId: context.enterpriseId, actorId: context.user.id, role: context.role, correlationId: crypto.randomUUID(),
      idempotencyKey: `native-verification:${result.evidence.evidenceId}`,
      raw: {
        id: crypto.randomUUID(), entityId: operationalEntityId, entityType: continuousEntityType(entity.entity_type),
        signalType: "AI_AGENT", source: "cyber_sentinels_native", provider: null, observedAt: result.verifiedAt, receivedAt: new Date().toISOString(),
        severity: result.status === "REVIEW_REQUIRED" ? "HIGH" : result.changedAttributes.length ? "MEDIUM" : "INFORMATIONAL",
        confidence: result.status === "VERIFIED" ? 0.95 : 0.75, status: result.status === "REVIEW_REQUIRED" ? "INCONCLUSIVE" : "POSITIVE",
        metadata: { verificationId: result.verificationId, evidenceId: result.evidence.evidenceId, continuityResult: result.continuityResult, changedAttributes: result.changedAttributes },
      },
    });
  } catch (error) {
    canonicalReevaluation = "FAILED_RETRYABLE";
    console.error("Native verification canonical reevaluation trigger failed.", { code: (error as { code?: string })?.code });
  }
  return { result, canonicalReevaluation };
}

export async function revokeNativeCredential(context: NativeContext, operationalEntityId: string, credentialId: string, reason: string) {
  ensureMutationRole(context.role);
  const entity = await entityFor(context, operationalEntityId);
  const safeReason = String(reason ?? "").trim();
  if (!safeReason || safeReason.length > 500) throw new NativeVerificationServerError("A revocation reason is required.", "REVOCATION_REASON_REQUIRED");
  const db = createServiceRoleClient();
  const now = new Date().toISOString();
  const credential = await db.from("operational_entity_native_credentials").update({ state: "REVOKED", revoked_at: now, updated_at: now }).eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("credential_id", credentialId).in("state", ["ACTIVE", "PENDING"]).select("credential_id,signing_key_id,credential_fingerprint").maybeSingle();
  if (credential.error) fail("Native credential revocation", credential.error);
  if (!credential.data) throw new NativeVerificationServerError("The active credential was not found.", "UNKNOWN_SIGNING_KEY", 404);
  const evidence = await db.from("native_entity_identity_evidence").update({ revoked_at: now, revocation_reason: safeReason }).eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("credential_fingerprint", credential.data.credential_fingerprint).is("revoked_at", null);
  if (evidence.error) fail("Native evidence revocation", evidence.error);
  await appendNativeEvent(context, operationalEntityId, { eventType: "CREDENTIAL_REVOKED", reasonCodes: ["CREDENTIAL_REVOKED", "CANONICAL_REEVALUATION_REQUIRED"], payload: { credentialId, signingKeyId: credential.data.signing_key_id, reason: safeReason }, occurredAt: now });
  const memory = await db.from("trust_memory_index").insert({ enterprise_id: context.enterpriseId, subject_id: operationalEntityId, domain_key: evidenceDomain(entity.entity_type), memory_type: "SIGNING_KEY_REVOKED", source_id: credentialId, occurred_at: now, summary: { signingKeyId: credential.data.signing_key_id, reason: safeReason } });
  if (memory.error && memory.error.code !== "23505") fail("Credential revocation Trust Memory", memory.error);
  const canonicalReevaluation = await triggerRevocationReevaluation(context, operationalEntityId, String(entity.entity_type), "CREDENTIAL_REVOKED", credentialId, now);
  return { credentialId, status: "REVOKED", revokedAt: now, canonicalReevaluation };
}

async function triggerRevocationReevaluation(context: NativeContext, operationalEntityId: string, entityType: string, reasonCode: string, sourceId: string, observedAt: string) {
  try {
    await ingestContinuousTrustSignal({
      tenantId: context.enterpriseId, actorId: context.user.id, role: context.role, correlationId: crypto.randomUUID(),
      idempotencyKey: `native-revocation:${reasonCode}:${sourceId}`,
      raw: {
        id: crypto.randomUUID(), entityId: operationalEntityId, entityType: continuousEntityType(entityType),
        signalType: reasonCode.includes("AUTHORITY") ? "AUTHORITY" : reasonCode.includes("CREDENTIAL") ? "CREDENTIAL" : "AI_AGENT",
        source: "cyber_sentinels_native", provider: null, observedAt, receivedAt: new Date().toISOString(), severity: "CRITICAL", confidence: 1,
        status: "REVOKED", metadata: { reasonCode, sourceId, canonicalReevaluationRequired: true },
      },
    });
    return "TRIGGERED";
  } catch (error) {
    console.error("Native revocation canonical reevaluation trigger failed.", { code: (error as { code?: string })?.code });
    return "FAILED_RETRYABLE";
  }
}

export async function revokeNativeManifest(context: NativeContext, operationalEntityId: string, manifestId: string, reason: string) {
  ensureMutationRole(context.role);
  const entity = await entityFor(context, operationalEntityId);
  const safeReason = String(reason ?? "").trim();
  if (!safeReason || safeReason.length > 500) throw new NativeVerificationServerError("A revocation reason is required.", "REVOCATION_REASON_REQUIRED");
  const db = createServiceRoleClient();
  const now = new Date().toISOString();
  const manifest = await db.from("operational_entity_manifests").update({ status: "REVOKED", revoked_at: now }).eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("manifest_id", manifestId).in("status", ["ACTIVE", "SUPERSEDED"]).select("manifest_id,manifest_digest").maybeSingle();
  if (manifest.error) fail("Native manifest revocation", manifest.error);
  if (!manifest.data) throw new NativeVerificationServerError("The manifest was not found or was already inactive.", "MANIFEST_NOT_FOUND", 404);
  const evidence = await db.from("native_entity_identity_evidence").update({ revoked_at: now, revocation_reason: safeReason }).eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).eq("manifest_digest", manifest.data.manifest_digest).is("revoked_at", null);
  if (evidence.error) fail("Manifest evidence revocation", evidence.error);
  await appendNativeEvent(context, operationalEntityId, { eventType: "MANIFEST_REVOKED", reasonCodes: ["MANIFEST_REVOKED", "CANONICAL_REEVALUATION_REQUIRED"], payload: { manifestId, manifestDigest: manifest.data.manifest_digest, reason: safeReason }, occurredAt: now });
  const memory = await db.from("trust_memory_index").insert({ enterprise_id: context.enterpriseId, subject_id: operationalEntityId, domain_key: evidenceDomain(entity.entity_type), memory_type: "MATERIAL_MANIFEST_CHANGE", source_id: manifestId, occurred_at: now, summary: { manifestDigest: manifest.data.manifest_digest, state: "REVOKED", reason: safeReason } });
  if (memory.error && memory.error.code !== "23505") fail("Manifest revocation Trust Memory", memory.error);
  return { manifestId, status: "REVOKED", revokedAt: now, canonicalReevaluation: await triggerRevocationReevaluation(context, operationalEntityId, String(entity.entity_type), "MANIFEST_REVOKED", manifestId, now) };
}

export async function revokeNativeOwnerBinding(context: NativeContext, operationalEntityId: string, reason: string) {
  ensureMutationRole(context.role);
  const entity = await entityFor(context, operationalEntityId);
  const safeReason = String(reason ?? "").trim();
  if (!safeReason || safeReason.length > 500) throw new NativeVerificationServerError("A revocation reason is required.", "REVOCATION_REASON_REQUIRED");
  const db = createServiceRoleClient();
  const prior = await db.from("operational_entity_owner_bindings").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("effective_from", { ascending: false }).limit(1).maybeSingle();
  if (prior.error) fail("Owner binding resolution", prior.error);
  if (!prior.data) throw new NativeVerificationServerError("The accountable owner binding was not found.", "OWNER_UNCONFIRMED", 404);
  const now = new Date().toISOString();
  const bindingId = crypto.randomUUID();
  const inserted = await db.from("operational_entity_owner_bindings").insert({
    owner_binding_id: bindingId, enterprise_id: context.enterpriseId, operational_entity_id: operationalEntityId,
    accountable_owner_id: prior.data.accountable_owner_id, organization_id: prior.data.organization_id, state: "REVOKED",
    approved_by: context.user.id, approval_reference: `revocation:${bindingId}`, effective_from: now, supersedes_owner_binding_id: prior.data.owner_binding_id,
  });
  if (inserted.error) fail("Owner binding revocation", inserted.error);
  await appendNativeEvent(context, operationalEntityId, { eventType: "OWNER_REVOKED", reasonCodes: ["OWNER_REVOKED", "CANONICAL_REEVALUATION_REQUIRED"], payload: { ownerBindingId: bindingId, accountableOwnerId: prior.data.accountable_owner_id, reason: safeReason }, occurredAt: now });
  const memory = await db.from("trust_memory_index").insert({ enterprise_id: context.enterpriseId, subject_id: operationalEntityId, domain_key: evidenceDomain(entity.entity_type), memory_type: "ACCOUNTABLE_OWNER_CHANGED", source_id: bindingId, occurred_at: now, summary: { state: "REVOKED", accountableOwnerId: prior.data.accountable_owner_id, reason: safeReason } });
  if (memory.error && memory.error.code !== "23505") fail("Owner revocation Trust Memory", memory.error);
  return { ownerBindingId: bindingId, status: "REVOKED", revokedAt: now, canonicalReevaluation: await triggerRevocationReevaluation(context, operationalEntityId, String(entity.entity_type), "OWNER_REVOKED", bindingId, now) };
}

export async function loadNativeVerification(context: NativeContext, operationalEntityId: string) {
  await entityFor(context, operationalEntityId);
  const db = createServiceRoleClient();
  const [manifests, credentials, verifications, evidence, replay, owners] = await Promise.all([
    db.from("operational_entity_manifests").select("manifest_id,manifest_version,manifest_digest,signing_key_id,status,issued_at,expires_at,supersedes_manifest_id").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("issued_at", { ascending: false }).limit(20),
    db.from("operational_entity_native_credentials").select("credential_id,signing_key_id,algorithm,credential_fingerprint,state,valid_from,expires_at,revoked_at,rotated_from_credential_id").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("valid_from", { ascending: false }).limit(20),
    db.from("operational_entity_native_verifications").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("verified_at", { ascending: false }).limit(20),
    db.from("native_entity_identity_evidence").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("verified_at", { ascending: false }).limit(50),
    db.from("operational_entity_native_replay_events").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("occurred_at", { ascending: true }).limit(200),
    db.from("operational_entity_owner_bindings").select("*").eq("enterprise_id", context.enterpriseId).eq("operational_entity_id", operationalEntityId).order("effective_from", { ascending: false }).limit(20),
  ]);
  for (const result of [manifests, credentials, verifications, evidence, replay, owners]) if (result.error) fail("Native verification retrieval", result.error);
  return { manifests: manifests.data ?? [], credentials: credentials.data ?? [], verifications: verifications.data ?? [], evidence: evidence.data ?? [], replay: replay.data ?? [], ownerBindings: owners.data ?? [] };
}
