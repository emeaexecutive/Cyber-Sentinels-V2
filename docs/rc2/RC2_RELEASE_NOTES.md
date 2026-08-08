# RC2 Release Notes

## Enterprise Operational Readiness

RC2 turns the existing Enterprise Trust Platform into a more credible controlled-pilot release by consolidating operational ownership, enforcing audit completeness and adding deployable policy-governance and tenant-role hardening.

**Production untouched.** No Production deployment, migration, secret, provider or control-plane state was changed.

## Added

- Protected `/enterprise/operations` workspace.
- Protected `/api/admin/enterprise-operations` snapshot with no-store, correlation and release headers.
- Ten-control enterprise administration registry.
- Fifteen-owner lifecycle registry.
- Eight-control operations model covering health, queues, providers, background jobs, retries, dead letters, recovery and maintenance.
- Nine-stage design-partner operating flow.
- Complete audit validation for Who, When, Why, Evidence, Authority and Replay.
- Policy governance transition validation with reviewer and rollback requirements.
- Additive RC2 migration for expanded workspace roles, tenant/role RLS hardening and append-only policy-governance evidence.
- Tenant-aware policy governance GET/POST API.
- Release metadata on the public no-store liveness endpoint.
- RC2 architecture, deployment, design-partner and operations guidance.

## Strengthened

- Enterprise Readiness now links exact Settings, Policies, Roles, Teams, Integrations, API Keys, Webhooks, Notifications, Exports and Reports owners.
- Enterprise Trust Platform links to the protected operations view.
- Missing background-job, dead-letter and recovery telemetry remains explicitly `UNKNOWN`.
- Policy governance uses compare-and-set transitions and a service-role persistence boundary.
- Original permissive Trust Workspace RLS policies are replaced by tenant and least-privilege role checks when the migration is applied.

## Security and architecture notes

- The RC2 operations view is a projection, not a new source of truth.
- Policy governance is append-only and tenant bound.
- Direct authenticated writes to governance evidence remain revoked.
- Sensitive platform state is admin-only; public health remains minimal.
- External rate limiting, WAF, DNSSEC, deployed RLS and secret rotation require authoritative target-environment evidence.
- CSP compatibility allowances remain a documented hardening opportunity.

## Known readiness boundaries

- Durable background-job, dead-letter and recovery telemetry is not connected by repository code and therefore remains `UNKNOWN`.
- The migration is authored but not applied by this release work.
- Provider configuration is not runtime health or accuracy evidence.
- A successful local build is not Production proof.
- Pilot and Production go-live require tenant denial tests, provider evidence, policy rollback rehearsal, backup/recovery evidence and owner acceptance.

## Validation commands

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

The focused suite is `npm run test:rc2-operational-readiness`.

## Validation result — 2026-08-07

- `npm ci`: passed; 381 packages audited, with one high-severity development-only advisory; the production dependency audit remains at zero known vulnerabilities.
- `npm run lint`: passed with 0 errors and 2 pre-existing unused-import warnings in release tooling.
- `npm run typecheck`: passed.
- `npm test`: passed across the complete repository chain, including the 7-test RC2 suite.
- `npm run build`: passed; Next.js compiled and generated 192 static pages, including all new dynamic RC2 routes.
- Local built-server smoke: `/api/health` returned 200 with liveness, trace/audit metadata, `no-store` and configured security headers.
- Local protected-route smoke: the operations page and API returned 503 because required auth configuration was absent, confirming fail-closed behavior.
- The RC2 database migration was reviewed and tested by repository contracts but was not applied to any environment.
