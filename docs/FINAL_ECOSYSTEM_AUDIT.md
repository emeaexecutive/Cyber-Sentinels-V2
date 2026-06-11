# Final Ecosystem Audit

Date: 2026-06-11

## Stable Systems

- Public pages audited: `/`, `/platform`, `/pricing`, `/enterprise`, `/enterprise-access`, `/enterprise/hiring-security`, `/why-now`, `/help`, `/demo`, `/security`, `/privacy`, `/terms`.
- Pricing source of truth is `lib/billing/plans.ts` with Free, Starter, Professional, Premium and Enterprise tiers using `verification workflows`.
- Supabase client separation is intact: browser code uses public anon configuration, while service-role clients are imported from server-only modules and used only in server routes/pages/libraries.
- Protected admin pages and `/api/admin/*` stay behind middleware and admin allowlist checks.
- Core workflow paths are represented in code: Trust Case -> Evidence Upload -> Governance Review -> Timeline -> Verification Receipt -> Replay.
- Hiring workflow paths are represented in code: Candidate Verify -> Interview Session -> Risk Event -> Governance Review -> Hiring Trust Report.
- `/admin/runtime-validation` reports `READY`, `CAUTION` or `BLOCKED`; optional provider gaps remain warnings.
- `/api/health` and `/api/status` provide lightweight runtime status responses.

## Fixes Applied

- Pricing bullets were aligned to the pilot structure and public copy now uses `verification workflows`, not `uses`.
- Stripe checkout and customer portal routes now redirect to waitlist/billing-coming-soon paths when Stripe env vars are missing instead of exposing a broken checkout path.
- Removed noisy normal-flow debug logging from middleware, layout and billing surfaces.
- Runtime validation now checks every requested public page and all named operational tables when service-role access is configured.
- Enterprise access intake no longer logs submitted field keys during normal requests.

## Warnings

- Optional integrations may be disabled in pilot environments: Stripe, OpenAI and World ID are warning states unless configured.
- Supabase live table validation depends on server-side `SUPABASE_SERVICE_ROLE_KEY`; without it, runtime validation records table checks as warnings.
- Status probes intentionally treat Supabase `401` and `403` responses as reachable but protected.
- Billing still uses legacy internal field names such as `passport_limit`; public-facing pricing and billing copy now presents those as verification workflow limits.

## Blockers

- No code-level pilot blocker remains from this audit.
- A deployment can still be `BLOCKED` if required Supabase public env vars are missing or protected routes fail runtime validation.

## Missing Env Vars To Check

- Required core: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Optional billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`.
- Optional AI governance: `OPENAI_API_KEY`.
- Optional World ID: `WORLD_ACTION`.

## Disabled Integrations

- Stripe is safely disabled when billing env vars are absent and users are sent to waitlist/billing-coming-soon paths.
- OpenAI governance returns an unavailable response or redirects back with a missing-key code when `OPENAI_API_KEY` is absent.
- World ID verification is optional and can remain disabled until provider configuration is complete.

## Remaining Pilot Risks

- Apply all Supabase migrations in order before pilot data is collected.
- Verify production env vars in Vercel after deployment, then run `/admin/runtime-validation`.
- Run one manual pilot path for trust case, evidence upload, governance decision, receipt and replay.
- Run one manual hiring path for candidate verification, interview session, risk event and hiring report.
