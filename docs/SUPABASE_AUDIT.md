# Cyber Sentinels Supabase Audit

Date: 2026-06-04

Status legend: WORKING, PARTIAL, BROKEN, UNUSED, UNSAFE.

## Summary

Supabase is the primary auth, database, and storage integration. The app uses the Supabase SSR client, server-side auth checks, route middleware, RLS migrations, and private evidence storage. The integration is suitable for a controlled V1 demo when migrations and environment variables are applied. The main production hardening item is tightening older broad authenticated RLS policies into owner/admin policies on core operational tables.

## Auth

| Flow | Status | Notes |
| --- | --- | --- |
| Email/password signup | WORKING | Login page calls `supabase.auth.signUp` with `emailRedirectTo` pointing at `/auth/callback?next=/passport` or a safe requested route. |
| Email verification callback | WORKING | `/auth/callback` reads `code`, exchanges it for a session, preserves safe `next`, defaults to `/passport`, and returns clear login errors. |
| Magic links | WORKING | Login page calls `signInWithOtp` with the same callback route. |
| Password login | WORKING | Login page signs in and redirects to the safe `next` path. |
| Password reset | WORKING | Reset email redirects to `/reset-password`; page updates Supabase user password and redirects to `/passport`. |
| Logout | WORKING | `/api/auth/logout` signs out, clears Supabase cookies and admin cookie, then redirects to `/login`. |
| Session expiration | WORKING | Server client detects invalid refresh token errors, clears auth/admin cookies, and redirects to login. `/api/auth/session-expired` records session-expiry audit/signal when possible. |

## Server Client And Environment

| Area | Status | Notes |
| --- | --- | --- |
| Supabase server client | WORKING | `lib/supabase/server.ts` uses `@supabase/ssr`, reads cookies, writes refreshed cookies when allowed, and asserts required public Supabase env vars. |
| Configuration errors | WORKING | Missing Supabase URL/anon key returns controlled service-unavailable responses in API paths using `configurationError`. |
| Session persistence | WORKING | SSR cookie adapter and client login flow use Supabase cookies; logout clears both `sb-*` and admin verification cookie. |

## Storage

| Area | Status | Notes |
| --- | --- | --- |
| Evidence bucket | WORKING | Latest migration creates/updates `evidence-files` with `public = false`, size limit, and allowed MIME types. |
| Private evidence uploads | WORKING | `/api/evidence/upload` stores to Supabase Storage and records `storage_path`, not public file URLs. |
| Bucket policies | PARTIAL | Storage policies allow authenticated access to the bucket. App routes enforce owner/admin checks before upload. A later production pass should add stricter object-path ownership policies or signed-download routes. |
| Public evidence URLs | WORKING | Legacy metadata API was updated so a public URL is not required. V1 should continue to avoid public evidence URLs. |

## RLS And Table Access

| Table group | Status | Notes |
| --- | --- | --- |
| Core tables: `passports`, `verification_cases`, `evidence_files` | PARTIAL | RLS is enabled, but older migrations include broad authenticated policies. Application routes filter by owner/admin. Production should move these to owner/admin policies. |
| Operational tables: `decisions`, `audit_logs`, `signals` | PARTIAL | Anon access is revoked and RLS is enabled. Current policies are authenticated-wide for operational use; acceptable for controlled demo but too broad for multi-tenant production. |
| Communications: `message_threads`, `message_events`, `notifications`, `appeals` | WORKING | Migrations include own-user policies and admin policies. Pages filter by current user. |
| Trust assistant and knowledge base | WORKING | Own-read and admin/approved-read patterns are present for the newer tables. |
| Agents and trust events | PARTIAL | Owner/admin RLS exists. These remain future/developer-platform surfaces, not V1 launch spine. |
| Enterprise access requests | PARTIAL | Public insert is intentional; authenticated manage policy is broad. Admin display is app-protected. |
| Feedback reports | PARTIAL | Authenticated manage policy is broad. App page requires auth and admin update route is protected; production should tighten own/admin policy. |
| Data rights requests | PARTIAL | Authenticated manage policy is broad. App and admin routes filter in application code; production should enforce own/admin RLS. |

## Private Evidence Requirement

Private evidence buckets remain private in the latest migration:

- Bucket: `evidence-files`
- `public = false`
- File size limit: 10 MB
- Allowed MIME types: PDF, PNG, JPEG, DOCX
- Preferred route: `/api/evidence/upload`

Launch note: verify the migration has been applied in the target Supabase project before demo or production use.

## Known Risks

- Broad authenticated RLS on older core/operational tables is the largest data-isolation risk.
- Public enterprise access insert is intentional, but there is no rate limiter on the server action.
- Evidence download/read access should eventually use signed URLs generated after owner/admin checks.
- Supabase dashboard redirect URLs must include the deployed `/auth/callback` URL for signup and magic links.

## Launch Recommendation

For V1 demo readiness:

1. Apply all migrations to the target Supabase project.
2. Confirm `evidence-files` is private in Supabase Storage.
3. Confirm auth redirect URLs include production `/auth/callback`.
4. Use `/api/evidence/upload` as the only active evidence upload path.
5. Schedule a post-demo RLS hardening pass for owner/admin policies on all tenant-sensitive tables.
