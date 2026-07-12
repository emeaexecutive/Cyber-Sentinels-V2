# Platform Observability

## Purpose

Sprint 9.1 adds an admin-only operational snapshot to the existing Trust Execution surface at `/admin/trust-execution`. It is designed to answer four operator questions first: platform health, current risk, required action and available evidence.

The snapshot is assembled by `lib/core/platform-health.ts`. It does not introduce a new monitoring product, public endpoint or background service.

## Signals and sources

| Signal | Source | Display rule | Boundary |
| --- | --- | --- | --- |
| Application status | Auth result, provider states, replay failures and queue state | `healthy`, `degraded`, `blocked` or `unknown` | A point-in-time application snapshot, not an external uptime SLA |
| Provider health | Provider readiness checks plus the latest orchestration result | `configured`, `healthy`, `degraded`, `offline` or `awaiting credentials` | `healthy` requires a live, measured orchestration sample; limitations remain visible |
| Queue health | Existing governance queue and replay writer | Pending, failed and retry counts | Counts are process-local and reset when the process restarts |
| Replay latency | Actual `trust_timeline_events` insert duration | P95 and sample count, otherwise `Awaiting data` | In-process samples only |
| Trust Engine latency | Time spent in `runTrustAlgorithm` | P95 and sample count, otherwise `Awaiting data` | Does not include providers, persistence or workflow side effects |
| Authorization latency | Protected admin authorization check | P95 and sample count, otherwise `Awaiting data` | Measures only requests handled by this process |
| Dashboard load | Server-side construction of the operator dashboard | P95 and sample count, otherwise `Awaiting data` | Does not measure browser paint or network transfer |
| Provider latency | Provider orchestration results | P95 and sample count, otherwise `Awaiting data` | Not a retained provider SLA |
| Database query | Trust decision timeline query | Slowest retained sample and P95 | Covers instrumented queries only, not every database query |
| Build version | `VERCEL_GIT_COMMIT_SHA` or `BUILD_VERSION` | Value or `Unavailable` | Must be injected by deployment tooling |
| Deployment timestamp | `DEPLOYMENT_TIMESTAMP` or `VERCEL_DEPLOYMENT_TIMESTAMP` | Value or `Unavailable` | Must be injected by deployment tooling |

Missing observations are represented as `Awaiting data`, never as zero. Health-section confidence is left unset unless a measured confidence source exists.

## Trust decision metrics

The dashboard reads retained `trust_timeline_events` for the previous 24 hours and produces 24 UTC hourly buckets. It reports total decisions plus `allow`, `review`, `escalate` and `block`. `step_up` is grouped with `review` because both require an additional control before unrestricted continuation.

Only exact workflow decision event types are queried. Missing and unclassified records are ignored rather than inferred. The dashboard limits the operational read to 1,000 events; reaching that volume is a prompt to move aggregation into a bounded database function or retained metric, not to extrapolate.

## Operator interpretation

- `healthy`: the observed path is operating within the evidence available to this process.
- `configured`: credentials and implementation are present, but no live measured sample proves health.
- `degraded`: the path is available with a limitation, failure or missing production capability.
- `offline`: a measured provider attempt timed out or failed.
- `awaiting credentials`: production credentials are absent.
- `unknown` or `Awaiting data`: the platform has insufficient observation and makes no claim.

## Retention and privacy

Runtime profiles, replay diagnostics and governance queue diagnostics are bounded, process-local operational data. They contain labels and technical metadata, not raw customer evidence. Trust decisions and replay records remain in the existing protected database paths and retain their existing access controls.

## Production follow-ups

The next operational investments should be evidence-driven:

1. Export runtime profiles and failed-job diagnostics to a durable, access-controlled telemetry system.
2. Replace the process-local retry list with a durable queue that records age, attempts, owner and terminal state.
3. Add deployment-level uptime probes and provider SLA measurements outside the application process.
4. Run database `EXPLAIN (ANALYZE, BUFFERS)` under production-like volume before changing indexes.
5. Move decision trend aggregation server-side when the 1,000-row operational window is routinely reached.
