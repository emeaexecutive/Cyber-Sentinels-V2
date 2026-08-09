# Native Operational Entity Verification

## Purpose and boundary

Phase 1 generates first-party cryptographic identity evidence for an existing canonical Operational Entity. It is not another trust engine, entity registry, Evidence Graph, IAM system, authority model, or external-provider adapter.

The native engine proves a bounded statement: an entity possessed the private Ed25519 key corresponding to a registered public JWK when it signed a tenant-, entity-, audience-, manifest-, nonce-, and time-bound challenge. Cyber Sentinels never receives or stores the private key.

Native evidence has provenance `CYBER_SENTINELS_NATIVE`. It is not independent corroboration of Cyber Sentinels itself. Optional external, enterprise, runtime, and destination evidence retains its own provenance and enters the existing Evidence Independence and canonical decision algorithms.

## Reused canonical architecture

- `operational_entities` remains the canonical entity model and identifier boundary.
- `trust_contracts` and the existing Authority Lineage remain the authority source.
- `evidence_objects` and its triggers extend the existing Evidence Graph.
- `executeCanonicalTrustTransaction` remains the only `ALLOW / REVIEW / DENY` engine.
- Continuous Trust signals trigger reevaluation after verification and revocation.
- `trust_memory_index` receives only material, idempotent native events.
- `operational_entity_native_replay_events` preserves the attributable native-verification chronology that precedes or supplements a canonical transaction Replay.

## Agent Alpha canonical path

Agent Alpha is the existing `entity:alpha` Operational Entity defined by `AGENT_ALPHA_OPERATIONAL_ENTITY_ID` and resolved by `resolveCanonicalAgentAlpha` in `lib/operational-entities/operational-entity.ts`. Native qualification does not register or model another Alpha. Persisted Preview execution resolves the tenant's existing `Agent Alpha` row through `lib/operational-entities/server.ts`; the demo selects that row by its stored display reference and passes its actual entity ID, tenant UUID, accountable owner, trust-object reference, Authority Lineage reference, environment, evidence, Replay, and Trust Memory into the existing services.

The executable path is:

`operational_entities` → `operational_entity_native_credentials` → `operational_entity_manifests` → `operational_entity_native_challenges` → `native_entity_identity_evidence` / `evidence_objects` → `lib/trust-transaction/server.ts` → `executeCanonicalTrustTransaction` → canonical decision/execution/outcome → canonical Replay and Trust Memory.

The release-gate test `Agent Alpha native identity proof reaches canonical trust transaction` asserts that the same `operationalEntityId`, manifest digest, credential fingerprint, native evidence reference, owner, authority, graph reference, Replay reference, and Trust Memory reference survive this path.

## Supported subjects

The signed manifest supports `AI_AGENT`, `WORKLOAD`, `SERVICE`, `APPLICATION`, `MODEL_ENDPOINT`, `MACHINE`, and `DEVICE`. Each verification is tenant-bound and targets an existing `OperationalEntityId`; a provider-native identifier can never become that ID.

## Signed manifest

`manifestVersion = 1.0` covers the canonical entity and tenant, accountable owner and organization, declared software/model/runtime attributes, public credential references, declared tools/capabilities, authority reference, issuance/expiry, nonce, and signing-key ID. The digest is SHA-256 over JCS-canonicalized claims. An Ed25519 signature binds the claims to the registered public key.

Private credentials are prohibited. Manifest arrays must be unique and sorted before signing. Manifests are bounded to 64 KiB, versioned, historically retained, and cryptographically immutable. Registration locks the canonical entity and supersedes the prior active manifest atomically. A revoked, superseded, or expired manifest cannot complete an outstanding challenge.

## Credential and challenge protocol

Phase 1 supports only Ed25519 public JWK credentials (`OKP`, `crv=Ed25519`, `alg=EdDSA`, signature use, verification-only key operations). Unsupported algorithms, private `d` parameters, malformed keys, and deprecated or unapproved algorithm values fail closed.

The challenge contains a random 256-bit nonce, challenge ID, tenant, Operational Entity, audience, issuer, subject, manifest digest, signing-key ID, issuance time, and expiry. The audience is derived from the server's configured verification audience or request origin; a client cannot choose it. Only the nonce hash is persisted. The nonce is short-lived and single-use. Manifest, challenge, proof, and credential validity timestamps are checked against server time with a bounded 60-second clock-skew allowance.

Challenge consumption uses a tenant/entity-scoped `SELECT ... FOR UPDATE` transaction. Only an `ISSUED` challenge may transition to `VERIFIED`; concurrent or repeated consumption records `CHALLENGE_REPLAY` and cannot create a second evidence object. The successful verification, native evidence, Evidence Graph row, accepted runtime/software observations, Replay events, material Trust Memory, credential rotation, and audit record commit in the same database transaction.

## Deterministic evaluation

`native-entity-verification-v1` evaluates in this order:

1. Resolve tenant and canonical Operational Entity.
2. Validate entity lifecycle and the signed manifest schema, digest, and signature.
3. Resolve the public credential and validate its state, validity, and algorithm policy.
4. Validate challenge identity, tenant, entity, nonce hash, time, audience, manifest, and signing-key bindings.
5. Verify the Ed25519 proof signature.
6. Evaluate accountable-owner binding separately.
7. Compare the versioned continuity fingerprint.
8. Evaluate optional runtime evidence and software/build provenance.
9. Produce verified, unverified, and conflicting claims with exact reason codes.
10. Atomically consume the challenge, persist evidence, extend the Evidence Graph, append Replay/Trust Memory, and trigger canonical reevaluation.

A valid proof may be `PARTIALLY_VERIFIED` when owner, runtime, build, or authority claims remain unverified. Cryptographic identity never bypasses canonical authority or policy.

## Continuity and change detection

`entity-continuity-fingerprint-v1` hashes stable, permitted, tenant-scoped attributes: canonical entity ID, credential fingerprint, manifest digest, owner, build/runtime bindings, model, declared capability digest, and authority reference. It is reproducible and explainable; it is not invasive device fingerprinting.

Named changes include signing key, owner, build, model, runtime, capability expansion/reduction, authority, manifest, and credential expiry/revocation. Material changes append exactly-once Trust Memory records and trigger existing Trust Drift and Continuous Trust processing.

## Rotation and revocation

Rotation registers a new public credential as `PENDING`, references the active credential and accountable authorization, verifies a fresh manifest/challenge with the new key, then atomically activates the new key and retires the old key. Historical evidence remains attributable to the old fingerprint. Replay records rotation and reverification; Trust Memory records `SIGNING_KEY_ROTATED` once.

Credential, manifest, and owner-binding revocation invalidate associated current evidence and trigger Continuous Trust reevaluation. Existing entity suspension and Authority Lineage revocation continue to fail closed in the canonical transaction.

A retired signing credential produces `RETIRED_CREDENTIAL`; it cannot be reused after a successful rotation.

## Trust boundaries and limitations

- First-party native evidence is not independent corroboration of itself.
- Declared capability is not authority, and authority is not the attempted action.
- Build/source integrity is claimed only as `VERIFIED_DIGEST` when a real observation matches; otherwise it remains declared, unavailable, or mismatched. The browser demonstration intentionally supplies no build/source digest.
- Runtime binding is limited to supplied enterprise observations and is explicit when unavailable or conflicting.
- Phase 1 does not perform passport OCR, facial/voice biometrics, deepfake detection, document authenticity classification, or malicious-intent prediction.
- Preview database reconstruction and deployment qualification are required before public positioning or Production use.
