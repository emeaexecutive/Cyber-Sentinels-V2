# Environment Setup

## Purpose

Cyber Sentinels requires explicit environment configuration for Vercel and Supabase. Missing runtime variables should be treated as deployment configuration failures, not silent fallbacks.

## Required Variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public + server runtime | Supabase project URL used by browser, server and middleware clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public + server runtime | Supabase anonymous key used for browser auth and public-safe server probes. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Privileged Supabase operations such as enterprise access intake, storage health and demo seeding. |
| `NEXT_PUBLIC_SITE_URL` | Public + server runtime | Canonical deployed site URL for redirects, health metadata and Supabase auth callback setup. |
| `ADMIN_EMAILS` | Server + middleware | Comma-separated admin email allowlist. |
| `ADMIN_ACCESS_CODE` | Server only | Admin step-up access code. Never expose this in client code or logs. |
| `STRIPE_SECRET_KEY` | Server only | Stripe API key for Checkout and Customer Portal session creation. |
| `STRIPE_WEBHOOK_SECRET` | Server only | Stripe webhook signing secret for event verification. |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Server only | EUR Stripe recurring Price ID used for the Pro tier Checkout session. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Optional public Stripe key if client-side Stripe components are added later. |

## Production

The canonical production origin is:

- `https://www.cybersentinels.com`

Set both public URL variables to that exact HTTPS origin without a trailing
slash:

- `NEXT_PUBLIC_SITE_URL=https://www.cybersentinels.com`
- `NEXT_PUBLIC_APP_URL=https://www.cybersentinels.com`

Set all required variables in the Vercel Production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `ADMIN_EMAILS`
- `ADMIN_ACCESS_CODE`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`

Production Supabase configuration should include the production callback URL:

- `https://www.cybersentinels.com/auth/callback`

Set the Supabase Site URL to `https://www.cybersentinels.com`. Keep preview
callback origins separate and explicitly allowlisted; do not use a changing
Vercel preview URL as the production Site URL.

## Preview

Set the same required variables in the Vercel Preview environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAILS`
- `ADMIN_ACCESS_CODE`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`

For preview deployments, either set `NEXT_PUBLIC_SITE_URL` to the intended preview URL or use the stable preview domain. Supabase auth redirects must include the preview callback URL before auth-dependent preview testing.

## Runtime Validation

Environment access is centralized in `lib/env.ts`.

- Missing required variables are logged server-side with the operational context and variable names only.
- Secret values are never logged.
- Server-only secrets remain in server utilities and API routes.
- Public Supabase variables may be used by server-rendered Supabase clients because they are public-safe by design.
- Stripe secret and webhook variables are server-only and must never be used in client components.

## Deployment Health

The `/status` page exposes public-safe health information only:

- app online
- Supabase connected
- auth available
- storage available

It does not expose environment values, service-role keys, bucket names beyond operational labels, user records or database row data.
