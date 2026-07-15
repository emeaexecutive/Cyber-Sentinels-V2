# Performance Profile

Release: 1.1.4

## Instrumented paths

| Path | Runtime stage | Current interpretation |
| --- | --- | --- |
| Replay | `replay_latency` | Write duration for instrumented Replay operations |
| Evidence Graph | `evidence_graph_latency` | Evidence-graph write stage duration |
| Trust Memory™ | `trust_memory_latency` | Trust Memory append stage duration |
| Provider execution | `provider_latency` | Provider orchestration duration and outcome |
| Parallel orchestration | `parallel_orchestration_latency` | Wall time across the parallel signal group |
| Database queries | `database_query_latency` | Instrumented query duration only |
| Cache usage | `cache_efficiency` | Instrumented cache-operation duration and outcomes |
| Queue performance | `queue_latency` and `governance_queue_latency` | Enqueue duration for instrumented process-local queues |

Samples are held in a bounded in-process buffer of 200 records. The workspace shows P95 where available and the eight slowest retained operations. Empty categories remain `Awaiting data`.

## Bottleneck findings

No production-scale bottleneck is claimed because no durable, representative production profile exists yet. Code-path review identifies four pilot risks to measure:

1. External providers are the highest-variance dependency. Each call is timeout-bounded, but credential presence and a fast test result are not an SLA.
2. Replay, Evidence Graph and Trust Memory are continuity-critical writes. A failed Replay or Trust Memory write fails the Trust Fabric path closed; write latency must be observed under pilot volume.
3. Governance and Replay queue diagnostics are process-local. They do not provide durable age, retry ownership or fleet depth.
4. Database and cache coverage is intentionally sparse. Instrumented admin queries do not represent every database path, and cache-operation timing is not a cache hit-ratio study.

## Pilot performance plan

- Establish workflow-specific P50/P95/P99 budgets before traffic begins.
- Record provider, Trust Decision and evidence-write latency with deployment and workflow identifiers, excluding raw evidence.
- Load-test the controlled workflow with representative evidence sizes and concurrency.
- Run database execution-plan analysis under representative row counts before adding indexes.
- Treat regressions, queue age and continuity-write failures as pilot stop conditions.
