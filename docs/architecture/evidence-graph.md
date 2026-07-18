# Evidence Graph

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose

Evidence Graph is the relationship projection that connects identities, actors, workflows, authority, execution, evidence, decisions and governance. It explains what supported a decision; it does not replace source records or infer missing verification.

The current implementation is built by `lib/evidence-graph/evidence-graph.ts` from application records. It is an in-memory, typed projection with integrity validation and query helpers, not a dedicated graph database.

## Current node model

Current node types are human, organization, AI agent, machine identity, credential, provider, workflow, authorization, execution, evidence, replay event, governance review, Trust Memory event, trust posture and decision.

This covers the blueprint's Users, Providers, Authorities, Organisations, AI Agents and Trust Decisions directly or by mapping. Devices and Sessions are currently represented through evidence, credential, execution or workflow context rather than dedicated node types. Dedicated device/session nodes are a target gap if their lifecycle must be queried independently.

## Relationship vocabulary

| Blueprint relationship | Current equivalent | Contract decision |
| --- | --- | --- |
| Verified By | `verified_by` | Direct mapping |
| Observed During | No exact type | Add versioned relationship or map explicitly to execution/workflow; do not overload silently |
| Created From | Closest is `generated` | Direction and semantics must be declared |
| Linked To | No generic type | Prefer a specific typed edge; introduce only when no stronger relation applies |
| Delegated By | `delegates` | Reverse traversal yields “delegated by”; direction must remain explicit |
| Authorised By | `authorizes` | Reverse traversal yields “authorised by” |
| Revoked By | No exact type | Target relationship required for authority/credential revocation |
| Correlated With | No exact type | Target symmetric relationship, with method and confidence metadata |

Other current relations are `owns`, `uses`, `initiated`, `reviewed`, `approved`, `blocked`, `restored`, `supports` and `executes`.

## Edge contract

Every edge should carry a stable ID, tenant, source references, creation time, direction, relationship version, confidence/method where inferred, and validity interval where the relation can expire. Observed and declared edges are distinct. Correlation is never equivalent to identity, causation or authorization.

## Responsibilities

### Relationship discovery

Build explicit edges from normalized source references and governed domain records. Automatic discovery may propose edges but must retain the rule, version and evidence that produced them.

### Evidence correlation

Relate evidence by workflow, session, correlation ID, subject, provider event, digest and bounded temporal proximity. Conflicts remain visible. Cross-provider verification means comparing independently attributed normalized signals; it does not convert agreement into certainty.

### Timeline generation

Traverse observed/replay edges in deterministic timestamp and ID order. Missing timestamps or links produce a gap state rather than an invented event.

### Historical analysis

Apply `valid_from`, `valid_to` and recorded-at semantics so a query can reconstruct what relationships were available at a decision time. Current graph construction uses current inputs and is not yet a fully persisted bitemporal graph.

## Current queries and validation

The implementation supports evidence coverage (`Verified`, `Pending`, `Missing`, `Expired`, `Contradictory`), trust explanation, authority explanation, evidence chain, workflow history, trust evolution and governance history. `validateEvidenceGraphContinuity` checks graph integrity across the supplied projection.

## Trust pipeline role

```text
Normalized evidence -> immutable source record -> graph node/edge projection
                                             -> Replay chronology
                                             -> Trust Memory references
                                             -> decision explanation
```

Graph construction must precede any decision input that claims graph coverage. A graph query failure is not evidence absence; it is an unavailable dependency and must be surfaced separately.

## Scaling and migration

Keep the typed application model as the contract while query volume remains bounded. Before introducing a graph datastore, measure traversal latency, cardinality and consistency needs; define a transactional outbox or rebuildable projection; prove tenant isolation; and retain PostgreSQL source records as authoritative. A new database must not become a second source of truth.

## Current gaps

- Device and session are not dedicated current node types.
- Four requested relationship names have no exact current equivalent.
- Graph persistence and bitemporal snapshots are not universal.
- Cross-provider comparison exists through normalized signals/consensus context, not a standalone graph verification engine.
- Graph references in some evidence packs can remain `not recorded`; absence must stay explicit.
