# EPIC 19.1 Baseline

Generated: 2026-07-23
Repository: `https://github.com/emeaexecutive/Cyber-Sentinels-V2.git`

## Git and runtime

| Item | Evidence |
|---|---|
| Starting branch | `main` |
| Safety branch | `epic-19-enterprise-production-rc1` |
| Starting commit | `7df930298d153cf20d8a6e4bd2ff5188432e18df` |
| Audited code commit | `b86baa3` |
| Default branch | `main` (`origin/HEAD`) |
| Initial state | Dirty: 14 modified files and substantial untracked EPIC 19/release work |
| Required runtime | Node `22.x` from `.node-version`, `.nvmrc`, and `package.json` |
| Initial shell runtime | Node `26.1.0`, npm `11.13.0` |
| Validation runtime | Node `22.23.1`, npm `11.13.0` |

The existing dirty work was preserved on the safety branch before edits. No machine-wide Node installation was changed.

## Platform inventory

| Item | Count or version |
|---|---|
| Next.js | `15.5.21` after security patch update; started at `15.5.20` |
| React / React DOM | `19.0.0` |
| `@supabase/supabase-js` | declared `^2.48.1`, installed `2.105.4` |
| `@supabase/ssr` | `0.5.2` |
| Application page routes | 245 source `page.*` files |
| API routes | 183 source `route.*` files |
| Production build static pages | 183 |
| Database migrations | 65 |
| Test files | 68 |
| Aggregate test scripts | 40 scripts invoked by `npm test` |
| GitHub Actions workflows | 1: `.github/workflows/production-verify.yml` |

## Vercel

- Linked project: `cyber-sentinels-v2`
- Project ID: `prj_7v7vbNXHaf7gfAqYjGxRMQEB8FAr`
- Owner: Keith Speres' projects
- Framework: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Output: `.next`
- Project setting: Node `24.x`
- Current production application functions: Node `22.x`
- Current production middleware: Node `24.x`
- Production deployment inspected: `dpl_Bj7Xj4NPKfZEoZZLMGJMQRSNbKHc`, Ready
- Current deployed commit from `/api/ready`: `7df930298d153cf20d8a6e4bd2ff5188432e18df`

The mixed Node runtime is a release blocker because EPIC 19.1 requires Node 22.x consistently.

## Production domains found

- `https://www.cybersentinels.com` — canonical
- `https://cybersentinels.com` — 308 redirect to canonical
- `https://cyber-sentinels-v2.vercel.app`
- `https://cyber-sentinels-v2-keith-speres-projects.vercel.app`
- `https://cyber-sentinels-v2-git-main-keith-speres-projects.vercel.app`
- External allowlists include Supabase, Stripe, OpenAI, and Cloudflare Turnstile endpoints.

## Environment-variable names referenced

Values were neither recorded nor printed.

```text
ADMIN_ACCESS_CODE
ADMIN_EMAILS
AI_GOVERNANCE_PROVIDER
AI_PROVIDER_ENTERPRISE_CONTROLS_VERIFIED
ALLOW_PAID_PROVIDER_LOAD_TEST
APP_URL
ATS_WEBHOOK_SECRET
BETA_MODE
BUILD_VERSION
CONSENT_COOKIE_SECRET
CONSENT_DEFAULT_ENTERPRISE_ID
CONSENT_REGION_PROFILE
DEPLOYED_BUILD_VERSION
DEPLOYMENT_TIMESTAMP
ENABLE_DEMO_SEED
HOPAE_API_BASE_URL
HOPAE_CALLBACK_TOLERANCE_SECONDS
HOPAE_CLIENT_ID
HOPAE_CLIENT_SECRET
HOPAE_CONNECT_ISSUER
HOPAE_ENABLED
HOPAE_ENV
HOPAE_ENVIRONMENT
HOPAE_LIVE_REDIRECT_URI
HOPAE_PROVIDER_ID
HOPAE_TEST_SIGNING_SECRET
HOPAE_WEBHOOK_SECRET
IMPORT_VALIDATION_FIXTURES
LOAD_CONCURRENCY
LOAD_SAMPLE_COUNT
LOAD_SCENARIO
LOAD_TEST_SESSION_COOKIE
NEXT_PHASE
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_ENABLE_DEV_AUTH
NEXT_PUBLIC_GOOGLE_CONSENT_MODE_ENABLED
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_TURNSTILE_SITE_KEY
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
NODE_ENV
OPENAI_API_KEY
OPENAI_DRAFT_MODEL
OPENAI_GOVERNANCE_MODEL
PILOT_MODE
RUN_DEPLOYED_SECURITY_TESTS
RUN_HOPAE_LIVE_TESTS
RUN_LOAD_TESTS
RUN_RLS_TESTS
SECURITY_HASH_SECRET
SECURITY_TEST_BEARER_TOKEN
SECURITY_TEST_OPERATOR
SECURITY_TEST_RATE_LIMIT_ATTEMPTS
SECURITY_TEST_RATE_LIMIT_URL
STAGING_BASE_URL
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_AUTH_MFA_TOTP_ENABLED
SUPABASE_SERVICE_ROLE_KEY
TRUST_API_KEY
TURNSTILE_SECRET_KEY
TURNSTILE_SITE_KEY
VERCEL_DEPLOYMENT_TIMESTAMP
VERCEL_ENV
VERCEL_GIT_COMMIT_SHA
VERCEL_PROJECT_PRODUCTION_URL
```
