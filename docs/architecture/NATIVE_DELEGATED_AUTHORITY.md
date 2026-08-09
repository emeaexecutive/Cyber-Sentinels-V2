# Native Delegated Authority

This capability extends the canonical Operational Entity, Trust Contract/Authority Lineage, Trust Transaction, Evidence Graph, Replay and Trust Memory implementations. It creates no second identity registry, authority graph, trust engine, replay ledger or memory store.

## Identity and authority stay separate

Agent Alpha and Agent Beta each register a different Ed25519 public credential, bind it to a different signed manifest and runtime identity, answer a server-issued single-use challenge, and produce independent `NATIVE_ENTITY_IDENTITY_PROOF` evidence. Private keys remain with their agents. A verified Beta identity is a prerequisite for accepting delegated authority; it is never treated as authority itself.

Revoking or expiring Alpha's parent authority or the Alpha-to-Beta delegation makes Beta's next action fail closed. Beta's native identity evidence remains intact. Historical decision-time snapshots and transactions are immutable.

## Delegation lifecycle

1. An enterprise owner/admin submits an Alpha-signed canonical delegation to the authenticated tenant-scoped API.
2. The service resolves Alpha's current native identity and parent Trust Contract, Beta's current native identity/owner/runtime, and the exact policy version.
3. `delegated-authority-subset-v1` verifies that actions, tools, targets, environments, data boundary, monetary/execution limits, time and depth only narrow.
4. Policy returns `ACTIVATE`, `REVIEW` or `REJECT`. A valid Alpha signature alone cannot activate authority.
5. Beta signs an acceptance bound to the delegation ID/digest and Beta's current credential fingerprint and manifest digest. Atomic acceptance locks the delegation and rechecks current native evidence.
6. Exact actions traverse `lib/core/authority-graph.ts`, then feed the existing canonical Trust Transaction. `ALLOW` is possible only after a transaction-safe database gate locks and rechecks the delegation and parent Trust Contract. Non-ALLOW never requests execution.
7. Evidence Graph edges, native Replay events and material Trust Memory events cite the same delegation and authority lineage.

## Cryptographic payloads

Alpha signs the delegation ID, delegator, delegate, parent authority, parent delegation (when any), canonical scope digest, policy/authority versions, issue/expiry time and nonce using its registered Ed25519 key. The full immutable record has a SHA-256 canonical digest. Any post-signing action, target, tool, environment, limit, expiry or recipient change yields `DELEGATION_DIGEST_MISMATCH` or `INVALID_SIGNATURE`.

Beta signs its acceptance ID, tenant, delegation ID/digest, Beta entity ID, credential fingerprint, manifest digest, signing-key ID, acceptance time and nonce with Beta's distinct key. Duplicate acceptance is rejected by a tenant/delegation uniqueness constraint and serialized RPC.

## Bounded chains and cascade

Redelegation defaults to false. A child delegation may exist only when the parent explicitly permits it, its scope and expiry shrink, its depth is within every ancestor's ceiling, and its independently verified recipient accepts. Ancestor entity IDs are checked for cycles. The blast-radius projection follows explicit parent edges and classifies direct, dependent, potential and unaffected records; it does not infer relationships.

Parent revocation invalidates dependent delegation use without rewriting historical records. The cascade is represented through Authority Lineage and the canonical Evidence Graph, and material `PARENT_AUTHORITY_REVOKED` / `DELEGATION_REVOKED` events enter Trust Memory.

## Persistence and concurrency

Migration `202608090001_native_delegated_authority.sql` adds signed authority-lineage edge, acceptance and action-evaluation records. Signed fields are immutable; state transition fields are narrowly mutable. RLS permits tenant-member reads, while mutation is service-only after authenticated role checks.

`persist_delegated_action_evaluation_v1` locks the delegation and parent Trust Contract in one database transaction. If either is expired or revoked, a supplied application ALLOW is downgraded to DENY before persistence. This is the canonical concurrent revocation/action boundary.

## API and UI

`/api/operational-entities/[entityId]/delegated-authority` supports create, review, accept, retrieve, revoke, lineage retrieval, blast radius and exact-action evaluation. Tenant, authenticated user, role and path entity are server-derived; client tenant/delegator/reviewer claims cannot override them.

Operational Entity detail shows authority delegated and received, exact scope, target, expiry, policy, evidence and the “WHY CAN BETA DO THIS?” chain. `/demo/trust-runtime` projects persisted Alpha/Beta identity, delegation, allow/deny and parent-revocation outcomes. It does not fabricate a healthy demo state.

## Qualification and claim boundary

Tests use real generated Ed25519 key pairs for Alpha and Beta and cover the happy path, fake Beta, wrong keys/tenant, tampering, expiry/revocation, every scope dimension, bounded redelegation, depth, cycles, duplicate acceptance and concurrent revocation. `WORKING` means the implementation and local/Preview qualification execute. It does not mean Production-proven, deployed to Production or externally enforced by a configured destination.
