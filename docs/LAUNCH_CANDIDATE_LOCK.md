# Launch Candidate Lock

Locked on 1 July 2026 from the clean `main` checkout.

This release candidate is limited to stabilization, credentialed validation and deployment checks. New product concepts, routes, tables and speculative claims are outside the launch-candidate scope.

## Build status

- The launch-candidate production build passed on Next.js 15.5.18.
- The production build compiled, completed TypeScript validity checks and generated all 147 static pages.
- `npx tsc --noEmit` also passed before the production build.

## Supabase Preview status

- Supabase client, authentication, middleware and owner-scoped RLS migration sources are present.
- Sensitive admin routes retain middleware and server-side allowlist checks.
- Preview database migration state cannot be proven from the repository alone.
- Apply and verify outstanding migrations in Supabase Preview without weakening or duplicating policies.

## Auth status

- Sign in, Create account, Confirm Password, Magic link and Forgot password are visible.
- Email verification guidance and the discreet Administrative access link remain present.
- Authenticated verification routes are middleware protected.
- Admin access requires a Supabase session, configured allowlist membership and verified admin access.

## Provider status

Provider presentation remains explicit:

- **Live:** supported path enabled and configured; not an accuracy or health guarantee.
- **Simulated:** controlled test data only.
- **Awaiting credentials:** required environment values are absent.
- **Disabled:** fails safely without provider evidence.

Production credentials and provider responses require manual runtime verification.

## Domain readiness

- Canonical production URL: `https://www.cybersentinels.com`.
- `.env.example`, site metadata and redirect helpers use the canonical domain.
- No public-facing Vercel preview URL is part of the release candidate.
- The protected readiness page reports domain setup as ready only when the configured public URL matches the canonical production URL.

## Security and trust page status

- `/security`, `/trust`, `/methodology`, `/status/verification` and `/trust-center` compile.
- Security headers, Turnstile support and production-domain handling remain in the existing production-readiness baseline.
- Trust language remains evidence-first, explainable and human-governed.

## Replay status

- Replay Timeline surfaces retain chronology, trust-state transitions, provider evidence summaries, reviewer activity and authorization lineage.
- Missing evidence uses explicit fallback language rather than creating evidence.
- Replay is operational evidence, not an autonomous truth verdict.

## Governance status

- Governance Review surfaces retain reviewer attribution, escalation ownership and evidence references.
- Admin governance tools remain protected.
- Human review remains authoritative for sensitive workflow decisions.

## Validation lab status

- `/admin/test-lab` compiles and remains protected by middleware and server-side admin checks.
- Simulated, provider-backed, rule-based and unvalidated capabilities remain distinguishable.
- No accuracy percentage is presented without validated benchmark evidence.

## Known limitations

- Production authentication, email delivery and session persistence require credentialed browser tests.
- Provider connectivity depends on production credentials and external service availability.
- Supabase Preview and production migration state require dashboard or CLI verification.
- Simulated evidence does not validate biometric, deepfake or fraud-detection accuracy.
- The repository build cannot prove Cloudflare, DNS, Vercel environment or Supabase dashboard configuration.

## Next manual tests

1. Confirm Supabase Preview migrations apply without missing-column or duplicate-policy errors.
2. Test signup, verification email, password login, magic link, reset password, session persistence and logout.
3. Confirm the canonical domain and Supabase callback complete without mixed content or redirect drift.
4. Check each provider state in the protected integration page with production environment values.
5. Run one candidate workflow from verification through Governance Review, Replay Timeline and Verification Receipt.
6. Run the protected validation lab and confirm simulated evidence is clearly labelled.
7. Confirm a non-allowlisted user cannot access admin, governance or internal dashboards.
