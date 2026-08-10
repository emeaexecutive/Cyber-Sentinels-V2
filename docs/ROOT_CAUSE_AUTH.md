# Authentication root cause and closure evidence

Date: 2026-08-10
Production inspected: `https://www.cybersentinels.com`
Production mutation: none

## Reproduced state

A direct unauthenticated request to `https://www.cybersentinels.com/login` returned HTTP 200 from the deployed Next.js application. The rendered page loaded the Cloudflare Turnstile script and the deployed login bundle contained a non-empty public Turnstile site key. The same bundle contained the reported `No active session found.` and `Security check is temporarily unavailable.` states.

`No active session found.` is not an authentication error. It is rendered after `supabase.auth.getSession()` succeeds with no user in a clean browser context. It accurately describes a new, signed-out browser.

## Exact Turnstile failure

The login client obtains a Turnstile token and posts it to `/api/auth/turnstile`. The server route called:

```ts
verifyTurnstileToken(token, getClientIp(req))
```

The verifier intentionally requires an expected hostname before accepting a successful Cloudflare response. When Cloudflare returned `success: true`, `verifyTurnstileToken` saw no expected hostname and converted the result to `provider_error`. The route mapped that reason to HTTP 503 and the client displayed `Security check is temporarily unavailable.`

This was deterministic application logic, not an inference about Cloudflare availability. The fix passes `new URL(req.url).hostname`, preserving hostname enforcement for Production, Preview and localhost instead of disabling the security check.

## Supabase session finding

PR #42 contained a separate valid Supabase SSR compatibility correction for `@supabase/ssr` 0.12.4 and `@supabase/supabase-js` 2.112.2. The newer cookie adapter supplies cache-control headers with cookie writes. The previous callback, middleware and logout boundaries discarded those headers. That could make cookie-bearing auth responses cacheable and undermine reliable session creation, refresh and logout behavior.

The isolated PR #42 commit was reconciled onto the current release branch. It does not fix the Turnstile hostname defect by itself.

## `/developers/api-keys` redirect

The redirect is an explicit `returnTo`, not the normal login default. The protected API-key page redirects unauthenticated visitors to `/login?next=/developers/api-keys`, and the login page safely preserves that same-origin path. It therefore occurs only when the user starts from the developer API-key workflow.

The previous normal login default was `/passport`. The canonical default is now `/operational-entities`, the shortest route into the real trust product. Explicit safe return paths, including the developer workflow, remain intact.

## Configuration boundary

- Production remains fail-closed when the Turnstile secret is missing or invalid.
- Development can continue without provider credentials; this bypass is limited to `NODE_ENV !== "production"`.
- Preview uses a Production-mode build and therefore requires a Preview Turnstile key/secret pair. Automated Preview browser qualification should use Cloudflare's documented test key pair or a Preview-domain key, never a global bypass.
- The product-proof branch Preview uses Cloudflare's official always-pass test pair and the dummy Siteverify response hostname as branch-specific Vercel overrides. A direct qualification request returned `example.com`; code permits only that observed value or Cloudflare's documented `localhost` example, and only when `VERCEL_ENV=preview`. The overrides keep client token generation and server Siteverify validation active, apply to no other branch, and are ignored by Production code.
- The client never receives the Turnstile secret.
- Diagnostics record only correlation ID, bounded reason code, result and hostname. Tokens, passwords, Supabase access/refresh tokens and private keys are not logged.

## Closure implemented

1. Hostname-bound Turnstile verification and safe correlation diagnostics.
2. Supabase SSR cookie/cache-header propagation from PR #42.
3. `/operational-entities` as the canonical normal post-login route.
4. A first-run action that creates only legitimate tenant/workspace, Operational Entity, policy and authority records. It creates no native evidence and no decision.
5. Existing native WebCrypto proof remains responsible for key generation, challenge response, manifest proof and evidence persistence.
6. Canonical transaction history now exposes a minimized authenticated JSON receipt download.
7. Playwright desktop/mobile coverage uses a disposable non-Production Supabase user and exercises login, session continuity, Agent Alpha initialization, native proof, ALLOW, a deliberate out-of-scope DENY, transaction history, Replay, Trust Memory, receipt, logout and returning-user retrieval.

## Qualification limitation

The in-app browser automation connection was unavailable during the initial diagnosis, so the approved standalone Playwright fallback captured fresh desktop and Pixel 7 Production login screenshots. Both requests returned HTTP 200, rendered the expected signed-out session state and loaded a Turnstile frame. The sandbox could not resolve Cloudflare's challenge subdomain, so no credential submission or successful Production login is claimed.

A complete authenticated journey, retained milestone screenshots and a live email-delivery click remain mandatory on the new protected Preview before release approval. Automated source/unit tests and Production page-load evidence are not substitutes.
