# Trust Memory

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Definition

Trust Memory is accumulated, attributable operational history used to explain how confidence and governance posture changed over time.

Trust Memory is **not identity**. It does not establish who an actor is.

Trust Memory is **not a session**. A session is one bounded interaction; Trust Memory links reviewed events across time.

Trust Memory is historical operational confidence, not a permanent reputation score or autonomous learning system.

## Current model

`lib/trust-memory/trust-memory.ts` models events for humans, AI agents, machine identities and workflows. Event kinds cover identity, runtime, provider and session change; trust gain, decay and recovery; policy, credential and authority change; conflict; governance decisions; reviewer overrides; reviewed false-positive/false-negative outcomes; and retention tombstones.

Events can carry trust before/after/delta, evidence/replay/governance/provider/policy/authority references, reviewed outcome, purpose, action, environment, confidence, explanation, ownership and retention context. Snapshot helpers summarize an supplied event history. This is an application model/projection; no dedicated universal `trust_memory` event table was identified.

## Required contents

| Blueprint content | Current representation and boundary |
| --- | --- |
| Previous verifications | Identity/provider/session event history and evidence references |
| Behaviour consistency | Runtime behavior change and reviewed outcomes; not a universal behavioral profile |
| Historical devices | May be referenced through evidence/metadata; no dedicated complete device history |
| Historical sessions | Session-change and workflow/replay references |
| Authority history | Authority, delegation, credential and policy events |
| Provider history | Provider-change events and provider references |
| Evidence quality | Evidence sources, confidence and limitations |
| Incident history | Conflict/governance/runtime events where supplied |
| Trust decay | Explicit decay events and algorithm freshness posture |
| Recovery history | Recovery and governance-restore events |

## Event and snapshot contract

Every event requires an immutable event ID, tenant, subject/actor type and ID, event kind, recorded and effective times, cause, before/after state, calculation version, source references and limitations. A snapshot requires a stable version/watermark, ordered event IDs, calculation version, created time and integrity result.

Current event types carry rich provenance, but a stable persisted snapshot/version reference is not yet guaranteed for every decision. That prevents complete version-pinned replay.

## Rules

### Append-only history

New information creates a new event. Corrections, reviewer overrides, decay, restoration and revocation reference the earlier state; they do not rewrite it. `validateTrustMemoryIntegrity` detects chronology, duplicate IDs, tenant and linkage problems without repairing history.

Migration source prevents update/delete on `trust_timeline_events`, which can carry Trust Memory context. This does not prove that every contributing source is immutable or that the migration is deployed.

### Historical snapshots

Snapshots are derived, versioned projections and can be rebuilt from retained events. A decision records the exact snapshot watermark it used. A later calculation may change posture but cannot change the prior decision's recorded inputs.

### Retention and privacy

“Never delete historical trust” means never silently edit a retained operational record. It does not override privacy law, contractual retention or data-minimization obligations. When disposition is required, append a retention tombstone, delete or irreversibly de-identify prohibited personal/source data, preserve only the permitted audit fact, and make later replay explicitly incomplete where necessary.

## Decision use

Trust Memory supplies prior reviewed context and freshness/decay signals. It must not:

- turn historical correlation into identity certainty;
- create a universal cross-customer reputation;
- penalize an actor for an unresolved allegation as if it were a reviewed outcome;
- cross tenant boundaries; or
- override current policy, authority or manual governance.

## Integrity controls

- deterministic event ordering by effective/recorded time and ID;
- tenant and subject isolation;
- evidence, replay, governance and policy reference validation;
- calculation-version and snapshot-watermark recording;
- conflict and missing-reference states; and
- audit of every privileged read/export.

## Current gaps

- No single dedicated durable Trust Memory store/snapshot registry is universal.
- Complete device and session histories depend on supplied records.
- Current decisions do not consistently pin a Trust Memory snapshot version.
- Append-only enforcement is strongest on timeline events, not all upstream sources.
- Durable privacy disposition, legal hold and cross-version reconstruction require deployed verification.
