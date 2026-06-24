# Governance And Auth Audit

Date: 2026-06-24
Workspace: `C:\Users\emeae\Desktop\cyber-sentinels-clean`

## Result

Governance and login/auth flows now use a consistent protection model for enterprise workflow data.

One narrow consistency fix was made during the audit:

- `app/api/provenance/route.ts` now scopes non-admin reads, updates, and deletes to the authenticated user's own `created_by` values.
- New provenance events are now written with `created_by: user.id`, preventing request payloads from spoofing the creator.
- Admin allowlisted users retain the existing oversight behavior.

No new features, tables, public positioning changes, RLS weakening, or speculative routes were added.

## Public Informational Routes

These routes are intentionally public and do not expose authenticated enterprise workflow data:

- `/`
- `/platform`
- `/enterprise`
- `/enterprise/hiring-security`
- `/demo`
- `/demo/hiring-attack`
- `/demo/session-integrity`
- `/pricing`
- `/enterprise-access`
- `/login`
- `/verify-email`

`/enterprise/governance`, `/dashboard/governance`, and `/admin/governance` do not exist in this checkout, so there is no extra governance page to expose accidentally.

## Protected Governance Routes

`/governance` is an authenticated workflow surface, not a public informational page.

Protection model:

- `middleware.ts` includes `/governance` in protected user route prefixes.
- `app/governance/page.tsx` calls `supabase.auth.getUser()` server-side.
- Missing users redirect to `/login?next=/governance`.
- Unverified users are blocked by middleware and redirected to `/verify-email?next=...`.
- The page then requires reviewer capability: admin allowlist, workspace reviewer membership, or workspace ownership.
- Users without reviewer access receive a safe "Reviewer access required" state, not workflow data.
- Database reads use authenticated Supabase client calls and safe empty arrays when optional tables are unavailable.

## Governance APIs

Authenticated governance-related APIs checked:

- `app/api/ai-governance/analyze/route.ts`
- `app/api/trust/certifications/route.ts`
- `app/api/trust/alerts/route.ts`
- `app/api/provenance/route.ts`
- `app/api/agents/route.ts`

Current protection model:

- All checked governance APIs call `supabase.auth.getUser()`.
- Missing sessions return `401 Unauthorized`.
- AI governance analysis checks subject ownership and returns `403 Forbidden` for non-owned passport or AI agent subjects.
- Trust certifications and trust alerts scope non-admin reads, updates, and deletes to `created_by = user.id`.
- AI agents scope non-admin reads, updates, and deletes to `owner_user_id = user.id`.
- Provenance events now match the same model: non-admin users are scoped to rows they created, while admins retain oversight.
- Public enterprise access submission remains public by design, but it is rate-limited, Turnstile-protected, and write-only through the server route.

No `app/api/governance/summary/route.ts` file exists in this checkout.

## Admin-Only Routes

Admin-only areas remain protected by middleware and server-side admin guards:

- `/back-office`
- `/admin`
- `/admin/founder-control`
- `/admin/runtime-validation`
- `/admin/deployment-readiness`
- `/admin/integrations`
- `/admin/pilot-overview`
- `/admin/api-tests`
- `/admin/reviews`
- `/admin/trust-integrity`

Protection model:

- `middleware.ts` includes `/back-office`, `/admin`, and `/api/admin/*` in admin path matching.
- Admin paths require a valid session, verified email, configured admin allowlist, allowlisted email, and the admin verification cookie where required.
- Admin pages use `checkAdminAccess` and/or `requireAdminPageAccess`.
- `/admin` redirects to `/back-office`, which is itself admin-gated.
- Admin APIs use the same admin access helpers and redirect/deny model.

## Login And Session Model

Checked auth surfaces:

- `/login`
- `/verify-email`
- `/auth/callback`
- `/api/auth/logout`
- `/api/auth/session-expired`
- `middleware.ts`
- Supabase browser/server client helpers

Consistency notes:

- Login supports password, signup, magic link, and password reset through the existing Supabase client path.
- Signup asks users to verify email before continuing.
- Middleware treats missing sessions as normal on public pages and redirects only protected paths.
- Protected paths preserve the intended destination through `/login?next=...`.
- Unverified users are redirected to `/verify-email?next=...` before dashboard, workspace, governance, receipt, replay, back-office, or admin workflows render.
- Logout is handled by `/api/auth/logout`.
- Expired session handling remains isolated to `/api/auth/session-expired`.

## Middleware Behavior

Protected user prefixes include:

- `/passport`
- `/passports`
- `/dashboard`
- `/workspace`
- `/governance`
- `/trust`
- `/trust-replay`
- `/verify/session`
- `/verify/candidate`
- `/verify/recruiter`
- `/verify/provenance`

Protected admin prefixes include:

- `/back-office`
- `/admin`
- `/api/admin/*`
- `/verification-queue`
- `/evidence-vault`
- `/decision-engine`
- `/trust-intelligence`
- `/trust-graph-engine`
- `/mission-control`
- `/signals`
- `/workforce-trust`
- `/intent-verification`
- `/autonomy-governance`
- `/execution-passports`
- `/state-verification`
- `/trust-events`
- `/trustops`
- `/launch-control`

Redirect behavior:

- Public pages are not forced through auth.
- Missing session on protected user path redirects to login.
- Missing session on protected admin path clears admin state and redirects to login.
- Unverified email clears admin state and redirects to verify email.
- Non-allowlisted admin access clears admin state and redirects to the admin access-required flow.
- Missing admin verification cookie redirects to `/back-office?denied=1`.

The middleware short-circuits when public Supabase env is unavailable, which prevents build-time/prerender auth crashes.

## Replay And Receipt Routes

Replay and receipt routes are not public workflow data surfaces:

- `/replay/[id]` calls `supabase.auth.getUser()` server-side and redirects missing users to `/login?next=/replay/[id]`.
- `/trust/receipt/[id]` calls `supabase.auth.getUser()` server-side and redirects missing users to `/login?next=/trust/receipt/[id]`.
- `/verification/receipt/[id]` re-exports the guarded trust receipt page.
- `/trust/*` is also included in middleware protected user prefixes.

## Runtime Safety

Confirmed:

- Missing session is handled through redirects or `401` JSON responses.
- Expired session has a dedicated route and does not bypass middleware.
- Unverified email is blocked before protected pages render.
- Optional integrations do not bypass auth; they affect provider capability only.
- Turnstile is development-bypassable only when not in production; production requests fail safely when Turnstile is missing or invalid.
- No `.env.local` is tracked.
- Service role usage remains server-side; no `NEXT_PUBLIC_*SERVICE*` or `NEXT_PUBLIC_*SECRET*` exposure was found.

## Build

Required validation:

```bash
npm run build
```

Result to record after final validation:

- Production build passed.
- `git status` was reviewed after the build.
