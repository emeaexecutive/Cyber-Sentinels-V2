# P0 Turnstile server-side audit — 19 October 2026

Status: application repair deployed to Staging; 16 hosted negative checks passed. Real human positive verification, native Supabase Auth protection and Cloudflare analytics remain open. This report supersedes the earlier login PASS as a statement of complete CAPTCHA enforcement. Earlier successful login proves one real challenge, not absence of alternate paths.

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

## Preview origin follow-up

A real hosted missing-token recovery probe returned 403 WRONG_ORIGIN before reaching verification. Preview Auth now selects the branch-scoped CYBER_SENTINELS_PUBLIC_ORIGIN, while Production retains its existing origin policy. Negative tests reject the Production hostname in Preview and the Staging hostname in Production. This is a code change only; no environment value changed. The first P0 build (2e59ce6) is superseded and must not receive the Staging alias.

Follow-up tests: 124 focused security checks, five recovery/login tests, 11 navigation browser checks and typecheck passed. Removal of the obsolete development bypass exposed an old source assertion requiring that bypass; it was replaced with an assertion forbidding bypass/skipped-success behavior.

## Deployed candidate and hosted evidence

- Exact application SHA: `ce2a28f7abbc3d45464f511e3119342b80280533`.
- Preview deployment: `dpl_72j6dXKotUobQrJ6UxV6Zpo18QNv`, serving `https://staging.cybersentinels.com`.
- Unique URL: `https://cyber-sentinels-v2-lo8e05ykr-keith-speres-projects.vercel.app`.
- Runtime readiness HTTP 200 confirms exact SHA, Staging project `agpyhygpfmppjkxwcpac`, valid browser/server credential binding and `productionProjectActive: NOT_ACTIVE`.
- Original Production deployment remains `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`, SHA `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`. No Production configuration, database or account changes performed.
- Final full suite on candidate: **2,171 passed, zero failures/skips**; 124 focused checks are included, not additive. All 31 Auth browser checks passed separately. Typecheck and lint passed; lint reports warnings only (mostly existing local harnesses).
- CI [verification and Docker](https://github.com/emeaexecutive/Cyber-Sentinels-V2/actions/runs/39275089014), [CodeQL](https://github.com/emeaexecutive/Cyber-Sentinels-V2/actions/runs/39275089096) and [secret scan](https://github.com/emeaexecutive/Cyber-Sentinels-V2/actions/runs/39275088944) passed. Supabase Preview is skipped; no migration or branch operation is inferred from it.
- Real hosted window: **2026-10-19 15:12:28?15:13:17 UTC**. Four Auth operations and three public submission routes each reject missing/invalid tokens (14 requests). Two further requests use valid synthetic login credentials with missing/invalid tokens; both reject without session cookies or a changed last-sign-in timestamp.
- Before/after matching record counts: Auth users 0?0, waitlist 0?0, enterprise requests 0?0. This asserts persistence for the negative-test address, not global absence of concurrent traffic. External email delivery is not independently observed; local integration tests assert no email operation is called on failure.
- Runtime logs correlate all four Auth operations to `missing_token` / `invalid_token`, with the required action logged and no token, secret, email or password.
- An actual SSR SDK test with mocked network also confirms the server credential stays out of returned user sessions and written cookies. This is not hosted/provider evidence.

Private evidence is preserved under `C:/Users/emeae/Documents/CyberSentinels/ProductionBackups/staging-420-20261012/turnstile-p0-20261019/`: `deployment-readiness.json`, `hosted-negatives.json`, `existing-fixture-negative.json`, `hosted-negative-runtime-logs.md`, and the named test logs. Fixture credentials remain outside Git and CI.

One new unapproved synthetic Auth fixture is retained only for the pending real human login. It has no administrator or tenant grant. Cleanup remains pending: after the human test, revoke its sessions and delete that fixture, verify deletion, and record the outcome. Previously cleaned fixtures remain deleted. No new configuration overrides were installed.

STAGING_GO = NO ? real positive login for this action-bound candidate, native Auth CAPTCHA coverage and Cloudflare analytics are unverified. The native Auth missing-token probe reached credential validation; do not claim complete bypass closure.
PRODUCTION_GO_NO_GO = NO_GO ? no Production promotion authorized; prior release gates also remain applicable.

Owner steps: finish the real login using the restricted local instruction file; enable/confirm native Turnstile under Staging Supabase Authentication ? Bot and Abuse Protection using the matching widget secret (never send it in chat); provide the Staging widget's token-validation analytics for the UTC window above and the subsequent human test. No connected Cloudflare browser or API access was available to independently read that dashboard.

## Owner follow-up: native CAPTCHA and browser access (16:03 UTC)

The owner enabled Staging Supabase Auth CAPTCHA. Independent live probes now verify that **both missing and invalid native CAPTCHA tokens return HTTP 400 `captcha_failed`**, including when supplied with valid credentials for the isolated synthetic fixture. The fixture's last-sign-in timestamp remains unchanged. This supersedes the earlier missing-token `invalid_credentials` finding for the tested password-grant path. It does not prove action/hostname policy equivalence on every native Auth path.

The owner reported ?We couldn't sign you in. Please try again.? No matching human Siteverify success was found in the retained deployment logs, and the fixture has no last sign-in. An unauthenticated request reproduces the same frontend error via **Vercel HTTP 401, `Protected by Vercel Authentication`**, before application execution. The authorized Staging test transport reaches the application and receives its expected HTTP 400 `invalid_token`. Vercel protection is a reproducible explanation, not a claimed correlation to the individual human request. No protection or configuration was disabled or changed.

The owner was asked to open a fresh login URL, complete Vercel authentication if prompted, then repeat the real synthetic login and provide the time. Cloudflare analytics are reportedly available in the owner's dashboard, but there is still no connected browser surface; actual validation counts/time range have been requested, not assumed.

Evidence: private `native-captcha-and-protection-20261019.json`, timestamp 16:02:56 UTC. Original native probe evidence is preserved. Application SHA remains `ce2a28f7abbc3d45464f511e3119342b80280533`; this follow-up makes no application or deployment change. Synthetic fixture cleanup remains pending the human test. STAGING_GO remains NO; Production remains unchanged and NO_GO.
