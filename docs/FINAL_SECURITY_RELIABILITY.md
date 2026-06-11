# Final Security & Reliability Hardening

Cyber Sentinels is hardened for external pilot onboarding around runtime safety, auth integrity, upload safety, webhook integrity and graceful degradation. This pass does not add product systems or expand architecture.

## Hardened Areas

### Auth and sessions

- Auth callback redirects are constrained to local paths and fail back to `/login` with safe error codes.
- Missing or invalid callback codes do not expose Supabase errors or stack traces.
- Logout clears Supabase session cookies and the admin verification cookie.
- Middleware keeps public routes public, protects signed-in routes and enforces admin-only boundaries.
- Stale session handling records operational context when possible and returns safe responses.

### Security headers

Global response headers are configured in `next.config.mjs`:

- `Content-Security-Policy`
- `X-Frame-Options`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `Permissions-Policy`

Runtime validation now checks for these headers and reports missing headers as actionable warnings.

### Upload safety

- Evidence uploads require an authenticated user.
- Verification case identifiers must be UUIDs.
- Files are limited to 10 MB.
- Supported uploads are limited to PDF, PNG, JPG, JPEG and DOCX.
- MIME type and file extension must agree when MIME type is present.
- Failed storage writes return safe generic errors.
- Failed database writes after storage upload attempt storage cleanup.
- Signal and audit side-effect failures are monitored as warnings without forcing users to retry an already-recorded evidence upload.

### Stripe and billing

- Stripe webhook events require signature validation through Stripe's webhook verifier.
- Missing webhook signatures return a safe 400 response.
- Missing Stripe configuration returns a safe disabled-state response instead of crashing.
- Checkout and subscription webhooks update billing customer, subscription and usage-limit state server-side.
- Webhook metadata inconsistencies are recorded through sanitized operational monitoring.

### Runtime reliability

- Runtime validation distinguishes `READY`, `CAUTION` and `BLOCKED`.
- Protected Supabase endpoints returning 401 or 403 are treated as reachable but protected.
- Optional integrations remain warning-only when missing.
- Validation checks use bounded fetch timeouts.
- Raw provider errors are not returned to users.

### RLS and permissions

Audited boundaries:

- Admin pages and admin APIs remain protected by middleware and server-side admin checks.
- Workspace, evidence, governance and replay records are accessed through authenticated or service-role server contexts.
- Service role usage remains server-side only through server-only modules.
- Evidence upload enforces ownership for passport-backed verification cases unless the actor is an allowlisted admin.

Known permission assumptions:

- Supabase RLS policies remain the source of truth for workspace isolation.
- Existing broad pilot policies should be reviewed before a larger multi-tenant production rollout.
- Service-role runtime validation requires `SUPABASE_SERVICE_ROLE_KEY` and is warning-only when unavailable locally.

## Operational Monitoring

This pass adds a lightweight privacy-safe monitoring helper in `lib/operational-monitoring.ts`.

Purpose:

- capture auth, upload, webhook and runtime-validation issues;
- keep metadata sanitized and bounded;
- avoid logging secrets, raw provider responses or stack traces;
- provide a compatible path for a later Sentry integration without adding a network dependency during pilot lockdown.

Sentry remains the preferred production-grade option when dependency installation and project configuration are intentionally scheduled.

## Graceful Degradation

Required:

- Supabase URL and anon key for auth and browser-safe clients.
- Supabase service role key for server-side validation, operational checks and trusted background updates.

Optional and warning-only when missing:

- Stripe
- OpenAI
- World ID
- email provider
- provenance placeholders and external enrichment APIs

Core trust, evidence, governance, receipt and replay workflows must not depend on optional integrations.

## Remaining Pilot Risks

- Local builds without Supabase environment variables may show navigation/auth warnings during static generation.
- Full RLS confidence depends on the deployed Supabase policy state, not only application code.
- Evidence file scanning remains review-oriented; this pass validates type/size gates but does not add malware scanning.
- Sentry is not installed in this pass; sanitized server monitoring is active as the privacy-safe equivalent.
- Browser-level CSP may require future tuning if new third-party scripts or embedded providers are introduced.

## Pilot Readiness Position

The platform is hardened for controlled pilot usage when:

- required Supabase environment variables are configured;
- Stripe is either configured or intentionally disabled;
- optional AI, World ID and email integrations are treated as warnings;
- admin access is restricted to allowlisted operators;
- runtime validation and deployment readiness are reviewed before onboarding.
