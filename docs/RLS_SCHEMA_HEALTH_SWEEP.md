# RLS and Schema Health Sweep

Date: 2026-06-24

## Summary

This sweep checked migration SQL for the remaining schema and RLS patterns most likely to fail Supabase Preview before pilot polish.

One confirmed schema mismatch was fixed:

- `teams.id` was defined as `text` while `team_members.team_id` was defined as `uuid references teams(id)`.
- The existing `teams` table definition now uses `id uuid primary key default gen_random_uuid()` so the foreign key types match.

No product features, speculative tables, public admin access, or RLS weakening were added.

## Checks Performed

Migration searches covered:

- `user_metadata`
- `raw_user_meta_data`
- `team_id text references teams`
- `usage_limits`
- `auth.jwt()`
- admin policy metadata checks
- common policy ownership columns such as `user_id`, `owner_user_id`, `created_by_user_id`, and `submitted_by_user_id`

## Findings

### Unsafe Auth Metadata

No `user_metadata` or `raw_user_meta_data` references remain in migration SQL.

Admin RLS checks use the existing server-controlled convention:

```sql
coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
```

### Team Foreign Key Type

The previous failing `team_id text references teams(id)` pattern was not present. However, the same migration contained a confirmed foreign key mismatch:

```sql
teams.id text
team_members.team_id uuid references teams(id)
```

That was corrected by changing the existing `teams.id` definition to `uuid`, matching `team_members.team_id`.

Plain `team_id text` columns on other private-beta records remain unchanged because they are not foreign keys and were not confirmed preview failures.

### Usage Limits

`public.usage_limits` defines `user_id uuid not null unique` before its RLS policy is created.

The policy:

```sql
using (auth.uid() = user_id)
```

matches the actual table definition, so no change was needed.

### Policy Column References

Policies using ownership columns were spot-checked against their table definitions or prior compatibility `alter table ... add column if not exists` statements. No additional confirmed missing-column policy failures were found in this sweep.

## Guardrails

This sweep did not:

- add product features
- add speculative tables
- disable RLS
- make admin tables public
- replace admin authorization with user-editable metadata

## Runtime Validation

Validation commands:

- `npm run build`
- `git status`
