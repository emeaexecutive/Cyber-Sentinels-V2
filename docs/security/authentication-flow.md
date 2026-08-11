# Authentication flow

## Boundary and components

Authentication uses Supabase Auth with `@supabase/ssr`. `middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `app/auth/callback/route.ts`, the login/verification/reset pages and admin authorization helpers form the current flow.

## Login and registration

`app/login/page.tsx` is a Client Component supporting password sign-in, sign-up and email OTP. Each auth action obtains a Turnstile token and verifies it server-side through `/api/auth/turnstile` before calling Supabase Auth. Controlled Preview qualification can use Cloudflare's official dummy pair only with explicit `TURNSTILE_MODE=preview-test`; the server rejects that mode and all recognised dummy credentials in Production. A development-auth path exists only when `NEXT_PUBLIC_ENABLE_DEV_AUTH=true` and the code's environment conditions allow it.

Successful OAuth/OTP callback requests reach `GET /auth/callback`. The handler requires a code, restricts redirects to safe local paths, calls `exchangeCodeForSession()` and redirects to the requested local destination or `/passport`.

## Session lifecycle and refresh

Supabase stores access and refresh material in `sb-*` cookies. Middleware creates an SSR client whose cookie adapter copies refreshed cookies to the response. Server and browser client wrappers intercept known invalid-refresh-token failures and avoid treating a missing session as a platform error.

Middleware validates protected requests with `auth.getUser()`. The root layout uses `getSession()` only to choose public/user/admin navigation chrome; it is not the authorization authority.

There is no application-owned JWT parser. JWT signature, expiry and refresh validation are delegated to Supabase; server authorization relies on `getUser()` rather than trusting decoded client claims.

## Email verification

Protected users without `email_confirmed_at` or `confirmed_at` are redirected to `/verify-email` with a safe next path. The verification page supports resend/status UX. Email verification is enforced before user or admin access.

## Logout

`GET` and `POST /api/auth/logout` record a replay-safe logout event when a user exists, call `auth.signOut()`, clear all `sb-*` cookies and the admin verification cookie, and redirect to `/login` with status 303.

## Protected routes

Middleware owns prefix-based protection:

- user routes require a validated, email-confirmed Supabase user;
- admin, internal-tooling and experimental routes additionally require admin configuration, allowlisting and an admin verification cookie;
- public exceptions include the public Trust Center story, selected demos and public verification receipts; and
- protected responses receive `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.

Layouts are not independent authorization boundaries. Pages and handlers with consequential access also use `requireAdminPageAccess`, `requireAdminApiAccess`, `requireAuthenticatedUser` or direct validated-user checks.

## Roles and admin handling

General RBAC is not implemented as a central role/permission service. User access is session based. Admin access is a two-stage application gate:

1. the authenticated email must appear in `ADMIN_EMAILS`; and
2. `POST /api/admin/access` must validate `ADMIN_ACCESS_CODE` and set the secure, HTTP-only, SameSite=Strict `cyber_admin_verified` cookie for eight hours.

Admin checks are audited where possible. Missing admin configuration fails closed, with `/back-office` allowed to render an explicit denial/configuration state.

## Enterprise, public and back-office flows

| Flow | Current behavior |
| --- | --- |
| Public | Public marketing, trust, legal, health and selected verification endpoints do not require a session. Public mutation handlers apply their own validation and, where implemented, Turnstile. |
| Authenticated | User-prefixed routes redirect to login, then email verification, and render inside the authenticated Trust OS shell. |
| Enterprise access | `/enterprise` is public. `/enterprise-access` accepts a public request with bot-protection support. Operational enterprise routes such as control-plane, readiness and compliance are classified as admin. The enterprise layout alone is not a guard. |
| Back Office | `/back-office` requires a valid session and allowlisted email, then renders the access-code gate until the admin cookie is present. Other admin routes redirect back on denial. |

## Gaps and risks

- Protection depends on manually maintained prefix lists.
- No centralized RBAC/ABAC model exists for non-admin roles.
- The root layout reads session state for navigation, so callers must not infer authorization from displayed chrome.
- MFA configuration helpers exist, but broad mandatory MFA enforcement is not demonstrated.
- Public API handlers require individual review because many intentionally have no session guard.
