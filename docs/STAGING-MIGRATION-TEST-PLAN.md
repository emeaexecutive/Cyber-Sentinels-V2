# Staging Migration Test Plan

> **NOT APPROVED FOR PRODUCTION**

## Current staging evidence

Temporary local identifier:

```text
local://127.0.0.1:55432/prod_baseline_20260729
```

Properties:

- PostgreSQL 17.10;
- exact Production `public` schema restored;
- minimal local Supabase role/auth/storage compatibility stubs;
- 15 synthetic non-PII edge-case rows;
- no Production credentials;
- no webhooks, email, Stripe or provider callbacks;
- no PostgREST or Supabase schema cache.

This proves baseline restorability. It is not sufficient for application acceptance.
The temporary PostgreSQL server was stopped after validation; its temporary data directory was retained for the current workstation session.

## Required acceptance environment

Preferred:

1. Supabase database branch restored from Production; or
2. isolated staging project restored from an approved Production backup.

No paid environment may be created without approval.

Required controls:

- branch-scoped keys and Preview variables only;
- outbound email disabled or sinked;
- Stripe test mode only;
- provider adapters forced to test/mock endpoints;
- no Production webhooks or Slack/CRM destinations;
- synthetic data unless an approved secure backup process is used;
- access limited to named migration testers.

## Test sequence

1. Restore the verified baseline.
2. Verify catalog counts and schema fingerprint.
3. Load synthetic null, duplicate, orphan, tenant, Hopae, relationship and signal cases.
4. Run every read-only preflight and retain aggregate results.
5. Apply proposed migrations in exact timestamp order.
6. Record execution time, notices, rows affected and locks.
7. Refresh PostgREST schema.
8. Run SQL validation and RLS role tests.
9. Run application integration tests against staging.
10. Restore the baseline again and exercise rollback.
11. Reapply to prove reproducibility.
12. Execute a second-run test: each phase must safely no-op or stop with a clear completed-state diagnostic.

## Lock monitoring

During each phase record:

```sql
select pid, locktype, relation::regclass, mode, granted
from pg_locks
where database = (select oid from pg_database where datname = current_database())
order by granted, relation, mode;
```

Capture long-running statements and transaction age without recording bind values or row contents.

## Consent acceptance

- `POST /api/consent/cookies` succeeds.
- Receipt, preference, events and audit persist.
- Idempotent repeat creates no duplicate.
- Chain head advances exactly once.
- Concurrent chain conflict fails safely.
- Invalid input returns a safe 4xx.
- Optional tracking remains disabled without valid consent.
- No `PGRST205`.
- RPC is unavailable to anon/authenticated and available to service role.

## Turnstile and Enterprise Access acceptance

- Widget renders once in a real browser.
- Preview hostname is authorized.
- Real challenge succeeds.
- `cf-turnstile-response` is present.
- Server Siteverify succeeds.
- Invalid/reused token fails closed.
- No database write occurs before Siteverify.
- Valid Enterprise Access request creates `enterprise_access_requests` and `interest_signals`.

This is independent of consent schema and must be tested separately.

## Other affected APIs

Test authenticated and denied paths for:

- identity;
- providers and callbacks;
- canonical trust events;
- session integrity;
- consensus;
- trust architecture;
- continuous trust;
- Trust Centre;
- support;
- admin review;
- Stripe webhook ledger.

## Current result

| Check | Result |
|---|---|
| Production baseline restored | PASS |
| Synthetic non-PII data loaded | PASS |
| Clean full local active migrations | BLOCKED by the known 26-file historical gap; not used |
| Reconciled sequence applied | PASS on a fresh PostgreSQL 17 baseline |
| Reconciliation second execution | SAFE STOP on completed Phase 7 ledger key; phases are one-shot |
| Negative preflight | PASS; failed before mutation |
| Transaction rollback | PASS; no partial marker |
| Backup/restore rollback | PASS; restored 87/43/176 baseline |
| Consent/RLS direct SQL | PASS |
| Concurrent identical request | PASS; `CREATED` / `DUPLICATE` |
| Concurrent conflicting request | PASS; `CREATED` / `CONFLICT` |
| PostgREST refresh | NOT AVAILABLE |
| Consent persistence | PASS through direct RPC; browser E2E not run |
| Preview Turnstile | NOT RUN |
| Enterprise Access insert | NOT RUN |
| Rollback exercise | PASS at PostgreSQL layer |
