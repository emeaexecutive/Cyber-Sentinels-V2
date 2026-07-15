# Deployment Checklist

Use this checklist for each design-partner environment. Repository inspection can prove code paths and documented controls; credentialed runtime checks must be completed in the target deployment.

## Environment variables and secrets

- [ ] Compare required names in `.env.example`, `lib/env.ts` and provider registries with the target environment.
- [ ] Store service-role, provider and webhook secrets in Vercel or the approved secret manager.
- [ ] Confirm no secret is exposed through `NEXT_PUBLIC_` unless intentionally public.
- [ ] Set build version, deployment timestamp and environment labels.
- [ ] Rotate temporary pilot credentials and record an owner and expiry date.

## Supabase

- [ ] Confirm production project URL and keys point to the intended tenant environment.
- [ ] Apply migrations in order and verify RLS is enabled on protected tables.
- [ ] Test tenant isolation with two real accounts and denial cases.
- [ ] Test email verification, callback allowlists, session expiry and admin denial paths.
- [ ] Confirm private evidence storage, retention and backup ownership.

## Vercel and Cloudflare

- [ ] Confirm production domain, redirect URLs, build command and Node version.
- [ ] Verify Vercel environment separation for development, preview and production.
- [ ] Confirm Cloudflare DNS/proxy/TLS mode and Turnstile keys where enabled.
- [ ] Test security headers, cache exclusions for authenticated routes and rollback procedure.

## Providers and webhooks

- [ ] Add provider credentials server-side and run a real health check.
- [ ] Confirm purpose, allowed data, timeout, error isolation and normalized response mapping.
- [ ] Validate webhook signatures, timestamp tolerance, replay protection and idempotency.
- [ ] Retain one successful and one failed test with no secret values in evidence.

## Rate limiting and operational controls

- [ ] Exercise authentication, verification, webhook and developer API rate limits.
- [ ] Verify session expiry, sign-out and revoked-access behavior.
- [ ] Confirm audit logging, queue failure visibility, database checks and alert ownership.
- [ ] Confirm Replay and Trust Memory failures cannot be reported as complete lifecycle success.

## Release gate

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Credentialed deployment smoke test completed
- [ ] Seven-minute demo rehearsed with capability labels visible
- [ ] Design-partner acceptance and remaining blockers signed off
