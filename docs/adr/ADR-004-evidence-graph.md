# ADR-004: Evidence Graph

## Status

Accepted.

## Context

Evidence, Replay, Trust Memory, governance, providers and validation are related but stored and rendered through different models. Flat lists make provenance, missing linkage and decision continuity difficult to inspect.

## Decision

Build a typed Evidence Graph from normalized source records. Nodes and relationships identify evidence, actors, sessions, decisions, reviews and validation results with tenant scope and source references. The graph is derived from evidence systems; it is not an independent truth authority or permission engine.

## Alternatives

- Keep independent lists: rejected because cross-system continuity remains implicit.
- Use an external graph database immediately: rejected because current scale and evidence do not justify a new persistence system.
- Let UI infer relationships: rejected because semantics would be duplicated and inconsistent.

## Consequences

- Relationship types and graph validation become versioned contracts.
- Missing linkage is reported rather than filled speculatively.
- Graph construction may be rebuilt from canonical records.
- Consumers gain consistent provenance and impact traversal.

## Security impact

Graph traversal can amplify data exposure. Every build and query must preserve tenant isolation, authorization and minimal attributes. A relationship cannot grant access that the source records do not permit.

## Future work

Add repository-backed graph queries, bounded traversal APIs, integrity evidence and performance baselines before considering specialized graph storage.
