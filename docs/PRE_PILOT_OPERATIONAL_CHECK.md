# Pre-Pilot Operational Check

Cyber Sentinels is ready for controlled pilot demos when Supabase is configured, admin access is verified, and demo data is treated as sample-only. This check confirms the product can be shown as an enterprise trust workflow without adding new architecture or making claims beyond the implemented surfaces.

## Ready Areas

### Public Pages

The following public pages are present and suitable for pilot navigation:

- Homepage: `/`
- Pricing: `/pricing`
- Enterprise: `/enterprise`
- Hiring Security: `/enterprise/hiring-security`
- Demo: `/demo`
- Help: `/help`
- Login: `/login`
- Enterprise Access: `/enterprise-access`

Public copy clearly emphasizes Hiring Security, Session Integrity, Verification Workflows, Governance Review, Audit Trails and Verification Receipts. Homepage positioning still includes: "Operational Trust Infrastructure for AI-era workflows."

### Security Boundaries

Email verification is enforced by middleware for protected user workflows. Unverified users are redirected to `/verify-email`, and the page is public so it does not create a redirect loop.

Protected user areas include dashboard, passport, workspace, verification workflows, trust routes and related operational pages. Admin and back-office routes remain admin-only through Supabase session checks, admin email allowlisting and the existing admin verification cookie.

Bot protection uses the existing Turnstile abstraction. Public request APIs reject missing or invalid tokens in production and return: "Security check failed. Please try again." Development can bypass missing Turnstile configuration for local work only.

Rate limiting is active for enterprise access, waitlist and account actions. The user-facing limit message is: "Too many attempts. Please wait and try again."

### Core Demo

The core demo routes are present:

- `/demo`
- `/demo/hiring-attack`
- `/demo/session-integrity`
- `/trust/receipt/[id]`
- `/verification/receipt/[id]`
- `/replay/[id]`
- `/trust-replay`

The demo narrative links synthetic applicants, injected feeds, session integrity changes, governance escalation, replay and receipts without implying automated trust decisions.

### Trust Workflow

The pilot workflow can show:

- Evidence upload and evidence references
- Active flags and session integrity signals
- Governance review and reviewer action paths
- Replay timelines and audit chronology
- Verification receipts for enterprise-readable outcomes

AI may summarize or assist where configured, but human governance remains the decision path.

## Warnings

The following warnings are acceptable for controlled demos if the pilot script does not depend on the missing provider:

- Turnstile not configured: warning in admin validation; production public submissions fail safely until configured.
- Hopae Connect disabled: optional upstream identity evidence remains unavailable.
- World ID disabled: optional proof handling remains disabled or placeholder-only.
- Stripe disabled: billing and checkout should not be part of the pilot demo.
- OpenAI disabled: AI-assisted summaries remain unavailable; human review workflow still works.
- Email provider disabled: in-app notifications remain the source of record.
- Supabase service-role key missing in a non-production check: workflow table validation may show warnings instead of live table confirmation.

## Blockers

The following should block a pilot demo until fixed:

- Missing `NEXT_PUBLIC_SUPABASE_URL`.
- Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Supabase REST or auth endpoints are unreachable from the deployed environment.
- Public pages return server errors.
- Admin routes render publicly without login/admin checks.
- Protected user routes allow access without a valid Supabase session.
- Verified email middleware creates a redirect loop.
- Enterprise access route is unavailable or returns server errors for normal requests.

## Optional Integrations

Supabase is required for auth, database, storage and operational records.

The following providers are optional for controlled pilot demos and should not block the app when disabled:

- Hopae Connect: optional upstream eID evidence.
- World ID: optional human proof flow.
- Stripe: optional billing, not required for pilot access.
- OpenAI: optional AI-assisted governance summaries; humans decide.
- Turnstile: recommended for public form protection; missing configuration is a warning, while production form submissions fail safely.
- Email provider: optional outbound email; in-app notifications remain authoritative.

## Runtime Validation Expectations

Runtime validation should report:

- Supabase public environment and endpoint reachability as blockers when missing or unreachable.
- Optional integrations as warnings, not blockers.
- Turnstile as a warning when not configured.
- Rate limiting, email verification and public form protection as OK or Warning style checks.
- No false Supabase outage when Supabase responds with expected protected or denied statuses.

Deployment readiness may show CAUTION when optional integrations are disabled. It should show BLOCKED only for critical failures such as missing required Supabase configuration, unavailable required routes or broken protected-route boundaries.

## Pilot Assumptions

- Demos are controlled and use sample-only data unless a customer-specific pilot workspace has been approved.
- Pilot operators understand that identity, liveness, deepfake risk, injection risk and session integrity are separate signals.
- Verification receipts and replay timelines are used as operational evidence, not as black-box scoring.
- Governance Review remains human-owned. AI does not decide trust.
- Billing is not part of the pilot unless Stripe has been explicitly configured and tested.
- Optional provider warnings are disclosed internally before demos so operators can avoid unsupported flows.

## Final Assessment

Cyber Sentinels is ready for controlled pilot demos when runtime validation is READY or CAUTION with only optional-provider warnings, admin access is confirmed, and Supabase is configured in the target environment.