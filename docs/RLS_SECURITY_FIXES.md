# RLS Security Fixes

Date: 2026-06-24

## Summary

Supabase flagged an unsafe RLS authorization pattern in the `admin manage trust_assistant_questions` policy because it referenced user-editable auth metadata.

The affected RLS policies now use the existing project convention:

```sql
coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
```

No RLS was disabled. No admin tables were made public. No new tables were added.

## Why User Metadata Is Unsafe

`user_metadata` is editable by users through Supabase Auth profile updates. It must not be trusted for authorization decisions, including admin access checks in RLS policies.

Unsafe examples include:

```sql
auth.jwt() -> 'user_metadata' ->> 'role'
auth.jwt() -> 'raw_user_meta_data' ->> 'role'
```

Either pattern can allow a user-controlled profile value to influence access decisions.

## Safer Admin Authorization

`app_metadata` is server-controlled in Supabase Auth and is the safer temporary source for role-based RLS checks when no dedicated admin authorization table is used.

Admin authorization in RLS should use one of these server-controlled sources:

- `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`
- `auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true'`
- a dedicated admin table or allowlist managed by trusted server-side code

This project currently uses `app_metadata.role = admin` in SQL policies, so the fix keeps that convention.

## Updated Scope

The unsafe fallback to `user_metadata.role` was removed from affected migration policies, including:

- `admin manage trust_assistant_questions`
- admin policies for knowledge articles
- admin policies for messages, notifications, and appeals
- admin policies for agents, trust events, and agent permissions
- admin policies for developer API keys
- admin policies for integration status
- admin policies for API test runs
- admin policies for launch control notes
- admin policies for operational notifications
- admin policies for runtime validation logs

## Verification

Searches were run for:

- `user_metadata`
- `raw_user_meta_data`
- `auth.jwt()`

No `user_metadata` or `raw_user_meta_data` references remain in migration SQL after the fix. Remaining `auth.jwt()` policy checks use `app_metadata.role`.
