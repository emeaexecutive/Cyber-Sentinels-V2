# RC4 Performance Evidence

## Profiled paths

The existing runtime profiler now provides one normalized view for Replay, Evidence Graph, Trust Decision, provider calls, database queries and queues.

| Path | Runtime stage | Slow-investigation threshold | Measurements |
| --- | --- | ---: | --- |
| Replay | `replay_latency` | 200 ms | samples, average, p95, timeouts, slow operations |
| Evidence Graph | `evidence_graph_latency` | 200 ms | samples, average, p95, timeouts, slow operations |
| Trust Decision | `trust_latency` | 300 ms | samples, average, p95, timeouts, slow operations |
| Provider calls | `provider_latency` | 8,000 ms | samples, average, p95, timeouts, slow operations |
| Database | `database_query_latency` | 250 ms | samples, average, p95, timeouts, slow queries |
| Queues | `queue_latency`, `governance_queue_latency` | 500 ms | samples, average delay, p95 delay, timeouts, slow operations |

The thresholds are investigation markers, not SLAs. The protected `/enterprise/readiness#performance-evidence` surface displays `Awaiting data` when a process has no retained samples.

## Bottleneck policy

- The slowest retained operations are ordered by measured latency.
- Missing production samples do not become zero-latency results.
- Queue depth and delay remain process-local until durable queue telemetry exists.
- Provider and database results do not imply fleet-wide performance.
- Production APM, capacity tests and deployed query plans remain outside current evidence.

## Remaining blockers

1. Retain representative production or pilot samples outside process memory.
2. Correlate database query fingerprints without retaining sensitive parameters.
3. Add durable queue depth, retry and dead-letter evidence before queue reliability claims.
4. Establish workload-specific SLOs only after design-partner traffic exists.
