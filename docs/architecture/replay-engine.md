# Replay Engine

Baseline commit: `77588a5`

Architecture review date: 2026-07-18

## Purpose

Replay reconstructs the evidence, chronology, actors, governance and decision context available for a workflow. The permanent target is deterministic re-evaluation of any trust decision exactly as originally evaluated.

The current implementation spans `lib/core/replay-engine.ts`, `lib/trust-replay/replay.ts` and `lib/replay/replay-writer.ts`. It creates operational snapshots and append-only timeline events. It does **not yet prove exact computational replay** because complete historical policy, configuration, provider-result, risk-model and Trust Memory versions are not pinned in every replay record.

## Replay manifest target

An exact replay begins from an immutable manifest containing:

| Input | Required reference |
| --- | --- |
| Evidence | Ordered immutable evidence IDs, digests, schema and mapping versions |
| Policies | Policy ID, version, evaluated rules and compiled artifact hash |
| Configuration | Versioned decision thresholds, feature flags and provider-selection policy |
| Provider results | Normalized evidence IDs, provider/mapping version and source digest |
| Risk model | ORI feature, model, dataset, threshold and normalization versions |
| Trust Memory | Snapshot/event-watermark version and integrity result |
| Decision engine | Algorithm/tuning version, input envelope and runtime version |
| Authority | Actor, delegation and policy references valid at evaluation time |

Secrets and raw biometric/identity payloads are not copied into the manifest. Protected source references and digests are used according to retention policy.

## Current snapshot

`ReplaySnapshot` currently gathers evidence, signals, decisions, audit logs, relationships, AI summaries, timeline events, posture and canonical memory. Records are filtered to an `asOf` time and sorted deterministically by creation time then ID. The result supports chronology, evidence sequence, accountable actors, outcome and transparency reporting.

The replay writer batches inserts to `trust_timeline_events`, records replay latency and publishes the replay-created event after persistence succeeds. Queue failure/retry diagnostics are process-local and reset on process restart; there is no proven durable retry worker.

## Supported use cases

| Mode | Intended purpose | Current support |
| --- | --- | --- |
| Historical replay | Reconstruct state and chronology as of a timestamp | Partial: as-of filtering exists; full version-pinned re-execution does not |
| Audit replay | Show evidence, actors, policy/governance context and outcome | Supported as a report/snapshot, subject to missing records |
| Debug replay | Compare captured inputs with current execution | Partial: no formal mode or guaranteed complete input manifest |
| Forensic replay | Preserve and examine integrity, conflicts and chain of custody | Partial: evidence/timeline context exists; legal hold and full chain guarantees require deployment controls |

These are target mode names. The current API does not expose a dedicated mode enum.

## Required output

- deterministic timeline;
- ordered evidence sequence with digest and source attribution;
- policy evaluation trace;
- ORI/risk score and all model versions, or explicit `not evaluated`;
- authoritative decision and explanation;
- reviewer/manual override and authority context;
- integrity status and missing-reference list; and
- replay run ID, original decision ID and comparison result.

## Determinism rules

1. Resolve every input by immutable ID/version, never “latest”.
2. Use the original clock value and deterministic ordering.
3. Isolate provider I/O; replay reads captured normalized results and never calls a live provider.
4. Disable side effects, notifications and enforcement during replay.
5. Verify input hashes before execution.
6. Preserve the original result and record any divergence without overwriting it.
7. Return `incomplete` when a required retained input is unavailable.

## Immutability and access

`trust_timeline_events` has an update/delete prevention trigger in migration source. That is a strong current boundary for timeline entries, not proof that every replay table or every deployed environment is immutable. Replay reads require authenticated tenant/owner scoping. Forensic export requires explicit authorization, audit and retention review.

## Failure and recovery

A failed replay write must not be reported as persisted. The workflow can return its decision while marking replay persistence pending/failed, but downstream reports must display that gap. Production readiness requires a durable queue, idempotent writer, dead-letter handling, alerting, reconciliation and recovery tests.

## Acceptance path to exact replay

Exact replay can be claimed only after the decision envelope pins every manifest input, a test fixture reproduces the original decision bit-for-bit across supported versions, expired inputs produce a declared incomplete result, and deployed append-only/tenant controls are independently verified.
