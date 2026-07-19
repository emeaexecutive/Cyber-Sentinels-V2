# Production Readiness Checklist

**Status:** Required release control; unchecked items are not passes

## Repository and build

- [ ] Expected commit SHA and release scope are immutable.
- [ ] Only reviewed files are staged/merged.
- [ ] Lint, typecheck, intended test inventory and production build pass.
- [ ] Dependency and secret scans pass or have approved, expiring exceptions.

## Authentication, authorization and tenancy

- [ ] Login, verification, refresh, expiry, logout and reset are tested.
- [ ] User/admin route and API denials are tested.
- [ ] Every tenant-bearing table has reviewed RLS/authorization.
- [ ] Cross-tenant live denial tests pass with dedicated fixtures.
- [ ] Service-role operations are inventoried and audited.
- [ ] MFA/step-up status is accurately represented.

## Database and data

- [ ] Full migration set applies to an empty database.
- [ ] Target migration history and drift are known.
- [ ] Expand/contract compatibility and backfill are tested.
- [ ] Backup/PITR and restore ownership are verified.
- [ ] Retention, legal hold and test-data cleanup are reviewed.

## Providers and trust

- [ ] Enabled providers have approved credentials, health and signed callback evidence.
- [ ] Demo, Test Mode, sandbox and live source modes are explicit.
- [ ] Evidence, policy, authority, decision, Replay, graph and memory references reconcile.
- [ ] Missing/degraded dependencies fail closed.
- [ ] Accuracy/validation claims meet reviewed-data gates.

## Delivery and operations

- [ ] Production branch/domain/environment settings are verified externally.
- [ ] Required CI/release checks and approvals pass.
- [ ] Health, dashboards and alerts are configured for the release.
- [ ] Application and database rollback owners are available.
- [ ] Incident commander and communications owner are assigned.
- [ ] Production smoke plan is approved and safe.

## Experience and compliance

- [ ] Critical public/authenticated/admin browser journeys pass.
- [ ] Accessibility and representative performance evidence is current.
- [ ] Reports/exports preserve authorization and data boundaries.
- [ ] Privacy, consent and customer communication changes are approved.

## Decision rule

Any unchecked critical item is `BLOCKED`, not `passed`. Cross-tenant access, authentication bypass, unsafe allow decision, destructive migration uncertainty or missing rollback capability requires `NO-GO`.
