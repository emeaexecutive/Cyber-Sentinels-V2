# Durable telemetry

`operational_measurements` stores mapped RC6 stages, duration, status, timeout/retry count, provider, workflow, environment, build, correlation, sanitized fingerprint, error category and expiry. RLS is enabled; anonymous and ordinary authenticated access is revoked.

`prune_expired_rc6_evidence()` removes expired ledger and measurement rows. `export_rc6_performance_summary()` returns aggregated, redacted stage evidence. p50/p95 require at least 30 retained samples; p99 requires at least 100. Below the threshold the UI says `Awaiting sufficient samples`.
