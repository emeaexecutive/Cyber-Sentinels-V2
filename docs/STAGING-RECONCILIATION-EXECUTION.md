# Staging Reconciliation Execution

> **NOT APPROVED FOR PRODUCTION**

## Scope and safety

Execution date: 2026-07-29
Branch: `hotfix/request-demo-turnstile-production`
Commit tested: `2b597b089aeb04cad5df4c9c23f6f0eb5bcbc6a6`
Supabase CLI inspected: `2.110.0`
Vercel CLI inspected: `58.3.0`

The repository's linked Supabase reference is
`kecgtsfibkypjuaxqbjx`, which was positively identified as Production. No
reconciliation command was executed through that linkage.

All SQL execution used:

```text
Target: local-disposable-reconciliation-staging
Host: 127.0.0.1:55433
Acceptance database: reconciliation_final_acceptance_20260729
PostgreSQL: 17.10
Baseline: docs/production-schema-baseline-normalised.sql
Dataset: reconciliation-fixtures-v1
```

No Production records, credentials, webhooks, email delivery or billing
integration were present. The database is PostgreSQL-only and has no PostgREST,
GoTrue, Storage API, Realtime or Supabase schema cache.

## Baseline

The normalized Production public schema restored with `ON_ERROR_STOP=1`.

```text
public tables:   87
public routines: 43
public policies: 176
public data rows copied from Production: 0
```

Expected staging-only objects were limited to an empty `auth.users` table and
minimal `auth.uid()`, `auth.jwt()` and `auth.role()` compatibility functions.

## Phase execution

The clean acceptance run used a freshly restored second database. Each phase
ran in its own transaction with
`app.reconciliation.environment=staging`.

| Phase | Exit | Duration | Business rows/backfill | Locks/warnings |
|---|---:|---:|---:|---|
| `202607300001_reconciliation_preflight.sql` | 0 | 119 ms | 0 | Read-only; none |
| `202607300002_reconciliation_ledger.sql` | 0 | 130 ms | 1 operational ledger row | Brief DDL locks; no contention |
| `202607300003_canonical_trust_foundation.sql` | 0 | 172 ms | 0 legacy rows backfilled; 1 ledger row | Brief DDL/index locks; no contention |
| `202607300004_consent_foundation.sql` | 0 | 151 ms | 0 receipt/catalogue rows; 1 ledger row | Brief DDL/index locks; no contention |
| `202607300005_consent_persistence_rpc.sql` | 0 | 64 ms | 1 ledger row | Brief function catalog locks; no contention |
| `202607300006_consent_security_and_rls.sql` | 0 | 77 ms | 1 ledger row | Policy/grant catalog locks; no contention |
| `202607300007_reconciliation_validation.sql` | 0 | 111 ms | 1 ledger row | Constraint validation; no contention |

All six mutating/validation phases are recorded as `completed`. No phase
remains `started`.

The sequence is intentionally one-shot. A deliberate second execution of
Phase 7 stopped inside its transaction on the unique reconciliation ledger key
`202607300007_reconciliation_validation`. The original completed ledger row,
synthetic receipts, Trust Events, grants, and constraints were unchanged. This
is a safe non-mutating stop, but it is not an idempotent no-op; operators must
not rerun a completed phase.

An earlier authoring run correctly failed Phase 7 because its index-name
assertion did not match PostgreSQL's generated unique-constraint index name.
The assertion was corrected, the failed transaction left all six
`trust_events` constraints unvalidated as expected, and the complete sequence
then passed from a fresh baseline. This was proposal-test feedback, not a
staging schema defect.

## Preflight failure test

A disposable clone was deliberately changed by adding the proposed `event_id`
column before Phase 1.

```text
Exit code: 3
Error:
RECONCILIATION_PREFLIGHT_FAILED:
canonical trust_events columns unexpectedly exist: event_id
```

Post-failure state:

```text
schema_reconciliation_runs: absent
canonical trust tables:     0
intentional conflict:       1 column
```

The read-only transaction stopped before mutation.

## Later-phase transaction failure

After a clean seven-phase apply, a transaction created a synthetic marker table
and deliberately divided by zero before commit.

```text
Exit code: 1
Error: division by zero
Marker table after session exit: absent
Completed reconciliation ledger rows: 6
```

The failed transaction left no partial schema state.

## Rollback test

The validation rollback guard was executed and failed closed with:

```text
STAGING TEST ONLY - MANUAL REVIEW REQUIRED:
validation failure requires correction or baseline restore
```

No automatic destructive rollback ran. The disposable test database was then
dropped, recreated and restored from the normalized baseline, which is the
documented safe recovery before new writes:

```text
public tables:          87
public routines:        43
public policies:        176
reconciliation objects: 0
```

## Direct consent/RPC tests

`tests/001_consent_rpc.sql`, `002_security_negative.sql` and
`006_post_data_validation.sql` passed.

Covered:

- first valid `ACCEPT_ALL`;
- exact idempotent replay;
- same key with a different request hash;
- optional analytics consent;
- optional marketing consent on a separate synthetic workspace;
- essential-only withdrawal;
- already-expired historical receipt;
- malformed receipt;
- missing subject key;
- missing trust events;
- invalid correlation UUID at the typed boundary;
- cross-tenant Trust Event injection;
- Trust Event chain conflict;
- full rollback on event failure;
- anon direct read/write denial;
- authenticated RPC/write denial;
- service-role RPC execution;
- append-only current preference linkage;
- post-write constraint and chain validation.

Committed synthetic acceptance state after all concurrency tests:

```text
workspace A receipts/events/head: 5 / 10 / 10
workspace B receipts/events/head: 2 / 4 / 4
broken chain links:               0
```

No real user data was used.

## Concurrent idempotency

Two independent `psql` sessions submitted the same consent request. Session A
held the outer transaction open for two seconds after the RPC, retaining the
per-subject advisory lock. Session B started 300 ms later and waited
approximately 1.8 seconds.

```text
Session A: CREATED
Session B: DUPLICATE
Receipt rows for the key: 1
Trust Events for the request: 2
Chain head after both sessions: 10
```

There was no unique-constraint error and no partial state.

## Concurrent conflicting idempotency

Two independent sessions used the same workspace, subject, and idempotency key
with different request hashes. Session A retained the advisory lock for two
seconds; session B waited and then observed the committed first request.

```text
Session A: CREATED
Session B: CONFLICT
Receipt rows for the key: 1
Stored request hash: first request
Trust Events for the request: 2
Partial or duplicate events: 0
```

The second request wrote no receipt or event.

## Production target guard

`scripts/assert-non-production-supabase.ps1` was run before every fresh
database creation, phase, mutating fixture, and concurrency session.

Against the repository's linked project:

```text
exit: 2
BLOCKED — PRODUCTION SUPABASE TARGET DETECTED
```

Against the explicit local staging reference:

```text
exit: 0
PASS — NON-PRODUCTION SUPABASE TARGET CONFIRMED
```

The guard prints no credential and fails when target identity or the expected
staging reference is absent.

## Catalog and privilege validation

All required tables resolve through `to_regclass`:

```text
public.trust_event_chain_heads
public.consent_receipts
public.consent_policy_versions
public.consent_cookies
public.consent_tracker_catalogue
```

RPC:

```text
public.persist_consent_change_v1
arguments:
  p_receipt jsonb,
  p_subject_key text,
  p_idempotency_key text,
  p_request_hash text,
  p_trust_events jsonb,
  p_correlation_id uuid
result: jsonb
SECURITY DEFINER: yes
search_path: public
```

Effective execute privileges:

```text
postgres:     EXECUTE
service_role: EXECUTE
PUBLIC:       none
anon:         none
authenticated:none
```

All new tables have RLS enabled and forced. Browser roles have zero direct
`INSERT`, `UPDATE`, `DELETE` or `TRUNCATE` grants.

The validation phase sent `NOTIFY pgrst, 'reload schema'`. No PostgREST process
was connected, so schema-cache acknowledgement, RPC discovery through
PostgREST, and absence of `PGRST205` at the HTTP layer are not verified.

## Application validation

Commands used Node 22.23.1, matching the repository's declared Node 22 line.

| Command | Exit | Result |
|---|---:|---|
| `npm test` | 0 | 481/481 subtests passed; 48 script suites; 0 failed |
| Request Demo subset | 0 | 23/23 passed |
| Consent subset | 0 | 40/40 passed |
| `npm run typecheck` | 0 | Passed in 8.3 s |
| `npm run lint` | 0 | Passed in 25.4 s |
| `npm run build` | 0 | Next.js 15.5.21 build passed; 185 static pages generated |
| `git diff --check` | 0 | Passed |

Node's module-type warnings appeared in tests. The build read `.env.local` but
no value was printed. No environment file was changed or staged.

## API route classification

The route tests in `npm test` passed at the unit/contract level. Runtime API
classification against this PostgreSQL-only target is:

| Family | Classification | Evidence |
|---|---|---|
| Consent | AUTH BLOCKED for HTTP; direct SQL PASS | Schema/RPC and SQL behavior pass; no PostgREST |
| Canonical Trust Events | AUTH BLOCKED for HTTP; direct SQL PASS | Append, chain and role tests pass; no PostgREST |
| Enterprise Access | AUTH BLOCKED | Both baseline tables exist; no staging Supabase HTTP API or real Turnstile |
| Identity | SCHEMA BLOCKED | `identity_subjects` and `identity_verification_requests` absent |
| Providers | SCHEMA BLOCKED | `provider_registry` and `provider_execution_records` absent |
| Session integrity | SCHEMA BLOCKED | Legacy tables exist with the incompatible Production shapes; no compatibility phase authored |
| Verifier | SCHEMA BLOCKED | `verifiers` and `verification_runs` absent |
| Consensus | SCHEMA BLOCKED | `provider_consensus_decisions` absent |
| Trust architecture | SCHEMA BLOCKED | `trust_domains` absent |
| Continuous trust | SCHEMA BLOCKED | Legacy `trust_signals` exists; approved `continuous_trust_signals_v2` is not authored |
| Trust Centre | SCHEMA BLOCKED | trust-centre report/alert target tables absent |
| Support | SCHEMA BLOCKED | `support_issues` absent |
| Admin APIs | AUTH BLOCKED / route-specific | Baseline `admin_reviews` exists; no GoTrue/PostgREST runtime |

These are controlled, explained blockers. A controlled 404 was not treated as
a 500 or as an execution pass.

## Preview and browser verification

No isolated Supabase project/branch reference, URL, anon key or service-role
credential was available. The only local Supabase linkage points to Production.
Therefore:

- no staging-only Vercel Preview was created;
- no general Preview or Production variable was changed;
- no PostgREST HTTP request was made;
- no clean-browser consent flow was run;
- no real Cloudflare Turnstile challenge was run;
- Siteverify was not exercised;
- no Enterprise Access or interest-signal staging insert was attempted.

Creating a Preview in this state would require pointing it at Production, which
is explicitly prohibited.

## Source-control state

No file was staged, committed or pushed. No active migration was edited. All
proposal SQL remains under `supabase/reconciliation`.

PR #12 was checked read-only after testing:

```text
state: open
draft: true
merged: false
head: hotfix/request-demo-turnstile-production
head SHA: 2b597b089aeb04cad5df4c9c23f6f0eb5bcbc6a6
```

## Result

The consent/canonical-event reconciliation proposal is ready for database
review at the PostgreSQL layer.

The overall runbook remains:

```text
BLOCKED — STAGING REQUIRED
```

Here, "staging unavailable" means no isolated Supabase platform staging
project/branch exists for PostgREST, Preview, browser, Turnstile and affected
HTTP-route acceptance. It does not negate the successful disposable
PostgreSQL 17 staging tests above.
