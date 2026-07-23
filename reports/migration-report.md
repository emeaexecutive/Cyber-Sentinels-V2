# Supabase migration report

Date: 2026-07-22

## Failure repaired

Migration `202606090001_hiring_security_interview_integrity.sql` previously parsed this legacy column reference unconditionally:

```sql
set candidate_id = coalesce(candidate_id, candidate_profile_id)
```

PostgreSQL therefore raised SQLSTATE 42703 when `public.interview_sessions.candidate_profile_id` was absent.

## Remediation

- The candidate backfill now checks `information_schema.columns` for both `candidate_id` and `candidate_profile_id`.
- The legacy update is isolated inside dynamic SQL, so PostgreSQL does not resolve the absent identifier unless both columns exist.
- The update touches only rows with a null `candidate_id` and a non-null legacy identifier.
- The migration emits a notice and continues when either column is absent.
- No `candidate_profile_id` column or guessed data type was added.
- The same combined update also contained an unguarded legacy `status` reference. It is now separately checked and dynamically executed; if absent, only the new `session_status` default backfill runs.
- The non-legacy `risk_level` backfill remains a direct update after the migration adds that column.

## Legacy-assumption audit

- `enterprise_id`: not referenced by this migration.
- `trust_score`: not referenced by this migration.
- Legacy `candidate_profile_id`: guarded by `information_schema.columns`.
- Legacy `status`: guarded by `information_schema.columns`.
- Indexes: use `create index if not exists`.
- Policies: existing names are removed with `drop policy if exists` before creation.
- Function: uses `create or replace function`.
- Trigger: uses `drop trigger if exists` before creation.
- No legacy column is dropped or indexed later in the migration.

## Verification

The cookie-consent recovery suite includes a static migration regression test requiring the guarded dynamic SQL and rejecting any attempt to add `candidate_profile_id`. The updated migration was not pushed to a remote Supabase project from this workspace.

