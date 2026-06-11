# Integration Stability

Cyber Sentinels treats external integrations as workflow enhancers, not platform dependencies. Core trust workflows must remain operational when optional providers are absent, slow or returning invalid responses.

## Required Integrations

### Supabase

Supabase is required for authentication, database records, storage access and operational workflow continuity.

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Operational expectations:
- Public Supabase URL and anon key are required for auth/session routes and browser-safe clients.
- Service role access is server-side only through server-only modules.
- RLS-protected endpoints returning 401 or 403 are considered reachable but protected, not outages.
- Storage probes should distinguish inaccessible protected storage from platform failure.
- Runtime validation should mark missing required Supabase configuration as FAILURE/BLOCKED.

## Optional Integrations

### Stripe

Stripe supports billing, checkout, customer portal and webhook subscription updates.

If configured:
- Checkout creates a Stripe subscription session.
- Webhooks verify signatures before processing.
- Subscription and billing customer state are upserted server-side.

If not configured:
- Pricing remains available.
- Checkout redirects to the waitlist or billing-coming-soon flow.
- Billing is WARNING only and must not crash the platform.

### OpenAI

OpenAI supports AI-assisted governance explanation and summarization.

If configured:
- Requests use a bounded timeout.
- Invalid or empty provider responses fail safely.
- AI output remains assistive and does not replace human governance.

If not configured:
- Workflows remain fully operational.
- AI-assisted summaries stay disabled or use deterministic fallback copy.
- Runtime validation reports WARNING only.

### World ID

World ID supports optional proof-of-personhood workflows.

If configured:
- Proof handling remains server-side.
- Verification remains optional review context.

If not configured:
- The platform continues normal trust, hiring, evidence, receipt and replay workflows.
- World ID remains disabled or placeholder-only.
- Runtime validation reports WARNING only.

### Email Providers

Email delivery is optional. In-app notifications remain the operational source of record.

If configured:
- Email can support notification delivery and pilot communications.

If not configured:
- In-app notifications continue to operate.
- Email status is WARNING only.
- Workflows must not depend on outbound email delivery.

## Graceful Degradation Strategy

- Required Supabase failures can block deployment readiness.
- Optional integrations missing or disabled produce WARNING, not FAILURE.
- Protected 401/403 responses are treated as reachable and protected.
- Provider errors are logged server-side with safe summaries and never expose secrets.
- Public and API responses return generic operational errors rather than raw provider messages.
- Placeholder provenance and World ID paths must explain that they provide review context, not certainty.

## Runtime Assumptions

- Admin runtime validation distinguishes READY, WARNING and FAILURE in the UI.
- Deployment readiness may show CAUTION when optional integrations are missing.
- Status pages should not mark Supabase as down when protected endpoints reject unauthenticated probes.
- Service role credentials are never used client-side.
- Optional external APIs should have bounded request behavior and no infinite retries.

## Failure Handling Strategy

- Timeout external provider calls before they can stall workflow routes.
- Treat malformed provider responses as unavailable context.
- Keep retries limited; current optional provider helper behavior does not retry indefinitely.
- Preserve core workflow state even when optional provider enrichment fails.
- Store integration status without secret values.
- Keep billing, AI, World ID and email warnings actionable but non-blocking unless a pilot explicitly depends on that provider.
