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

## Production

Set all required variables in the Vercel Production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAILS`
- `ADMIN_ACCESS_CODE`

Production Supabase configuration should include the production callback URL:

- `${NEXT_PUBLIC_SITE_URL}/auth/callback`

## Preview

Set the same required variables in the Vercel Preview environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAILS`
- `ADMIN_ACCESS_CODE`

For preview deployments, either set `NEXT_PUBLIC_SITE_URL` to the intended preview URL or use the stable preview domain. Supabase auth redirects must include the preview callback URL before auth-dependent preview testing.

## Runtime Validation

Environment access is centralized in `lib/env.ts`.

- Missing required variables are logged server-side with the operational context and variable names only.
- Secret values are never logged.
- Server-only secrets remain in server utilities and API routes.
- Public Supabase variables may be used by server-rendered Supabase clients because they are public-safe by design.

## Deployment Health

The `/status` page exposes public-safe health information only:

- app online
- Supabase connected
- auth available
- storage available

It does not expose environment values, service-role keys, bucket names beyond operational labels, user records or database row data.

