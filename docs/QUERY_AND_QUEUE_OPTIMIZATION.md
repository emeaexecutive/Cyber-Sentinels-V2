# Query and Queue Optimization

This plan identifies safe optimization targets for TrustOps readiness. It does not ship migrations blindly; indexes should be added only after query plans or pilot traffic confirm pressure. RLS and restricted data egress controls stay intact.

## Audit Targets

| Area | Current access pattern | Safe next step | Migration status |
| --- | --- | --- | --- |
| Replay events | Recent `trust_timeline_events` reads ordered by `created_at`, often filtered by subject, workflow or event type. | Capture slow-query evidence for `(subject_id, created_at desc)`, `(event_type, created_at desc)` and bounded replay windows. | Recommendation only |
| Trust decisions | Execution views read trust workflow events, decision metadata and algorithm outputs from bounded timeline or receipt rows. | Keep reads subject-scoped with stable `created_at, id` ordering and explicit limits. | Recommendation only |
| Governance reviews | Governance queues read review status, subject and created time. | Verify existing RLS-safe indexes before adding `(action_status, created_at desc)` or `(subject_id, created_at desc)`. | Recommendation only |
| Provider logs | Provider readiness is currently registry and runtime telemetry; raw provider payloads are not persisted. | Persist only normalized provider audit metadata after live provider traffic exists and retention is approved. | Deferred |
| Benchmark results | Benchmarks run from `data/validation` metadata and are not a production table. | Keep benchmark artifacts exportable; add persistence only after reviewed outcomes need audit history. | Deferred |
| Reviewed outcomes | Reviewed outcomes are derived from labelled cases and benchmark runs. | Persist adjudicated records only after human-review workflow produces pilot-scale outcomes. | Deferred |

## Queue and Execution Targets

| Area | Current behavior | Safe next step |
| --- | --- | --- |
| Event bus | In-process event fanout keeps workflow events non-blocking. | Add idempotency keys and durable event storage after pilot volume proves retry needs. |
| Replay writer | Replay write paths preserve evidence and workflow context without exposing provider secrets. | Keep bounded payloads; add backpressure metrics before introducing workers. |
| Governance queue | Governance review remains human-owned and explicit. | Add retry/dead-letter semantics only when durable queue storage exists. |
| Trust cache | Trust state caching should improve repeated admin/replay reads, not bypass review. | Track cache hit/miss and invalidate on governance action, evidence update and provider status change. |
| Provider orchestration | Provider calls are isolated by timeout and state. | Persist normalized latency/error summaries without raw tokens or provider payloads. |

## Safe Index Candidates

- `trust_timeline_events(subject_id, created_at desc)` for replay and execution timelines.
- `trust_timeline_events(event_type, created_at desc)` for bounded operational event views.
- `governance_actions(subject_id, created_at desc)` for workflow-linked review history.
- `governance_actions(action_status, created_at desc)` for review queues.
- `verification_receipts(subject_id, issued_at desc)` for receipt-to-replay linkage.
- `provider_audit_events(subject_id, created_at desc)` only if a normalized provider audit table is approved.
- `validation_reviewed_outcomes(case_id, reviewed_at desc)` only if reviewed outcomes are persisted.

These are candidates, not migrations. Confirm table size, existing indexes, RLS plans and query frequency before adding them.

## Optimization Rules

- Keep operational views bounded with explicit limits.
- Prefer subject-scoped reads for replay, receipt, governance and admin views.
- Do not persist provider payloads, raw tokens, secrets or unrestricted benchmark artifacts.
- Do not weaken RLS to improve query speed.
- Do not bypass governance review or restricted-data egress checks for queue throughput.
- Use explain plans and pilot traffic before changing schema.

## Next Action

Collect query-plan evidence from replay, governance, receipt, provider-readiness and admin benchmark reads during pilot traffic, then add the smallest verified migration for the hottest safe index.
