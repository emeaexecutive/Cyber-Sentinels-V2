# P0 Turnstile server-side audit — 19 October 2026

Status: application repair tested locally; hosted candidate verification and native Supabase Auth protection remain open. This report supersedes the earlier login PASS as a statement of complete CAPTCHA enforcement. Earlier successful login proves one real challenge, not absence of alternate paths.

## Findings and repair

The browser previously verified a token at `/api/auth/turnstile`, then independently called Supabase Auth. A caller could omit the first request. `/verify-email` also called Auth resend directly. The shared verifier did not enforce action or challenge age and permitted a development missing-secret bypass.

The new `/api/auth/submit` endpoint performs real Siteverify before creating an Auth client or executing password login, signup, resend or magic-link operations. Browser forms no longer call those Auth methods directly. The dedicated server-only Auth client uses the server service credential for normal Auth operations (not administrative user creation); this prevents a second native CAPTCHA check from consuming the already-used token. It retains SSR/PKCE cookies and never returns the service credential. Only the resulting user's session is returned with no-store caching. Magic-link requests are restricted to existing accounts.

Missing/malformed/oversize tokens, missing configuration, unsuccessful/malformed provider responses, provider/network errors, wrong hostname/action and stale/future timestamps fail closed. Tokens are checked individually without success caching or retries; Cloudflare's single-use enforcement rejects replay. Real timestamp limit: 300 seconds, allowing at most 30 seconds of future clock skew. Secrets and tokens are absent from diagnostic logs. Official test credentials remain restricted to explicitly configured Preview test mode; they do not qualify a live Staging challenge.

## Protected surface inventory

| Form / caller | Server endpoint | Required action | Protected side effect |
| --- | --- | --- | --- |
| `/login` password | POST `/api/auth/submit`, password | login | Auth session |
| `/login` create account | POST `/api/auth/submit`, signup | signup | Auth user / verification email |
| `/login` verification resend and `/verify-email` | POST `/api/auth/submit`, resend | signup | Verification email |
| `/login` magic link | POST `/api/auth/submit`, magic-link | login | Auth email |
| `/login?mode=forgot-password` | POST `/api/auth/password-reset/request` | password_reset | Recovery email / PKCE cookie |
| `/enterprise-access`, `/pro-waitlist` | POST `/api/enterprise-access` | enterprise_access | Demo request database/event/email work |
| Reusable WaitlistForm (currently no page imports) | POST `/api/waitlist` | waitlist | Waitlist database/event work |
| Legacy standalone diagnostic endpoint | POST `/api/auth/turnstile` | diagnostic | No authentication authorization or protected mutation |

Authenticated account updates, logout, verified email callbacks, administrator RPCs, machine API keys and signed webhooks use their existing authorization controls; they are not interactive Turnstile forms. No blanket CAPTCHA was added to machine integrations. Source search covers every TurnstileField and every password/signup/OTP/resend/recovery Auth invocation under app, components and lib.

## Evidence

- Full `npm test`: exit 0, 2,168 checks passed, no skips. Log `tmp/turnstile-p0-full-4.log`.
- Subsequent focused security suite: 123 passed, including all four Auth operations, database/email route side-effect assertions and a successful token followed by rejected replay. `tmp/turnstile-p0-focused-final2.log`.
- Actual UI with mocked external boundaries: 11 desktop/mobile browser checks passed. `tmp/turnstile-p0-browser-final.log`. These are not real Cloudflare executions.
- Affected final UI/source contracts: 14 passed. `tmp/turnstile-p0-affected-final.log`.
- Final `tsc --noEmit`: exit 0. `tmp/turnstile-p0-typecheck-final3.log`.
- Branch-only Preview environment scopes reconfirmed, including TURNSTILE_SECRET_KEY and Staging Supabase bindings; no values disclosed or changed.
- 15:00:53 UTC hosted native Auth probe: nonexistent synthetic account, no CAPTCHA token, returned `invalid_credentials` rather than a CAPTCHA denial. No account created. Private evidence `turnstile-p0-native-negative-20261019.json` in the existing restricted backup evidence directory.

## Remaining gates

1. Enable/verify native Turnstile protection for public Supabase Auth on **agpyhygpfmppjkxwcpac**. The application endpoint alone cannot prevent direct calls to the public Auth service. Native GoTrue CAPTCHA validates success, but does not establish the application's action-binding policy; do not claim equivalent action/hostname enforcement for direct native requests without separate proof or access restriction.
2. Deploy the tested branch candidate to Preview only, verify Staging binding and actual hosted missing/invalid negatives, then complete a real human action-bound login and inspect matching safe server logs.
3. Obtain Cloudflare widget token-validation analytics for the exact hosted test window. Earlier dashboard/widget setup and prior login are not substitute evidence.

Production remains unchanged. No migrations, merges, Production deployment, live account decisions or backup modifications are included. Application rollback does not change native Auth configuration. Full STAGING_GO and PRODUCTION_GO remain withheld until these gates and the existing release qualification requirements are met.
