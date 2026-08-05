# Enterprise Trust Learning architecture audit

Audit date: 2026-08-05. Enterprise Trust Learning is a derived intelligence capability above the existing Enterprise Trust Fabric. It does not create a new source-of-truth store.

| Capability | Existing system | Canonical | Reusable | Gap | Duplicate risk | Required change |
| --- | --- | --- | --- | --- | --- | --- |
| Trust Objects | Enterprise Trust Fabric projection | Current-state projection over canonical subjects/decisions | Yes | No learning projection | High | Reference object IDs; do not copy object truth |
| Trust Fabric | `src/lib/trust-fabric` and Epic 28 migration | Composition layer; owning systems remain canonical | Yes | No recurrence service | High | Add a derived pattern engine above it |
| Trust Continuity | lifecycle and scope-continuity services | Existing decision/evidence records | Yes | No recurrence comparison | Medium | Consume references only |
| Trust Memory | `lib/trust-memory` and architecture index | Canonical historical index | Yes | No pattern versions | High | Link memory references; do not create another memory |
| Replay | core Replay services and routes | Canonical chronology | Yes | Learning replay link absent | High | Preserve Replay references in patterns and demos |
| Evidence Graph | existing graph nodes/edges | Canonical evidence relationships | Yes | Learning citation validation absent | High | Validate citations against retrieved source bundle |
| Authority Lineage | authority graph and canonical event authority IDs | Existing authority chain/events | Yes | Recurrent authority rules absent | High | Detect derived authority patterns only |
| Enterprise Decision History | state and Fabric decisions | Canonical decisions | Yes | Historical comparison absent | High | Reference decisions; never rewrite them |
| Trust Intelligence | existing rules and API | Deterministic decision services | Yes | Provider-neutral draft interface absent | Medium | Add non-authoritative adapter boundary |
| Incident evidence | serious-incident service and tables | Incident-owned evidence | Yes | Pattern link absent | Medium | Preserve incident references |
| Reviewer outcomes | governance and review records | Owning review system | Partial | Learning feedback labels absent | Medium | Add immutable derived-output feedback |
| Corrective actions | incident corrective-action records | Incident-owned | Yes | Recovery recurrence absent | Medium | Detect source-linked success/failure patterns |
| Business outcomes | Fabric contracts and incident outcomes | Owning workflow records | Partial | Coverage is incomplete | Medium | Mark unconfirmed outcomes explicitly |
| Economic authority | Fabric authority/contract evidence | Existing authority and contract records | Partial | No learning dimension | Medium | Derive references only when evidence exists |
| Embeddings/vector support | No approved canonical vector store found | No | No | Semantic retrieval not configured | High | Keep adapter optional; do not introduce a store in this Epic |
| AI provider abstractions | Existing AI provider policy/OpenAI helper | Provider boundary exists but is not a learning authority | Partial | Grounding envelope absent | Medium | Add provider-neutral `TrustIntelligenceModelAdapter` |
| Redaction/data minimisation | Evidence Vault boundary and provider policy | Existing storage boundary | Yes | Learning-specific redaction absent | Medium | Redact before adapter calls and persist no raw prompts |

The reuse decision is final for this Epic: canonical history stays in its owning systems; `enterprise_trust_patterns` and related tables are derived, correctable projections with immutable versions.
