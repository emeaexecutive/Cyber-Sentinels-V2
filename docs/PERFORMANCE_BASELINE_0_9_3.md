# Performance Baseline 0.9.3

Measured locally on 2026-07-12 with Node’s stripped-TypeScript test runner. These are in-process deterministic orchestration measurements, not production APM, network-provider, Supabase, browser or queue SLA results.

## Load findings

| Simulated executions | Average | p95 | Failure rate |
|---:|---:|---:|---:|
| 10 | 0.570 ms | 0.733 ms | 0% |
| 100 | 0.612 ms | 0.930 ms | 0% |
| 500 | 0.499 ms | 0.971 ms | 0% |

Run-to-run variance is expected at sub-millisecond scale. These values prove local contract execution only.

## Ten slowest recorded local operations

The profiler retained these top samples from the measured run: total workflow 0.913 ms; lifecycle write 0.773 ms; Trust Memory construction 0.704 ms; total workflow 0.453 ms; total workflow 0.336 ms; total workflow 0.299 ms; total workflow 0.281 ms; total workflow 0.273 ms; total workflow 0.247 ms; lifecycle write 0.233 ms.

## Findings and risks

- The Trust Engine and aggregate orchestration dominated local synchronous work.
- Replay, governance event, Evidence Graph and Trust Memory construction are individually instrumented; these are object-construction timings, not durable database writes.
- Provider network latency, database queries, dashboard response time and real governance queue latency were not measured because no live deployment/provider connection was used.
- Provider timeout is the primary external latency risk; the orchestrator degrades to review.
- Queue backlog risk remains unquantified without deployed queue traffic.
- Cache-miss injection preserved execution behavior; a production cache-miss storm still needs deployment telemetry.
- Recommended optimizations: retain parallel provider collection, batch durable graph/memory writes behind an idempotent receipt boundary, instrument Supabase query timing, set provider-specific timeouts, and alert on governance queue age.

No performance percentage, throughput capacity or production SLA is claimed.
