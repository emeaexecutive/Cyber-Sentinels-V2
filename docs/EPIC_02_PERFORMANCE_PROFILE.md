# Epic 02 Performance Profile

Last updated: 2026-07-08

## Scope

This profile summarizes current runtime-readiness instrumentation. It is not production APM and should not be presented as sustained production latency.

| Measure | Current evidence | Status | Bottleneck |
| --- | --- | --- | --- |
| Average Trust Decision | `lib/performance/runtime-profiler.ts` tracks trust and workflow latency samples. | Implemented | Needs pilot traffic volume. |
| Replay Write | Replay latency stage exists. | Implemented | Durable write timing must be measured under real workflow load. |
| Provider Call | Provider orchestration captures snapshot latency. | Implemented | External providers can dominate latency and require timeouts. |
| Queue Time | Governance queue latency stage exists. | Implemented | Queue is readiness telemetry, not durable worker APM. |
| Dashboard Load | Build confirms dashboard routes compile; runtime load requires environment test. | Planned | Dashboard panels can over-fetch if expanded without lazy loading. |
| Largest Query | Not measured at SQL-plan level. | Awaiting Data | Requires Supabase slow-query and query-plan review. |
| Cache Efficiency | Cache-efficiency stage exists. | Implemented | Hit/miss persistence across deployments is not yet durable. |

## Highlighted Bottlenecks

1. Provider calls: keep timeout-bounded and fail closed.
2. Replay writes: keep side effects async when possible.
3. Dashboard aggregation: avoid broad public dashboard queries.
4. Validation tables: measure query shape before adding indexes.
5. External environment checks: distinguish 401/403 reachability from failures.

## Production Need

Add production APM or hosted telemetry before making SLA claims. Until then, performance evidence should be described as readiness instrumentation.
