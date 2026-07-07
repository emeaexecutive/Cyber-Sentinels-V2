# Query Optimization Plan

This plan identifies safe optimization targets for TrustOps readiness. It does not ship migrations blindly; indexes should be added only after query plans or pilot traffic confirm pressure.

## Audit Targets

| Area | Current access pattern | Safe next step | Migration status |
| --- | --- | --- | --- |
| Replay events | Recent `trust_timeline_events` reads ordered by `created_at`, often filtered by subject or event type. | Capture slow-query evidence for `(subject_id, created_at desc)` and event-type filtered reads. | Recommendation only |
| Trust decisions | Execution views read trust workflow events and algorithm metadata from timeline rows. | Prefer bounded windows and stable ordering by `created_at, id`. | Recommendation only |
| Governance reviews | Governance tables are read by subject and status for queues and dashboards. | Verify whether existing RLS-safe indexes cover `(subject_id, created_at desc)` and `(action_status, created_at desc)`. | Recommendation only |
| Provider logs | Provider status is mostly in-process or receipt-linked metadata today. | Persist normalized provider audit logs only after live provider traffic exists. | Deferred |
| ML benchmark results | Benchmarks run from `data/validation` metadata and are not persisted as a production table. | Keep benchmark artifacts exportable; do not add result tables before review workflow needs them. | Deferred |
| Reviewed outcomes | Reviewed outcomes are derived from labelled cases and benchmark results. | Persist only after human-review workflow produces adjudicated records at pilot scale. | Deferred |

## Safe Index Candidates

- `trust_timeline_events(subject_id, created_at desc)` for replay and execution timelines.
- `trust_timeline_events(event_type, created_at desc)` for bounded operational event views.
- `governance_actions(subject_id, created_at desc)` for workflow-linked review history.
- `governance_actions(action_status, created_at desc)` for review queues.
- `verification_receipts(subject_id, issued_at desc)` for receipt-to-replay linkage.

These are candidates, not migrations. Confirm table size, existing indexes, RLS plans and query frequency before adding them.

## Optimization Rules

- Keep operational views bounded with explicit limits.
- Prefer subject-scoped reads for replay and receipt flows.
- Do not persist provider payloads or benchmark artifacts unless they have a retention policy.
- Do not weaken RLS to improve query speed.
- Use explain plans and pilot traffic before changing schema.

## Next Action

Collect query-plan evidence from replay, governance, receipt and admin readiness reads during pilot traffic, then add the smallest verified migration for the hottest safe index.
