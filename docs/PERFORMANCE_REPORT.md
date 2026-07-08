# Performance Report

Enterprise Readiness Mode treats performance as reliability evidence. The current profiler is in-process readiness telemetry, not production APM.

## Instrumented Areas

| Area | Current Hook | Status | Gap |
| --- | --- | --- | --- |
| Trust Engine | `provider_latency`, `trust_latency`, `workflow_latency` samples in `lib/runtime/trust-execution-pipeline.ts` | Instrumented | Needs sustained pilot sample volume. |
| Replay Engine | `replay_latency` profile sample | Instrumented | Needs durable replay write timing. |
| Provider Orchestrator | Provider adapter samples and runtime profile samples | Instrumented | Needs per-provider p50/p95 history. |
| Decision Engine | Trust and workflow latency profile | Partial | Needs explicit decision-engine stage label if split from trust engine. |
| Governance Queue | `queue_latency` sample when governance work is queued | Instrumented | In-process queue is not durable APM. |
| Signal Fusion | Covered by trust/workflow timing today | Partial | Add dedicated signal-fusion timing if it becomes a bottleneck. |
| Cache | `cache_efficiency` sample | Instrumented | Needs hit/miss persistence across deployments. |
| Database | No query-level profiler in this pass | Gap | Use Supabase query plans and slow query logs before index work. |

## Top 10 Slowest Operations

`lib/performance/runtime-profiler.ts` now exposes `getSlowestRuntimeOperations(10)`. Until pilot traffic produces samples, the expected slowest-operation classes are:

| Rank | Operation Class | Expected Risk | Action |
| ---: | --- | --- | --- |
| 1 | External provider call | Timeout or degraded provider state | Keep provider timeouts isolated from final decisions. |
| 2 | Replay write | Slow audit persistence | Keep replay side effects async where possible. |
| 3 | Governance queue enqueue | Review routing overhead | Keep queue bounded and idempotent. |
| 4 | Trust calculation | Evidence volume growth | Profile evidence normalization and trust scoring together. |
| 5 | Signal fusion | Multi-signal scoring overhead | Keep fusion deterministic and explainable. |
| 6 | Receipt export | Evidence serialization | Avoid large raw provider payloads in public receipts. |
| 7 | Admin dashboard aggregation | Broad summary queries | Cache summaries after pilot usage proves need. |
| 8 | Session integrity evaluation | Device/session context expansion | Keep session trust as evidence, not a blocking monolith. |
| 9 | Provider readiness checks | Environment and registry scans | Avoid live provider calls in readiness pages. |
| 10 | Database reads | RLS and unindexed filters | Inspect deployed query plans before schema changes. |

## Performance Gate

No enterprise merge should add blocking provider calls, public dashboard aggregation or synchronous replay writes to the request path unless it includes timeout behavior, degraded-state behavior, replay evidence and validation.
