import { createPublicKey, randomBytes, randomUUID, verify as verifySignature } from "node:crypto";
import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { hashCanonical, hashesEqual, sha256Hex } from "../../src/lib/trust-core/hash.ts";

export const NATIVE_VERIFICATION_ALGORITHM_VERSION = "native-entity-verification-v1" as const;
export const CONTINUITY_FINGERPRINT_VERSION = "entity-continuity-fingerprint-v1" as const;
export const NATIVE_SIGNATURE_ALGORITHM = "Ed25519" as const;
export const NATIVE_EVIDENCE_PROVENANCE = "CYBER_SENTINELS_NATIVE" as const;
export const NATIVE_MANIFEST_MAX_BYTES = 65_536;
export const NATIVE_CHALLENGE_TTL_SECONDS = 300;
export const NATIVE_MAX_CLOCK_SKEW_SECONDS = 60;

export type NativeEntityType = "AI_AGENT" | "WORKLOAD" | "SERVICE" | "APPLICATION" | "MODEL_ENDPOINT" | "MACHINE" | "DEVICE";
export type NativeCredentialState = "PENDING" | "ACTIVE" | "RETIRED" | "REVOKED" | "EXPIRED";
export type NativeChallengeStatus = "ISSUED" | "VERIFIED" | "EXPIRED" | "REPLAYED" | "REJECTED";
export type OwnerBindingState = "CONFIRMED" | "PENDING" | "EXPIRED" | "REVOKED" | "CONFLICTING" | "UNKNOWN";
export type SoftwareProvenanceState = "VERIFIED_DIGEST" | "DECLARED_ONLY" | "MISMATCH" | "NOT_AVAILABLE";
export type RuntimeBindingState = "RUNTIME_MATCH" | "RUNTIME_CHANGED" | "RUNTIME_UNVERIFIED" | "RUNTIME_CONFLICT" | "INSUFFICIENT_EVIDENCE";
export type NativeVerificationStatus = "VERIFIED" | "PARTIALLY_VERIFIED" | "REVIEW_REQUIRED" | "FAILED" | "EXPIRED" | "UNKNOWN";
export type NativeChangeType =
  | "SIGNING_KEY_CHANGED"
  | "OWNER_CHANGED"
  | "BUILD_CHANGED"
  | "MODEL_CHANGED"
  | "RUNTIME_CHANGED"
  | "CAPABILITY_EXPANDED"
  | "CAPABILITY_REDUCED"
  | "AUTHORITY_CHANGED"
  | "MANIFEST_CHANGED"
  | "CREDENTIAL_EXPIRED"
  | "CREDENTIAL_REVOKED"
  | "UNKNOWN_CHANGE";

export type PublicJwk = JsonWebKey & { kty: "OKP"; crv: "Ed25519"; x: string; kid?: string; alg?: string; use?: string; key_ops?: string[] };

export type OperationalEntityManifestClaims = {
  manifestVersion: "1.0";
  operationalEntityId: string;
  entityType: NativeEntityType;
  displayName: string;
  enterpriseId: string;
  owner: { accountableOwnerId: string; organizationId: string };
  software: {
    applicationId: string | null;
    version: string | null;
    buildDigest: string | null;
    sourceDigest: string | null;
    artifactDigest: string | null;
    packageReference: string | null;
  };
  ai: {
    modelProvider: string | null;
    modelIdentifier: string | null;
    modelVersion: string | null;
    agentFramework: string | null;
    declaredTools: string[];
  };
  runtime: {
    runtimeType: string | null;
    environment: string | null;
    region: string | null;
    workloadIdentifier: string | null;
    deploymentIdentifier: string | null;
    runtimeVersion: string | null;
  };
  authority: { authorityReference: string | null };
  credentials: { publicCredentialReferences: string[] };
  declaredCapabilities: string[];
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  signingKeyId: string;
};

export type OperationalEntityManifest = OperationalEntityManifestClaims & {
  manifestDigest: string;
  signature: string;
  signatureProfile?: "NATIVE_MANIFEST_V1" | "PUBLIC_MANIFEST_V1";
  signedPublicManifest?: Record<string, unknown>;
};

export type NativeCredential = {
  credentialId: string;
  enterpriseId: string;
  operationalEntityId: string;
  signingKeyId: string;
  algorithm: typeof NATIVE_SIGNATURE_ALGORITHM;
  publicJwk: PublicJwk;
  credentialFingerprint: string;
  state: NativeCredentialState;
  validFrom: string;
  expiresAt: string | null;
  revokedAt: string | null;
  rotatedFromCredentialId: string | null;
};

export type NativeChallenge = {
  challengeId: string;
  enterpriseId: string;
  operationalEntityId: string;
  nonce: string;
  nonceHash: string;
  audience: string;
  issuer: "cyber-sentinels";
  subject: string;
  manifestDigest: string;
  signingKeyId: string;
  issuedAt: string;
  expiresAt: string;
  status: NativeChallengeStatus;
};

export type NativeProofSubmission = {
  challengeId: string;
  enterpriseId: string;
  operationalEntityId: string;
  nonce: string;
  audience: string;
  manifestDigest: string;
  signingKeyId: string;
  signature: string;
  submittedAt: string;
};

export type RuntimeObservation = {
  runtimeType: string | null;
  environment: string | null;
  region: string | null;
  workloadIdentifier: string | null;
  deploymentIdentifier: string | null;
  runtimeVersion: string | null;
  manifestDigest: string | null;
  credentialFingerprint: string | null;
  observedAt: string;
  source: string;
};

export type SoftwareObservation = {
  buildDigest: string | null;
  artifactDigest: string | null;
  sourceDigest: string | null;
  observedAt: string;
  source: string;
};

export type ContinuityFingerprintInput = {
  enterpriseId: string;
  operationalEntityId: string;
  credentialFingerprint: string;
  manifestDigest: string;
  accountableOwnerId: string;
  softwareDigest: string | null;
  runtimeBinding: RuntimeBindingState;
  runtimeDigest: string | null;
  modelIdentifier: string | null;
  capabilityDigest: string;
  authorityReference: string | null;
};

export type ContinuityFingerprint = ContinuityFingerprintInput & {
  version: typeof CONTINUITY_FINGERPRINT_VERSION;
  fingerprint: string;
};

export type NativeIdentityEvidence = {
  evidenceId: string;
  evidenceType: "NATIVE_ENTITY_IDENTITY_PROOF";
  operationalEntityId: string;
  enterpriseId: string;
  manifestDigest: string;
  credentialFingerprint: string;
  signingKeyId: string;
  challengeId: string;
  verificationAlgorithm: typeof NATIVE_SIGNATURE_ALGORITHM;
  verificationAlgorithmVersion: typeof NATIVE_VERIFICATION_ALGORITHM_VERSION;
  verifiedAt: string;
  expiresAt: string;
  reasonCodes: string[];
  evidenceDigest: string;
  provenance: typeof NATIVE_EVIDENCE_PROVENANCE;
};

export type NativeVerificationResult = {
  verificationId: string;
  operationalEntityId: string;
  status: NativeVerificationStatus;
  verifiedClaims: string[];
  unverifiedClaims: string[];
  conflictingClaims: string[];
  evidenceReferences: string[];
  manifestDigest: string;
  credentialFingerprint: string;
  continuityResult: "CONTINUITY_ESTABLISHED" | "CONTINUITY_PRESERVED" | "CONTINUITY_CHANGED" | "CONTINUITY_UNAVAILABLE";
  continuityFingerprint: ContinuityFingerprint;
  changedAttributes: NativeChangeType[];
  runtimeBinding: RuntimeBindingState;
  softwareProvenance: SoftwareProvenanceState;
  reasonCodes: string[];
  algorithmVersion: typeof NATIVE_VERIFICATION_ALGORITHM_VERSION;
  verifiedAt: string;
  expiresAt: string;
  evidence: NativeIdentityEvidence | null;
};

export class NativeVerificationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "NativeVerificationError";
    this.code = code;
    this.status = status;
  }
}

const referencePattern = /^[A-Za-z0-9_.:/-]{1,240}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const allowedEntityTypes = new Set<NativeEntityType>(["AI_AGENT", "WORKLOAD", "SERVICE", "APPLICATION", "MODEL_ENDPOINT", "MACHINE", "DEVICE"]);
const allowedCapabilities = /^[a-z][a-z0-9_.:-]{0,127}$/;

function timestamp(value: string, code: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new NativeVerificationError("A required timestamp is invalid.", code);
  return parsed;
}

function reference(value: string, code: string) {
  if (!referencePattern.test(value)) throw new NativeVerificationError("A required reference is invalid.", code);
}

function optionalDigest(value: string | null, code: string) {
  if (value !== null && !digestPattern.test(value)) throw new NativeVerificationError("A supplied digest is invalid.", code);
}

function uniqueStrings(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function declaredCapabilityVocabulary(manifest: OperationalEntityManifest | OperationalEntityManifestClaims) {
  return uniqueStrings([...manifest.declaredCapabilities, ...manifest.ai.declaredTools]);
}

function stableRuntimeDigest(observation: RuntimeObservation | null) {
  if (!observation) return null;
  return hashCanonical({
    runtimeType: observation.runtimeType,
    environment: observation.environment,
    region: observation.region,
    workloadIdentifier: observation.workloadIdentifier,
    deploymentIdentifier: observation.deploymentIdentifier,
    runtimeVersion: observation.runtimeVersion,
    manifestDigest: observation.manifestDigest,
    credentialFingerprint: observation.credentialFingerprint,
  });
}

function claimsForDigest(manifest: OperationalEntityManifest | OperationalEntityManifestClaims): OperationalEntityManifestClaims {
  const claims = Object.fromEntries(
    Object.entries(manifest).filter(([key]) => key !== "manifestDigest" && key !== "signature"),
  ) as OperationalEntityManifestClaims;
  return {
    ...claims,
    ai: { ...claims.ai, declaredTools: uniqueStrings(claims.ai.declaredTools) },
    credentials: { publicCredentialReferences: uniqueStrings(claims.credentials.publicCredentialReferences) },
    declaredCapabilities: uniqueStrings(claims.declaredCapabilities),
  };
}

function claimsForValidation(manifest: OperationalEntityManifest | OperationalEntityManifestClaims): OperationalEntityManifestClaims {
  return Object.fromEntries(
    Object.entries(manifest).filter(([key]) => key !== "manifestDigest" && key !== "signature"),
  ) as OperationalEntityManifestClaims;
}

export function manifestSigningPayload(manifest: OperationalEntityManifest | OperationalEntityManifestClaims) {
  if (
    "signatureProfile" in manifest &&
    manifest.signatureProfile === "PUBLIC_MANIFEST_V1" &&
    manifest.signedPublicManifest &&
    typeof manifest.signedPublicManifest === "object" &&
    !Array.isArray(manifest.signedPublicManifest)
  ) {
    return Buffer.from(canonicalize(manifest.signedPublicManifest), "utf8");
  }
  return Buffer.from(canonicalize(claimsForDigest(manifest)), "utf8");
}

export function deriveManifestDigest(manifest: OperationalEntityManifest | OperationalEntityManifestClaims) {
  return sha256Hex(manifestSigningPayload(manifest));
}

export function assertManifestClaims(manifest: OperationalEntityManifestClaims, now = new Date().toISOString()) {
  if (Buffer.byteLength(canonicalize(manifest), "utf8") > NATIVE_MANIFEST_MAX_BYTES) throw new NativeVerificationError("The manifest exceeds the Phase 1 size limit.", "MANIFEST_TOO_LARGE", 413);
  if (manifest.manifestVersion !== "1.0") throw new NativeVerificationError("The manifest version is unsupported.", "MANIFEST_VERSION_UNSUPPORTED");
  reference(manifest.operationalEntityId, "WRONG_ENTITY");
  reference(manifest.enterpriseId, "WRONG_TENANT");
  reference(manifest.owner.accountableOwnerId, "OWNER_UNCONFIRMED");
  reference(manifest.owner.organizationId, "OWNER_UNCONFIRMED");
  reference(manifest.signingKeyId, "UNKNOWN_SIGNING_KEY");
  if (!allowedEntityTypes.has(manifest.entityType)) throw new NativeVerificationError("The Operational Entity type is unsupported.", "ENTITY_TYPE_UNSUPPORTED");
  if (!manifest.displayName.trim() || manifest.displayName.length > 240) throw new NativeVerificationError("The display name is invalid.", "MANIFEST_SCHEMA_INVALID");
  const issuedAt = timestamp(manifest.issuedAt, "MANIFEST_TIMESTAMP_INVALID");
  const expiresAt = timestamp(manifest.expiresAt, "MANIFEST_TIMESTAMP_INVALID");
  if (issuedAt > timestamp(now, "VERIFICATION_TIMESTAMP_INVALID") + NATIVE_MAX_CLOCK_SKEW_SECONDS * 1000) throw new NativeVerificationError("The manifest is not yet valid.", "MANIFEST_NOT_YET_VALID", 409);
  if (expiresAt <= issuedAt || expiresAt <= timestamp(now, "VERIFICATION_TIMESTAMP_INVALID")) throw new NativeVerificationError("The manifest is expired.", "MANIFEST_EXPIRED", 409);
  if (!/^[A-Za-z0-9_-]{22,256}$/.test(manifest.nonce)) throw new NativeVerificationError("The manifest nonce is invalid.", "MANIFEST_NONCE_INVALID");
  for (const digest of [manifest.software.buildDigest, manifest.software.sourceDigest, manifest.software.artifactDigest]) optionalDigest(digest, "SOFTWARE_DIGEST_INVALID");
  for (const capability of [...manifest.declaredCapabilities, ...manifest.ai.declaredTools]) if (!allowedCapabilities.test(capability)) throw new NativeVerificationError("A declared capability is invalid.", "CAPABILITY_MANIFEST_INVALID");
  if (manifest.declaredCapabilities.length > 128 || manifest.ai.declaredTools.length > 128) throw new NativeVerificationError("The capability manifest is too large.", "CAPABILITY_MANIFEST_INVALID");
  if (JSON.stringify(manifest.declaredCapabilities) !== JSON.stringify(uniqueStrings(manifest.declaredCapabilities))
    || JSON.stringify(manifest.ai.declaredTools) !== JSON.stringify(uniqueStrings(manifest.ai.declaredTools))
    || JSON.stringify(manifest.credentials.publicCredentialReferences) !== JSON.stringify(uniqueStrings(manifest.credentials.publicCredentialReferences))) {
    throw new NativeVerificationError("Manifest arrays must be unique and sorted in canonical order.", "MANIFEST_CANONICAL_FORM_REQUIRED");
  }
}

export function assertSupportedPublicJwk(value: JsonWebKey): asserts value is PublicJwk {
  const keyId = (value as JsonWebKey & { kid?: string }).kid;
  if (value.kty !== "OKP" || value.crv !== "Ed25519" || typeof value.x !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.x)) {
    throw new NativeVerificationError("Only Ed25519 public JWK credentials are supported in Phase 1.", "UNSUPPORTED_ALGORITHM");
  }
  if (typeof value.d === "string" || Object.prototype.hasOwnProperty.call(value, "d")) throw new NativeVerificationError("Private key material must never be registered.", "PRIVATE_CREDENTIAL_PROHIBITED");
  if (value.alg && value.alg !== "EdDSA") throw new NativeVerificationError("The JWK algorithm is not permitted.", "UNSUPPORTED_ALGORITHM");
  if (value.use && value.use !== "sig") throw new NativeVerificationError("The JWK use is not permitted.", "CREDENTIAL_USE_INVALID");
  if (value.key_ops && (value.key_ops.length !== 1 || value.key_ops[0] !== "verify")) throw new NativeVerificationError("The JWK must permit verification only.", "CREDENTIAL_USE_INVALID");
  if (keyId && !referencePattern.test(keyId)) throw new NativeVerificationError("The JWK key identifier is invalid.", "UNKNOWN_SIGNING_KEY");
}

export function credentialFingerprint(publicJwk: JsonWebKey) {
  assertSupportedPublicJwk(publicJwk);
  return hashCanonical({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x });
}

export function verifyDetachedEd25519(payload: Uint8Array, signature: string, publicJwk: JsonWebKey) {
  assertSupportedPublicJwk(publicJwk);
  let decoded: Buffer;
  try {
    if (!/^[A-Za-z0-9_-]{86}$/.test(signature)) return false;
    decoded = Buffer.from(signature, "base64url");
    if (decoded.length !== 64) return false;
    const nodeJwk = { crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x } as unknown as import("node:crypto").JsonWebKey;
    return verifySignature(null, payload, createPublicKey({ key: nodeJwk, format: "jwk" }), decoded);
  } catch {
    return false;
  }
}

export function verifySignedManifest(manifest: OperationalEntityManifest, credential: NativeCredential, now = new Date().toISOString()) {
  assertManifestClaims(claimsForValidation(manifest), now);
  if (credential.algorithm !== NATIVE_SIGNATURE_ALGORITHM) throw new NativeVerificationError("The credential algorithm is unsupported.", "UNSUPPORTED_ALGORITHM");
  if (manifest.enterpriseId !== credential.enterpriseId) throw new NativeVerificationError("The credential belongs to another tenant.", "WRONG_TENANT", 403);
  if (manifest.operationalEntityId !== credential.operationalEntityId) throw new NativeVerificationError("The credential belongs to another Operational Entity.", "WRONG_ENTITY", 403);
  if (manifest.signingKeyId !== credential.signingKeyId) throw new NativeVerificationError("The manifest signing key is unknown.", "UNKNOWN_SIGNING_KEY", 409);
  if (credential.publicJwk.kid && credential.publicJwk.kid !== credential.signingKeyId) throw new NativeVerificationError("The public JWK key identifier does not match the registered signing key.", "UNKNOWN_SIGNING_KEY", 409);
  if (!manifest.credentials.publicCredentialReferences.includes(credential.signingKeyId)) throw new NativeVerificationError("The manifest does not bind the registered signing credential.", "MANIFEST_CREDENTIAL_BINDING_MISSING", 409);
  const digest = deriveManifestDigest(manifest);
  if (!hashesEqual(digest, manifest.manifestDigest)) throw new NativeVerificationError("The manifest digest does not match its claims.", "MANIFEST_TAMPERED", 409);
  if (!verifyDetachedEd25519(manifestSigningPayload(manifest), manifest.signature, credential.publicJwk)) throw new NativeVerificationError("The manifest signature is invalid.", "INVALID_SIGNATURE", 409);
  return true;
}

export function issueNativeChallenge(input: {
  enterpriseId: string;
  operationalEntityId: string;
  audience: string;
  manifestDigest: string;
  signingKeyId: string;
  now?: string;
  ttlSeconds?: number;
}): NativeChallenge {
  reference(input.enterpriseId, "WRONG_TENANT");
  reference(input.operationalEntityId, "WRONG_ENTITY");
  reference(input.signingKeyId, "UNKNOWN_SIGNING_KEY");
  reference(input.audience, "WRONG_AUDIENCE");
  if (!digestPattern.test(input.manifestDigest)) throw new NativeVerificationError("The challenge manifest digest is invalid.", "MANIFEST_TAMPERED");
  const issuedAt = input.now ?? new Date().toISOString();
  const ttl = input.ttlSeconds ?? NATIVE_CHALLENGE_TTL_SECONDS;
  if (!Number.isInteger(ttl) || ttl < 30 || ttl > 600) throw new NativeVerificationError("The challenge lifetime is outside policy.", "CHALLENGE_TTL_INVALID");
  const nonce = randomBytes(32).toString("base64url");
  return {
    challengeId: randomUUID(),
    enterpriseId: input.enterpriseId,
    operationalEntityId: input.operationalEntityId,
    nonce,
    nonceHash: sha256Hex(nonce),
    audience: input.audience,
    issuer: "cyber-sentinels",
    subject: input.operationalEntityId,
    manifestDigest: input.manifestDigest,
    signingKeyId: input.signingKeyId,
    issuedAt,
    expiresAt: new Date(timestamp(issuedAt, "CHALLENGE_TIMESTAMP_INVALID") + ttl * 1000).toISOString(),
    status: "ISSUED",
  };
}

export function challengeSigningPayload(challenge: Pick<NativeChallenge, "challengeId" | "enterpriseId" | "operationalEntityId" | "nonce" | "audience" | "issuer" | "subject" | "manifestDigest" | "signingKeyId" | "issuedAt" | "expiresAt">) {
  return Buffer.from(canonicalize({
    challengeId: challenge.challengeId,
    enterpriseId: challenge.enterpriseId,
    operationalEntityId: challenge.operationalEntityId,
    nonce: challenge.nonce,
    audience: challenge.audience,
    issuer: challenge.issuer,
    subject: challenge.subject,
    manifestDigest: challenge.manifestDigest,
    signingKeyId: challenge.signingKeyId,
    // PostgreSQL/PostgREST may return the same instant with a +00:00 offset
    // instead of the Z form sent when the challenge was issued. Sign the
    // normalized instants so persistence cannot change the signed bytes.
    issuedAt: new Date(challenge.issuedAt).toISOString(),
    expiresAt: new Date(challenge.expiresAt).toISOString(),
  }), "utf8");
}

export function evaluateSoftwareProvenance(manifest: OperationalEntityManifest, observation: SoftwareObservation | null): SoftwareProvenanceState {
  const declared = [manifest.software.buildDigest, manifest.software.artifactDigest, manifest.software.sourceDigest].filter(Boolean) as string[];
  if (!declared.length) return "NOT_AVAILABLE";
  if (!observation) return "DECLARED_ONLY";
  const observed = [observation.buildDigest, observation.artifactDigest, observation.sourceDigest].filter(Boolean) as string[];
  if (!observed.length) return "DECLARED_ONLY";
  return declared.every((digest) => observed.includes(digest)) ? "VERIFIED_DIGEST" : "MISMATCH";
}

export function evaluateRuntimeBinding(manifest: OperationalEntityManifest, observation: RuntimeObservation | null, expectedCredentialFingerprint?: string): RuntimeBindingState {
  if (!observation) return "RUNTIME_UNVERIFIED";
  if (observation.manifestDigest && observation.manifestDigest !== manifest.manifestDigest) return "RUNTIME_CONFLICT";
  if (observation.credentialFingerprint && expectedCredentialFingerprint && observation.credentialFingerprint !== expectedCredentialFingerprint) return "RUNTIME_CONFLICT";
  const expected = manifest.runtime;
  const pairs: Array<[string | null, string | null]> = [
    [expected.runtimeType, observation.runtimeType],
    [expected.environment, observation.environment],
    [expected.region, observation.region],
    [expected.workloadIdentifier, observation.workloadIdentifier],
    [expected.deploymentIdentifier, observation.deploymentIdentifier],
    [expected.runtimeVersion, observation.runtimeVersion],
  ];
  const comparable = pairs.filter(([left, right]) => Boolean(left && right));
  if (!comparable.length) return "INSUFFICIENT_EVIDENCE";
  return comparable.some(([left, right]) => left !== right) ? "RUNTIME_CHANGED" : "RUNTIME_MATCH";
}

export function createContinuityFingerprint(input: ContinuityFingerprintInput): ContinuityFingerprint {
  const normalized = { ...input, version: CONTINUITY_FINGERPRINT_VERSION };
  return { ...normalized, fingerprint: hashCanonical(normalized) };
}

function setDifference(left: readonly string[], right: readonly string[]) {
  const other = new Set(right);
  return left.filter((item) => !other.has(item));
}

export function detectNativeEntityChanges(previous: ContinuityFingerprint | null, current: ContinuityFingerprint, priorManifest: OperationalEntityManifest | null, currentManifest: OperationalEntityManifest, credential: NativeCredential): NativeChangeType[] {
  if (!previous) return [];
  const changes: NativeChangeType[] = [];
  if (previous.credentialFingerprint !== current.credentialFingerprint) changes.push("SIGNING_KEY_CHANGED");
  if (previous.accountableOwnerId !== current.accountableOwnerId) changes.push("OWNER_CHANGED");
  if (previous.softwareDigest !== current.softwareDigest) changes.push("BUILD_CHANGED");
  if (previous.modelIdentifier !== current.modelIdentifier) changes.push("MODEL_CHANGED");
  if (previous.runtimeDigest !== current.runtimeDigest || previous.runtimeBinding !== current.runtimeBinding) changes.push("RUNTIME_CHANGED");
  if (previous.authorityReference !== current.authorityReference) changes.push("AUTHORITY_CHANGED");
  if (previous.manifestDigest !== current.manifestDigest) changes.push("MANIFEST_CHANGED");
  if (priorManifest) {
    const currentCapabilities = declaredCapabilityVocabulary(currentManifest);
    const priorCapabilities = declaredCapabilityVocabulary(priorManifest);
    if (setDifference(currentCapabilities, priorCapabilities).length) changes.push("CAPABILITY_EXPANDED");
    if (setDifference(priorCapabilities, currentCapabilities).length) changes.push("CAPABILITY_REDUCED");
  }
  if (credential.state === "REVOKED") changes.push("CREDENTIAL_REVOKED");
  if (credential.state === "EXPIRED") changes.push("CREDENTIAL_EXPIRED");
  return uniqueStrings(changes) as NativeChangeType[];
}

function failResult(input: {
  manifest: OperationalEntityManifest;
  credential: NativeCredential;
  now: string;
  reasonCode: string;
  status?: NativeVerificationStatus;
  runtimeBinding?: RuntimeBindingState;
  softwareProvenance?: SoftwareProvenanceState;
}): NativeVerificationResult {
  const continuityFingerprint = createContinuityFingerprint({
    enterpriseId: input.manifest.enterpriseId,
    operationalEntityId: input.manifest.operationalEntityId,
    credentialFingerprint: input.credential.credentialFingerprint,
    manifestDigest: input.manifest.manifestDigest,
    accountableOwnerId: input.manifest.owner.accountableOwnerId,
    softwareDigest: input.manifest.software.buildDigest ?? input.manifest.software.artifactDigest,
    runtimeBinding: input.runtimeBinding ?? "INSUFFICIENT_EVIDENCE",
    runtimeDigest: null,
    modelIdentifier: input.manifest.ai.modelIdentifier,
    capabilityDigest: hashCanonical(declaredCapabilityVocabulary(input.manifest)),
    authorityReference: input.manifest.authority.authorityReference,
  });
  return {
    verificationId: randomUUID(), operationalEntityId: input.manifest.operationalEntityId, status: input.status ?? "FAILED",
    verifiedClaims: [], unverifiedClaims: ["cryptographic_identity"], conflictingClaims: [], evidenceReferences: [],
    manifestDigest: input.manifest.manifestDigest, credentialFingerprint: input.credential.credentialFingerprint,
    continuityResult: "CONTINUITY_UNAVAILABLE", continuityFingerprint, changedAttributes: [],
    runtimeBinding: input.runtimeBinding ?? "INSUFFICIENT_EVIDENCE", softwareProvenance: input.softwareProvenance ?? "NOT_AVAILABLE",
    reasonCodes: [input.reasonCode], algorithmVersion: NATIVE_VERIFICATION_ALGORITHM_VERSION,
    verifiedAt: input.now, expiresAt: input.now, evidence: null,
  };
}

export function verifyNativeEntity(input: {
  expectedEnterpriseId: string;
  expectedOperationalEntityId: string;
  expectedAudience: string;
  entityLifecycleState: string;
  manifestState?: string;
  manifest: OperationalEntityManifest;
  priorManifest: OperationalEntityManifest | null;
  credential: NativeCredential;
  challenge: NativeChallenge;
  proof: NativeProofSubmission;
  ownerState: OwnerBindingState;
  runtimeObservation: RuntimeObservation | null;
  softwareObservation: SoftwareObservation | null;
  previousContinuityFingerprint: ContinuityFingerprint | null;
  now?: string;
}): NativeVerificationResult {
  const now = input.now ?? new Date().toISOString();
  const fail = (reasonCode: string, status?: NativeVerificationStatus) => failResult({ manifest: input.manifest, credential: input.credential, now, reasonCode, status });
  if (input.expectedEnterpriseId !== input.manifest.enterpriseId || input.proof.enterpriseId !== input.expectedEnterpriseId || input.challenge.enterpriseId !== input.expectedEnterpriseId) return fail("WRONG_TENANT");
  if (input.expectedOperationalEntityId !== input.manifest.operationalEntityId || input.proof.operationalEntityId !== input.expectedOperationalEntityId || input.challenge.operationalEntityId !== input.expectedOperationalEntityId) return fail("WRONG_ENTITY");
  if (input.challenge.issuer !== "cyber-sentinels" || input.challenge.subject !== input.expectedOperationalEntityId) return fail("WRONG_ENTITY");
  if (["revoked", "suspended", "retired", "expired"].includes(input.entityLifecycleState)) return fail("ENTITY_SUSPENDED");
  if (input.manifestState === "REVOKED") return fail("MANIFEST_REVOKED");
  if (input.manifestState === "SUPERSEDED") return fail("MANIFEST_SUPERSEDED");
  if (input.manifestState === "EXPIRED") return fail("MANIFEST_EXPIRED", "EXPIRED");
  if (input.manifestState && input.manifestState !== "ACTIVE") return fail("MANIFEST_NOT_ACTIVE");
  try { verifySignedManifest(input.manifest, input.credential, now); } catch (error) { return fail(error instanceof NativeVerificationError ? error.code : "INVALID_SIGNATURE"); }
  if (input.credential.state === "REVOKED") return fail("REVOKED_CREDENTIAL");
  if (input.credential.state === "RETIRED") return fail("RETIRED_CREDENTIAL");
  let verificationTime: number;
  try {
    verificationTime = timestamp(now, "VERIFICATION_TIMESTAMP_INVALID");
    if (input.credential.state === "EXPIRED" || (input.credential.expiresAt && timestamp(input.credential.expiresAt, "EXPIRED_CREDENTIAL") <= verificationTime)) return fail("EXPIRED_CREDENTIAL", "EXPIRED");
    if (timestamp(input.credential.validFrom, "CREDENTIAL_TIMESTAMP_INVALID") > verificationTime + NATIVE_MAX_CLOCK_SKEW_SECONDS * 1000) return fail("CREDENTIAL_NOT_YET_VALID");
  } catch (error) {
    return fail(error instanceof NativeVerificationError ? error.code : "CREDENTIAL_TIMESTAMP_INVALID");
  }
  if (!new Set<NativeCredentialState>(["ACTIVE", "PENDING"]).has(input.credential.state)) return fail("UNKNOWN_SIGNING_KEY");
  if (input.challenge.status !== "ISSUED") return fail("CHALLENGE_REPLAY");
  if (input.proof.challengeId !== input.challenge.challengeId) return fail("CHALLENGE_NOT_FOUND");
  let challengeIssuedAt: number;
  let challengeExpiresAt: number;
  let proofSubmittedAt: number;
  try {
    challengeIssuedAt = timestamp(input.challenge.issuedAt, "CHALLENGE_TIMESTAMP_INVALID");
    challengeExpiresAt = timestamp(input.challenge.expiresAt, "EXPIRED_CHALLENGE");
    proofSubmittedAt = timestamp(input.proof.submittedAt, "PROOF_TIMESTAMP_INVALID");
  } catch (error) {
    return fail(error instanceof NativeVerificationError ? error.code : "PROOF_TIMESTAMP_INVALID");
  }
  if (challengeIssuedAt > verificationTime + NATIVE_MAX_CLOCK_SKEW_SECONDS * 1000) return fail("CHALLENGE_NOT_YET_VALID");
  if (proofSubmittedAt < challengeIssuedAt - NATIVE_MAX_CLOCK_SKEW_SECONDS * 1000 || proofSubmittedAt > verificationTime + NATIVE_MAX_CLOCK_SKEW_SECONDS * 1000) return fail("PROOF_TIMESTAMP_INVALID");
  if (challengeExpiresAt <= verificationTime || proofSubmittedAt > challengeExpiresAt) return fail("EXPIRED_CHALLENGE", "EXPIRED");
  if (input.challenge.audience !== input.expectedAudience || input.proof.audience !== input.expectedAudience) return fail("WRONG_AUDIENCE");
  if (typeof input.proof.nonce !== "string" || !hashesEqual(sha256Hex(input.proof.nonce), input.challenge.nonceHash)) return fail("NONCE_MISMATCH");
  if (input.proof.manifestDigest !== input.manifest.manifestDigest || input.challenge.manifestDigest !== input.manifest.manifestDigest) return fail("MANIFEST_TAMPERED");
  if (input.proof.signingKeyId !== input.credential.signingKeyId || input.challenge.signingKeyId !== input.credential.signingKeyId) return fail("UNKNOWN_SIGNING_KEY");
  const signatureChallenge = { ...input.challenge, nonce: input.proof.nonce };
  if (!verifyDetachedEd25519(challengeSigningPayload(signatureChallenge), input.proof.signature, input.credential.publicJwk)) return fail("INVALID_SIGNATURE");

  const runtimeBinding = evaluateRuntimeBinding(input.manifest, input.runtimeObservation, input.credential.credentialFingerprint);
  const softwareProvenance = evaluateSoftwareProvenance(input.manifest, input.softwareObservation);
  const runtimeDigest = stableRuntimeDigest(input.runtimeObservation);
  const continuityFingerprint = createContinuityFingerprint({
    enterpriseId: input.expectedEnterpriseId,
    operationalEntityId: input.expectedOperationalEntityId,
    credentialFingerprint: input.credential.credentialFingerprint,
    manifestDigest: input.manifest.manifestDigest,
    accountableOwnerId: input.manifest.owner.accountableOwnerId,
    softwareDigest: input.manifest.software.buildDigest ?? input.manifest.software.artifactDigest,
    runtimeBinding,
    runtimeDigest,
    modelIdentifier: input.manifest.ai.modelIdentifier,
    capabilityDigest: hashCanonical(declaredCapabilityVocabulary(input.manifest)),
    authorityReference: input.manifest.authority.authorityReference,
  });
  const changedAttributes = detectNativeEntityChanges(input.previousContinuityFingerprint, continuityFingerprint, input.priorManifest, input.manifest, input.credential);
  const conflicts: string[] = [];
  const unverified: string[] = [];
  if (input.ownerState !== "CONFIRMED") (input.ownerState === "CONFLICTING" ? conflicts : unverified).push("accountable_owner");
  if (["RUNTIME_CHANGED", "RUNTIME_CONFLICT"].includes(runtimeBinding)) conflicts.push("runtime_binding");
  else if (runtimeBinding !== "RUNTIME_MATCH") unverified.push("runtime_binding");
  if (softwareProvenance === "MISMATCH") conflicts.push("software_provenance");
  else if (softwareProvenance !== "VERIFIED_DIGEST") unverified.push("software_provenance");
  const reasonCodes = ["NATIVE_SIGNATURE_VERIFIED", "MANIFEST_BINDING_VERIFIED", "CHALLENGE_SINGLE_USE_REQUIRED"];
  reasonCodes.push(input.manifest.authority.authorityReference ? "DECLARED_AUTHORITY_REFERENCE_RECORDED_NOT_VERIFIED" : "AUTHORITY_NOT_ASSERTED_BY_IDENTITY_PROOF");
  if (input.ownerState === "CONFIRMED") reasonCodes.push("OWNER_BINDING_CONFIRMED");
  else if (input.ownerState === "REVOKED") reasonCodes.push("OWNER_REVOKED");
  else if (input.ownerState === "EXPIRED") reasonCodes.push("OWNER_EXPIRED");
  else if (input.ownerState === "CONFLICTING") reasonCodes.push("OWNER_CONFLICTING");
  else reasonCodes.push("OWNER_UNCONFIRMED");
  if (runtimeBinding === "RUNTIME_MATCH") reasonCodes.push("RUNTIME_BINDING_VERIFIED"); else reasonCodes.push(runtimeBinding);
  reasonCodes.push(softwareProvenance === "MISMATCH" ? "BUILD_MISMATCH" : softwareProvenance);
  if (changedAttributes.length) reasonCodes.push(...changedAttributes);
  const status: NativeVerificationStatus = conflicts.length ? "REVIEW_REQUIRED" : unverified.length ? "PARTIALLY_VERIFIED" : "VERIFIED";
  const evidenceId = randomUUID();
  const evidenceBase = {
    evidenceId,
    evidenceType: "NATIVE_ENTITY_IDENTITY_PROOF" as const,
    operationalEntityId: input.expectedOperationalEntityId,
    enterpriseId: input.expectedEnterpriseId,
    manifestDigest: input.manifest.manifestDigest,
    credentialFingerprint: input.credential.credentialFingerprint,
    signingKeyId: input.credential.signingKeyId,
    challengeId: input.challenge.challengeId,
    verificationAlgorithm: NATIVE_SIGNATURE_ALGORITHM,
    verificationAlgorithmVersion: NATIVE_VERIFICATION_ALGORITHM_VERSION,
    verifiedAt: now,
    expiresAt: [input.manifest.expiresAt, input.credential.expiresAt].filter(Boolean).sort()[0] ?? input.manifest.expiresAt,
    reasonCodes: uniqueStrings(reasonCodes),
    provenance: NATIVE_EVIDENCE_PROVENANCE,
  };
  const evidence: NativeIdentityEvidence = { ...evidenceBase, evidenceDigest: hashCanonical(evidenceBase) };
  return {
    verificationId: randomUUID(), operationalEntityId: input.expectedOperationalEntityId, status,
    verifiedClaims: ["credential_possession", "manifest_binding", "entity_binding", "tenant_binding"],
    unverifiedClaims: uniqueStrings(unverified), conflictingClaims: uniqueStrings(conflicts), evidenceReferences: [`evidence:${evidenceId}`],
    manifestDigest: input.manifest.manifestDigest, credentialFingerprint: input.credential.credentialFingerprint,
    continuityResult: !input.previousContinuityFingerprint ? "CONTINUITY_ESTABLISHED" : changedAttributes.length ? "CONTINUITY_CHANGED" : "CONTINUITY_PRESERVED",
    continuityFingerprint, changedAttributes, runtimeBinding, softwareProvenance,
    reasonCodes: uniqueStrings(reasonCodes), algorithmVersion: NATIVE_VERIFICATION_ALGORITHM_VERSION,
    verifiedAt: now, expiresAt: evidence.expiresAt, evidence,
  };
}
