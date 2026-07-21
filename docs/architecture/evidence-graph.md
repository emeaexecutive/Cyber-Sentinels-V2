# Evidence Graph

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose

Evidence Graph is the relationship projection that connects identities, actors, workflows, authority, execution, evidence, decisions and governance. It explains what supported a decision; it does not replace source records or infer missing verification.

The original implementation is built by `lib/evidence-graph/evidence-graph.ts` from application records. It is an in-memory, typed projection with integrity validation and query helpers, not a dedicated graph database.

## Current node model

Current node types are human, organization, AI agent, machine identity, credential, provider, workflow, authorization, execution, evidence, replay event, governance review, Trust Memory event, trust posture and decision.

This covers the blueprint's Users, Providers, Authorities, Organisations, AI Agents and Trust Decisions directly or by mapping. Devices and Sessions are represented through evidence, credential, execution or workflow context unless their lifecycle is independently registered.

## Relationship vocabulary

| Blueprint relationship | Original equivalent | EPIC 18 contract |
| --- | --- | --- |
| Verified By | `verified_by` | `OBSERVED_BY` / `SUPPORTED`, with evidence lineage |
| Observed During | No exact type | `PARTICIPATED_IN` with workflow/session node |
| Created From | Closest is `generated` | `DERIVED_FROM` |
| Linked To | No generic type | Prefer a specific allowlisted edge |
| Delegated By | `delegates` | `AUTHORIZED_BY` with explicit direction |
| Authorised By | `authorizes` | `AUTHORIZED_BY` |
| Revoked By | No exact type | `REVOKES` |
| Correlated With | No exact type | `CONFLICTS_WITH` only for explicit contradictions; correlation never implies identity |

The EPIC 18 edge vocabulary is `ASSERTS`, `DERIVED_FROM`, `OBSERVED_BY`, `AUTHORIZED_BY`, `PARTICIPATED_IN`, `APPLIES_TO`, `SUPERSEDES`, `REVOKES`, `CONFLICTS_WITH`, `SUPPORTED`, `CHALLENGED`, and `RESULTED_IN`.

## Edge contract

Every edge carries a stable ID, tenant, source and target node, allowlisted type, creation time and optional Evidence Object. Composite `(enterprise_id, node_id)` foreign keys prohibit orphan and cross-tenant edges. Correlation is never equivalent to identity, causation or authorization.

## Responsibilities

### Relationship discovery

Build explicit edges from normalized source references and governed domain records. Automatic discovery may propose edges but must retain the rule, version and evidence that produced them.

### Evidence correlation

Relate evidence by workflow, session, correlation ID, subject, provider event, digest and bounded temporal proximity. Conflicts remain visible. Cross-provider verification means comparing independently attributed normalized signals; it does not convert agreement into certainty.

### Timeline generation

Traverse observed/replay edges in deterministic timestamp and ID order. Missing timestamps or links produce a gap state rather than an invented event.

### Historical analysis

Apply validity and recorded-at semantics so a query can reconstruct what relationships were available at decision time. Immutable relational nodes/edges are the durable EPIC 18 projection; PostgreSQL source records remain authoritative.

## Trust pipeline role

```text
Normalized evidence -> immutable source record -> graph node/edge projection
                                             -> Replay chronology
                                             -> Trust Memory references
                                             -> decision explanation
```

Graph construction must precede any decision input that claims graph coverage. A graph query failure is not evidence absence; it is an unavailable dependency and must be surfaced separately.

## EPIC 18 relational implementation

`evidence_graph_nodes` and `evidence_graph_edges` provide tenant-scoped persistence without requiring a graph database. New Evidence Objects create subject/evidence nodes and `ASSERTS` edges. State decisions create decision nodes and `RESULTED_IN` edges. Existing Evidence Objects are backfilled fail-closed.

Traversal is bounded to depth 3 and 500 items. The first API exposes depth one with a 200-item default. UI shaping removes raw payload, credential, token, biometric, document and direct-contact metadata.

## Scaling and migration

Keep the typed application model as the contract while query volume remains bounded. Before introducing a graph datastore, measure traversal latency, cardinality and consistency needs; define a transactional outbox or rebuildable projection; prove tenant isolation; and retain PostgreSQL source records as authoritative. A new database must not become a second source of truth.

## Remaining operational gaps

- The forward migration has not been applied or measured on a Production-sized database.
- Depth-two/three service traversal is contracted but the initial API intentionally exposes depth one.
- Dedicated device/session nodes depend on their source systems registering explicit subjects.
- Deployed RLS and cross-tenant traversal probes remain a Production change-window gate.
