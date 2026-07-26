# Enterprise Trust Graph

## Purpose

The Enterprise Trust Graph is the versioned topology core for humans, organisations, AI agents, devices, identities, communication identifiers, documents, workflows, policies, evidence, providers, and their relationships.

It extends the EPIC 20 Trust Intelligence architecture. It does not replace canonical evidence, authentication, RLS, provider adapters, the Trust State Engine, Replay, or Trust DNA.

## Architecture

```mermaid
flowchart LR
  A[Authenticated enterprise API] --> S[TrustGraphService]
  S --> R[TrustGraphRepository]
  R --> M[mutate_trust_graph_v1]
  M --> E[trust_entities]
  M --> V[trust_evidence]
  M --> L[trust_relationships]
  M --> P[trust_sources]
  M --> X[trust_graph_events]
  E --> Q[Reusable graph queries]
  V --> Q
  L --> Q
  P --> Q
  Q --> A
```

Mutations are authenticated with existing enterprise membership, restricted by role, protected by same-origin/content controls, executed through one service-role database function, and committed with an immutable event in the same transaction.

## Entity model

```mermaid
erDiagram
  TRUST_ENTITIES ||--o{ TRUST_EVIDENCE : receives
  TRUST_ENTITIES ||--o{ TRUST_RELATIONSHIPS : source
  TRUST_ENTITIES ||--o{ TRUST_RELATIONSHIPS : target
  TRUST_ENTITIES ||--o{ TRUST_GRAPH_EVENTS : explains
  TRUST_SOURCES ||--o{ TRUST_EVIDENCE : normalizes
  EVIDENCE_NODES ||--o| TRUST_EVIDENCE : may_project

  TRUST_ENTITIES {
    uuid id
    uuid tenant_id
    text entity_type
    text entity_name
    text status
    jsonb metadata
    integer version
  }
  TRUST_EVIDENCE {
    uuid id
    uuid tenant_id
    uuid entity_id
    text provider
    text evidence_type
    numeric confidence
    integer version
  }
  TRUST_RELATIONSHIPS {
    uuid id
    uuid tenant_id
    uuid source_entity
    uuid target_entity
    text relationship_type
    numeric confidence
    integer version
  }
```

## Versioning and history

- Entities begin at version 1.
- Entity updates require `expectedVersion`; stale writes fail with a conflict.
- Entity deletion writes a `DELETED` tombstone. Active relationships must be removed first.
- Relationships are removed by setting `removed_at` and incrementing their version.
- Evidence and graph events are append-only.
- Provider health updates are version checked.
- Every mutation writes `TrustEvent` with actor, resource, version, timestamp, metadata, and correlation ID.

## Tenant isolation

Every table includes `tenant_id`. Composite tenant foreign keys bind evidence and both relationship endpoints to the same tenant. RLS policies use `user_can_access_trust_workspace(tenant_id)`. Anonymous access and authenticated writes are revoked.

The service filters repository results by tenant again before returning graph data. Shared email and device queries accept SHA-256 match keys only; raw identifiers are not query keys.

## Performance

Neighbour lookup uses two bounded queries: one relationship query and one `IN` entity query. Timeline event/evidence reads run in parallel. Summary, statistics, and orphan queries execute as aggregate database functions. API limits are bounded to 500.

Indexes cover tenant/type/status entities, entity/provider evidence, hashed match keys, both relationship directions, provider health, entity events, resources, and correlations.

The local performance test returns a 500-neighbour graph with a single repository neighbour call and a one-second ceiling. This is a process-local architectural guard, not a production SLA.

## Extension points

- New entity types require a domain type, database constraint migration, and tests.
- New relationship types use the uppercase versioned relationship vocabulary.
- Provider adapters normalize through `TrustProvider` and `providerResultToTrustEvidence`.
- Additional graph queries belong in `TrustGraphQueries`, not route-local data access.
- Future streaming consumers can subscribe to `trust_graph_events` through an audited outbox without changing graph mutation semantics.
