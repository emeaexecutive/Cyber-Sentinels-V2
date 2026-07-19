# Test Strategy

**Status:** Approved target strategy; implementation remains incomplete

## Objectives

1. Prevent cross-tenant access and unauthorized execution.
2. Preserve evidence, policy, authority, decision and Replay integrity.
3. Fail closed when identity/provider/database dependencies are unavailable.
4. Keep demo, Test Mode and live evidence distinguishable.
5. Detect release, migration and operational regressions before Production.

## Risk tiers

| Tier | Examples | Minimum verification |
| --- | --- | --- |
| Critical | Authentication, RLS, provider callbacks, authority, Trust Decision, rollback | Unit + API + database + deployed denial + recovery evidence |
| High | Replay, Evidence Graph, Trust Memory, reports, governance | Unit + integration + tenant/audit verification |
| Medium | Dashboard, Back Office, enterprise intake, billing | API/browser + authorization + accessibility |
| Standard | Public content and navigation | Build + link + responsive/accessibility smoke |

## Required practices

- Prefer behavior assertions over searching source text.
- Use deterministic clocks, IDs and fixture versions for trust/replay tests.
- Test allow and deny paths; denial must not leak sensitive detail.
- Test duplicate, stale, reordered and partially failed provider/webhook events.
- Apply all migrations to an empty database before RLS tests.
- Use two users in different tenants plus admin/service-role cases.
- Verify audit records and correlation references for critical mutations.
- Keep browser tests role-aware and run keyboard/accessibility checks.
- Measure p50/p95 only from representative retained samples; label mocked/in-process results.

## Gate policy

Pull requests run static, domain, source-contract inventory, ephemeral database and build gates. Release candidates add browser, deployed security, live RLS, provider target and performance gates where the capability is in scope. Production smoke runs after deployment. Recovery tests run on schedule and before claiming operational readiness.

Flaky tests are failures until quarantined with an owner, issue and expiry. Skipped or credential-blocked tests are visible in the go/no-go record and cannot be converted to passes.

## Exit criteria

A release passes only when all required checks are green, blocked external checks have an explicit no-go or approved scope exclusion, critical evidence is retained, and the Release, Security and Data owners approve the result.
