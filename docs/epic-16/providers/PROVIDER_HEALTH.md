# Provider health

Canonical states are `HEALTHY`, `DEGRADED`, `UNAVAILABLE`, `MISCONFIGURED`, and `UNKNOWN`. Health dimensions are configuration, connectivity, execution, callback, and evidence pipeline. They must not be collapsed into one optimistic connected flag.

The PAL health contract includes environment, enabled/configured state, reason, timestamp, measured latency, and safe provider request ID. Durable snapshots can retain rolling success rate, callback failures, timeouts, retries, and rate limits. Latency p50/p95 requires retained samples; one request is not a percentile.

`Live`/production readiness requires a production environment, valid credentials, audited registry enablement, successful real provider call, verified signed callback, normalized evidence and trust-sink linkage, RLS validation, reviewed outcome, and deployment evidence. Configuration alone is `MISCONFIGURED`, `DISABLED`, or at most test readiness.
