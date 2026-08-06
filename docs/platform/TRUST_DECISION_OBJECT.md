# Canonical Trust Decision Object

## Purpose

The Epic 38 `CanonicalTrustDecision` is the single serialization contract for explaining an operational trust decision. It composes pointers to canonical systems and preserves decision-time snapshots; it is not another decision engine or history store.

## Preserved fields

The version 1.0 object preserves:

- decision ID, type, time, owner, and enterprise;
- authority, policy, and evidence snapshots with capture time, version, and SHA-256 hash;
- trust state before and at the decision;
- Trust Object, Enterprise Decision History, Trust Journey, Replay, Trust Memory, Evidence Graph, and Authority Lineage references;
- business and operational context;
- AI, provider, and human-review participation;
- confidence classification, supporting evidence, and known unknowns;
- structured explanation, citation-bearing narrative, and outcome;
- recovery and supersession references; and
- chronological decision evolution.

## Integrity and identity

When an upstream decision ID is not supplied, the builder derives a deterministic UUID from the enterprise, decision time, decision type, owner, workflow, and evidence snapshot. The serialized object uses JCS canonicalization and SHA-256. Validation recomputes the content hash, so a changed decision cannot be presented as the originally preserved object.

## References, not replicas

Snapshot fields preserve the identifier, version, capture time, and content digest of canonical source material. Reference fields preserve the owning system and identifier. Neither form copies the underlying Replay timeline, Evidence Graph, Trust Memory, Authority Lineage, or Trust Journey into this layer.

## Allowed decision types

Allow, Review, Deny, Escalate, Suspend, Restore, Expire, Delegate, Revoke, Approve, Reject, and Observe are represented as uppercase canonical values.

## Failure behavior

Construction or validation fails on duplicate evidence IDs, invalid UUIDs or timestamps, mismatched snapshots, unresolved evidence citations, non-chronological evolution, authoritative provider/AI participation, unsupported AI actions, or integrity mismatch.
