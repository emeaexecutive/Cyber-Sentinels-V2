# Configuration

## Sources

Configuration is distributed across `.env.example`, `lib/env.ts`, provider-specific config modules, `next.config.mjs`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `middleware.ts`, `package.json` and deployment-provided Vercel variables.

## Core variables

| Variable | Class | Requirement and use |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Runtime-required with anon key for authentication/data clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Runtime-required with URL. RLS remains the data boundary. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Required only for service-role/admin persistence paths. Server-only. |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` | Public | Canonical redirects, links, validation and integrations; the former is required by selected helpers. |
| `ADMIN_EMAILS` | Sensitive configuration | Required for admin allowlisting. |
| `ADMIN_ACCESS_CODE` | Secret | Required for the second admin gate. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Turnstile widget key. |
| `TURNSTILE_SECRET_KEY` | Secret | Server challenge verification. |

## Provider and integration variables

- Hopae: `HOPAE_ENABLED`, environment/base URL/issuer, client ID, client secret, webhook secret, provider ID, callback tolerance, timeout and retry count.
- World ID: public app ID, action and relying-party ID. Current server exchange is not implemented.
- Stripe: secret key, publishable key, webhook secret and Pro monthly price ID.
- OpenAI: API key plus governance/draft model selection. A key does not prove approved provider controls.
- ORI: `ML_RISK_ENABLED` and `ML_RISK_MODE`; supported operating modes remain off, shadow and advisory.
- ATS: provider-specific endpoint, credential, webhook secret and explicit `ATS_<PROVIDER>_API_VERIFIED` flags. A credential alone does not select or verify a provider.
- Optional provider registry keys include Persona, Entrust, Onfido and device-risk variables; their presence does not make placeholder adapters live.

## Feature and operational flags

| Flag | Default/effect |
| --- | --- |
| `NEXT_PUBLIC_ENABLE_DEV_AUTH` | Example default false; development-only authentication behavior. |
| `ENABLE_DEMO_SEED` | Must equal true for demo seed execution. |
| `BETA_MODE` | Defaults enabled unless explicitly false. |
| `PILOT_MODE` | Defaults enabled unless explicitly false. |
| `SUPABASE_AUTH_MFA_TOTP_ENABLED` | Enables the TOTP capability check; broad enforcement is separate. |
| `AI_PROVIDER_ENTERPRISE_CONTROLS_VERIFIED` | Explicit evidence flag for AI provider policy. |

Deployment metadata may come from `VERCEL_ENV`, Git/deployment timestamps and commit SHA variables. `NODE_ENV` and `NEXT_PHASE` control framework/runtime behavior.

## Build configuration

- Next.js strict mode is enabled.
- Permanent redirects consolidate selected legacy routes.
- Global CSP, HSTS, frame, content-type, referrer and permissions headers are configured.
- TypeScript is strict, no-emit and uses bundler resolution with `@/*` aliasing.
- ESLint uses Next core-web-vitals and TypeScript rules.
- Tailwind scans `app`, `components` and `lib`; PostCSS runs Tailwind and Autoprefixer.
- `package.json` defines `validate` as lint, typecheck, complete tests and production build.

## Gaps

- `.env.example` documents `STRIPE_PRO_PRICE_ID`, while live helpers require `STRIPE_PRO_MONTHLY_PRICE_ID`.
- Several referenced variables and dynamic ATS settings are absent from `.env.example`.
- `.env.example` contains a populated admin email and placeholder access code; examples should avoid personal defaults and must never be deployed unchanged.
- No single typed schema validates every variable at startup; validation is context-specific.
- The repository does not pin Node/npm through `engines`, `packageManager`, `.nvmrc` or `.node-version`.
