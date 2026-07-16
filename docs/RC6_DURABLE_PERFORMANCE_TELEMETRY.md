# RC6 durable performance telemetry

`operational_measurements` retains sanitized stage, duration, status, timeout/retry counts, provider, environment, build, correlation, operation fingerprint and error category. Default retention is 90 days. RLS is enabled and public/authenticated access is revoked.

The existing runtime profiler forwards correlation-scoped samples only when server-side Supabase configuration exists. It never persists raw payloads, secrets, personal data, identity documents or biometrics.

Current retained sample count: **0**. Existing RC5 measurements remain local microbenchmarks and are not production telemetry or SLAs.
