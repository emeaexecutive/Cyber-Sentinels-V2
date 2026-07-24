# Continuous Trust Background Processing

## Selected architecture

The engine uses a Postgres transactional outbox (`trust_signal_processing`) plus Vercel Cron. This matches serverless deployment constraints and avoids a permanently running worker inside a request.

Ingestion atomically creates the immutable signal, queue row, Replay event, and audit record. The request makes one inline processing attempt for low latency. The scheduled route claims remaining work with row locks and `SKIP LOCKED`, so concurrent invocations do not process the same job.

## Retry behavior

- Maximum attempts: five.
- Retryable conditions: dependency/server failures and compare-and-set/hash-chain contention.
- Delay: exponential backoff in SQL.
- Terminal state: `FAILED_TERMINAL`.
- Failure evidence: every attempt appends a bounded `error_code` record.
- Idempotency: signal source + tenant + idempotency hash is unique; policy decisions and finalization are unique per signal.

There are no endless retry loops. A crashed lease becomes claimable after the lock timeout.

## Authorization

`GET /api/trust/jobs/process` requires `Authorization: Bearer <CRON_SECRET>` and compares the secret in constant time. The secret is server-only and never uses a `NEXT_PUBLIC_` variable. Database mutation functions revoke access from `public`, `anon`, and `authenticated`, granting only `service_role`.

## Runbook

1. Confirm Vercel Cron delivery and `CRON_SECRET`.
2. Count `QUEUED`, `PROCESSING`, `FAILED_RETRYABLE`, and `FAILED_TERMINAL`.
3. Group recent failures by safe error code.
4. Verify Supabase and canonical event-chain health.
5. Correct the dependency. Do not manually update immutable signals or decision history.
6. Let retryable jobs resume. For terminal failures, create a new authorized signal with a new idempotency key and causation reference.

The deterministic in-process evaluator processed 10,000 test signals in roughly 170 ms on the development machine. This is not an end-to-end SLA. Production latency is dominated by database, evidence, and deployment-network time; monitor p50/p95 queue age and processing duration before setting an SLA.
