# Trust Memory

Baseline commit: `77588a5`

Architecture review date: 2026-07-18; EPIC 18 extension: 2026-07-21

## Definition

Trust Memory is accumulated, attributable operational history used to explain how confidence and governance posture changed over time.

Trust Memory is **not identity**. It does not establish who an actor is.

Trust Memory is **not a session**. A session is one bounded interaction; Trust Memory links reviewed events across time.

Trust Memory is historical operational confidence, not a permanent reputation score or autonomous learning system.

## Original model

`lib/trust-memory/trust-memory.ts` models events for humans, AI agents, machine identities and workflows. Event kinds cover identity, runtime, provider and session change; trust gain, decay and recovery; policy, credential and authority change; conflict; governance decisions; reviewer overrides; reviewed false-positive/false-negative outcomes; and retention tombstones.

Events can carry trust before/after/delta, evidence/replay/governance/provider/policy/authority references, reviewed outcome, purpose, action, environment, confidence, explanation, ownership and retention context. Snapshot helpers summarize a supplied event history.

## Required contents

| Blueprint content | Representation and boundary |
| --- | --- |
| Previous verifications | Identity/provider/session history and Evidence Object references |
| Behaviour consistency | Runtime changes and reviewed outcomes; not a universal behavioral profile |
| Historical devices | Explicit Device-domain subjects/evidence where registered |
| Historical sessions | Session, workflow, Trust Event and Replay references |
| Authority history | Authority, delegation, credential and policy events |
| Provider history | Provider health and observation references |
| Evidence quality | Evidence result, assurance, verification, freshness and limitations |
| Incident history | Conflict, governance and runtime events where supplied |
| Trust decay | Explicit expiry/decay events and freshness posture |
| Recovery history | New evidence and governed recovery decisions |

## Event and snapshot contract

Every event requires an immutable event ID, tenant, subject/actor type and ID, event kind, recorded and effective times, cause, before/after state, calculation version, source references and limitations. A snapshot requires a stable version/watermark, ordered event IDs, calculation version, created time and integrity result.

EPIC 18 adds `trust_memory_index`, a tenant-scoped chronological index over immutable state decisions and their source IDs. It is a projection, not a second audit source. State transitions populate it atomically with the decision and Canonical Trust Event.

## Rules

### Append-only history

New information creates a new event. Corrections, reviewer overrides, decay, restoration and revocation reference the earlier state; they do not rewrite it. `validateTrustMemoryIntegrity` detects chronology, duplicate IDs, tenant and linkage problems without repairing history.

The EPIC 18 index and its source decisions are append-only. This repository rule does not by itself prove that the migration is deployed.

### Historical snapshots

Snapshots are derived, versioned projections and can be rebuilt from retained events. A decision records the exact Evidence Object snapshot and policy version it used. A later calculation may change posture but cannot change the prior decision's recorded inputs.

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

- deterministic ordering by effective/recorded time and ID;
- tenant and subject isolation;
- evidence, Replay, governance and policy reference validation;
- Decision Contract input and snapshot hashes;
- conflict and missing-reference states; and
- audit of every privileged mutation/export path.

## EPIC 18 Replay boundary

Historical Replay loads the decision, Evidence Objects/provider observations, provider health, policy versions and consent receipts as of the decision time. Policy, outage, evidence-exclusion, state, consent and authority simulations create separate reproducible hashes. Simulations report `mutatesProduction=false` and cannot update current state or write themselves as real Trust Memory.

## Remaining operational gaps

- The forward migration and durable index have not been applied or verified in Production.
- Complete device, session and authority histories depend on their source domains registering explicit evidence.
- Privacy disposition/legal-hold procedures require deployed operational verification.
- Live Replay completeness KPIs remain `INSUFFICIENT_DATA` until measured snapshots exist.
