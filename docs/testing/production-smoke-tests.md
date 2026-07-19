# Production Smoke Tests

**Status:** Procedure approved; authenticated and provider checks require credentials

## Preconditions

- Release decision is `GO` and expected commit SHA is recorded.
- Vercel deployment is `Ready` and aliases point to the intended Production deployment.
- The operator has read-only or approved synthetic-tenant credentials.
- Migration status and rollback owner are known.
- Smoke tests will not create customer-visible or billable provider activity without approval.

## Public and edge checks

1. Confirm HTTPS apex redirects once to canonical `https://www.cybersentinels.com`.
2. Confirm homepage, `/login` and `/enterprise-access` return expected successful responses.
3. Confirm representative static assets load without mixed content or Preview URLs.
4. Confirm CSP, HSTS, framing, MIME, referrer and permissions headers.
5. Confirm `/api/health` returns only bounded liveness fields.

## Authentication and authorization

1. Anonymous `/dashboard` and `/back-office` must redirect to login and remain no-index/private.
2. Invalid, expired and logged-out sessions must fail safely.
3. Verified user login, refresh, logout and password reset must work with an approved account.
4. A normal user must not reach admin routes.
5. An allowlisted administrator must complete the configured second gate; removal/revocation must take effect.

## Data and trust workflow

Using an approved synthetic tenant, verify one bounded workflow through evidence ingestion, provider/Test Mode state, policy/authority decision, audit event, Replay, Evidence Graph, Trust Memory and report export. Confirm every artifact carries the same tenant/workflow/correlation references and source mode.

## Safe denial checks

Run the deployed security harness against the explicit approved HTTPS target. Verify forged/stale/oversized callbacks, anonymous APIs, revoked authority and rate limits fail safely. Run live RLS tests only with dedicated cross-tenant fixtures.

## Evidence and stop conditions

Record SHA, deployment ID, domain, operator, time, results, correlation IDs and redacted artifacts. Stop and declare `NO-GO` for cross-tenant access, authentication bypass, wrong deployment SHA, failed migration, evidence loss, unsafe allow decision, broken rollback path or material error spike.

Blocked credentialed checks remain `BLOCKED`; they are never recorded as passed.
