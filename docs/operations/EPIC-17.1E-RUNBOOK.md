# EPIC 17.1E Runbook

## Preflight

Apply `202607200002_enterprise_trust_consent_manager.sql` to a disposable Supabase project, verify all eleven tables and RPC grants, then run live same-user, anonymous-token, cross-tenant and mutation-denial tests. Configure `CONSENT_DEFAULT_ENTERPRISE_ID` to an existing workspace and store a random `CONSENT_COOKIE_SECRET` of at least 32 characters in the deployment secret store. Configure `CONSENT_REGION_PROFILE` only after policy review.

Run `npm run verify:17.1e`. Confirm no optional script request occurs before choice. Test Accept All, Reject Optional, custom save, withdrawal, expiry and policy-version re-consent at mobile and desktop widths with keyboard and screen reader.

## Incidents

On receipt-integrity failure, block downstream consent-dependent forwarding, preserve receipt/audit rows and investigate; do not rewrite history. On tracker discovery, keep it UNKNOWN/BLOCKED until provider, purpose, category and retention are reviewed. On cookie-secret rotation, expect re-consent unless a reviewed dual-key migration is implemented.

## Rollout and rollback

Migrate and verify the database before deploying the application because the banner fails closed when persistence is unavailable. Application rollback must leave receipts/history intact. Database rollback requires a new forward migration. Do not enable vendor SDKs or tag managers merely because hooks exist.

The banner's Escape key intentionally does nothing. In Manage Preferences, Escape cancels and returns to the banner. The launcher is `./Launch-Verify-EPIC-17.1E.ps1`; use `-NoPause` in CI.
