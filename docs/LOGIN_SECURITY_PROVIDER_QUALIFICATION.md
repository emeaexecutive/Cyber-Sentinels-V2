# Login security fix and provider qualification follow-up

Investigation began 2026-09-29; release validation resumed 2026-10-02. This is a
bounded follow-up, not a new provider architecture audit.

## PR #112 closure

[PR #112](https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/112) merged normally
at 2026-09-29T17:09:43Z after CodeQL analysis/findings, secret scan, Production
verification and Docker qualification passed. Supabase Preview was skipped because
there were no SQL changes. Clean main was
`870e3cf886cfbdecd69bb0302bb07b9d45916d70`.

## Turnstile findings and fix

Reproduced in browser tests against the old application components:

- A security error banner survived a subsequent successful widget callback.
- Login replaced specific, controlled widget diagnostics with the generic banner.
- Lost verification/reset-email responses retained a potentially consumed token.
- Script-load polling cleanup returned from a DOM event handler was never invoked
  by React; callbacks from removed widgets could still publish errors or tokens.

The fix clears only security errors when a fresh token arrives, preserves mapped
widget messages, discards tokens after transport failures, and cancels polling and
callbacks when their widget is removed. Authentication/rate-limit errors remain
visible. Server Siteverify, hostname validation, rate limiting and fail-closed
submission are retained. Server logs now include existing sanitized provider error
codes, hostname and challenge timestamp, never the token or secret.

These are demonstrated application defects. The exact Cloudflare trigger behind
the user's original Production error is **unconfirmed**: the generic message alone
does not identify expiry, duplicate use, a blocked request or misconfiguration.

Production observations on 2026-09-29 used fresh Chrome and Edge contexts without
extensions, desktop 1440px and Chrome mobile viewport 390px. Login, Turnstile script
and frame loaded; no CSP violation or generic banner appeared. Visual inspection
showed an interactive human-verification checkbox. No valid token was obtained;
sign-in stayed disabled. Cloudflare's PAT request returned 401, which alone is not
proof that Turnstile failed. The DOM probe could not identify the checkbox inside
the protected widget; its screenshot is the relevant visual evidence.

Production lists public site-key and server-secret variable names, and a controlled
invalid-token POST reached Siteverify and returned HTTP 400 / INVALID_TOKEN. Its
runtime log confirmed expected hostname `www.cybersentinels.com`. This proves
negative validation, not a valid key pair or positive authentication. The Cloudflare
dashboard domain allowlist was inaccessible. An extension-only cause was not proved.
No key, dashboard setting, CSP exception or environment value was changed.

Actual normal password sign-in and a positive Production Siteverify response still
require an authorized person to complete the challenge and use their own account.
Local desktop/mobile success tests simulate only external verification/authentication
and therefore do not count as a real account sign-in.

References: [Cloudflare client error codes](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/),
[server validation and token lifetime](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[CSP requirements](https://developers.cloudflare.com/turnstile/reference/content-security-policy/).

## Real provider qualification and exact setup

No real Stripe Identity session/callback, OpenGraph call or Judge.me delivery was
produced. None is classified TEST-SANDBOX EXERCISED. Existing local security and
canonical-boundary tests are evidence of code behavior only.

**Stripe Identity:** Production lists sensitive `STRIPE_SECRET_KEY` and
`STRIPE_IDENTITY_WEBHOOK_SECRET`. The 2026-10-02 metadata refresh also lists the
webhook secret for Preview, but the API key remains Production-only; no usable
credential pair is available locally or in Preview. Secure ephemeral execution could not export the sensitive
Production values. Their presence does not prove test mode, validity or Identity
eligibility. No secret was downgraded, printed or extracted through an endpoint.
The owner must provision an Identity-enabled, authorized test account and its test
key plus matching own-account Identity snapshot webhook secret to an isolated
Preview/test environment. Use `/api/stripe/identity/webhook`, an authenticated
isolated tenant/subject, the existing session creation flow and Stripe's hosted
predefined test completion. A genuine callback and authoritative session fetch must
prove account/environment/request/enterprise/subject binding before qualification.
Existing replay/freshness/retry limits remain as recorded in
[the Stripe qualification record](providers/STRIPE_IDENTITY_QUALIFICATION.md).

**OpenGraph:** No credential/App ID was available. Create or use an owner-authorized
OpenGraph.io account and obtain its App ID. Proposed provisioning name:
`OPENGRAPH_APP_ID`, server-only sensitive configuration in this project's Vercel
Preview/test environment. This name is **not yet consumed by a runtime transport**;
setting it alone does not enable execution. Trusted tenant mapping and a reviewed
transport that confines DNS, redirects and rendered subresources are still required.
The existing canonical boundary intentionally returns NOT_CONFIGURED. See
[OpenGraph authentication](https://www.opengraph.io/docs/concepts/auth).

**Judge.me:** Install Judge.me Reviews in an owner-controlled Shopify development
store; obtain the private token from Settings > Integrations > View API tokens.
Proposed sensitive Preview/test provisioning names are `JUDGEME_SHOP_DOMAIN` and
`JUDGEME_PRIVATE_API_TOKEN`. For an OAuth installation instead, proposed names are
`JUDGEME_SHOP_DOMAIN`, `JUDGEME_OAUTH_CLIENT_ID`, `JUDGEME_OAUTH_CLIENT_SECRET` and
`JUDGEME_ACCESS_TOKEN`. These are **not wired runtime configuration**. Direct hooks
use the private token for signature verification; OAuth hooks use the application
client secret. A separate invented webhook secret is not appropriate. Register
real test hooks only after trusted installation/tenant/subject/product mappings,
an ingestion route and durable replay/retry/freshness handling are wired. A public
widget token is insufficient. See [API setup](https://judge.me/help/en/articles/8409180-using-judge-me-api),
[OAuth setup](https://judge.me/help/en/articles/8283047-setting-up-oauth) and
[webhook verification](https://judge.me/help/en/articles/8299679-verifying-webhooks-from-judge-me).

## Canonical and outcome limits

All three remain evidence providers or independently governed execution targets.
Identity, identity integrity, policy and provider results do not grant authority.
Provider ALLOW does not replace Cyber Sentinels ALLOW; provider success does not
prove destination success. REVIEW and DENY do not execute. No second decision
engine or provider bypass was added.

Controlled fixtures exercise ALLOW with success/failure/no execution/contradiction,
REVIEW/DENY non-execution, receipt, replay and Trust Memory. There was no real
post-ALLOW external call or independent destination proof in this follow-up.
Provider-reported success without independent destination evidence may only be
classified PROVIDER OUTCOME ASSERTION ONLY. No live success receipt or Trust Memory
update is claimed here.

No new tables, migrations, API scopes, dependencies or hosted environment changes.
Only this fix branch's automatic Vercel deployment is disabled, following the
existing controlled release pattern.

## Validation

Local validation on 2026-10-02: full `npm test` passed 1,912 tests; the focused
provider/canonical suite passed 274; `test:auth-browser` passed 31, including 11
Turnstile/login browser regressions. The full suite includes 13 Turnstile
configuration/route tests. Hosted database lint returned no errors. The staged
redacted gitleaks scan found no leaks. Build/lint/typecheck and hosted CI results
must also be green before the normal merge and controlled Production release.
