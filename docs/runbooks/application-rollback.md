# Application Rollback Runbook

**Status:** Approved procedure; controlled drill evidence is still required

## Trigger

Rollback when the current Production revision causes authentication/tenant boundary failure, unsafe trust behavior, material unavailability, unrecoverable errors or another go/no-go threshold. The Release owner or Incident Commander authorizes rollback.

## Preconditions

- Identify the bad commit/deployment and last known-good commit.
- Confirm whether database migrations or environment changes accompanied the release.
- Preserve logs, deployment IDs, smoke results and incident timeline.
- Assign application, database and verification owners.

## Preferred rollback

Create a normal auditable revert on `main`:

```powershell
git revert <bad-commit-sha>
git push origin main
```

Do not use `git reset --hard` on shared `main`. Do not force-push. If several commits must be reverted, review dependency/order and preserve each decision.

## Vercel alternative

Use Vercel rollback/promote only when the intended known-good Production deployment is explicitly identified and the Incident/Release owner approves it. Record deployment IDs and expected SHA. A platform rollback does not alter Git history or Supabase schema.

## Verification

Confirm canonical aliases, expected SHA, public pages, authentication/authorization denials, critical APIs, representative trusted workflow, security headers, errors and latency. Reconcile any events created during the failed window.

## Database and environment warning

If the bad release changed schema, data or secrets, coordinate with `database-rollback.md`. Never assume application rollback restores database compatibility. Environment values should be restored/rotated through the platform secret manager, not Git.

## Closure

Record reason, authorization, reverted commits, deployments, schema state, verification, residual impact and follow-up actions. A rollback is not complete until Production is verified and the incident/change record is updated.
