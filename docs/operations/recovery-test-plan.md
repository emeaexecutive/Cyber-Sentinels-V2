# Recovery Test Plan

**Status:** Proposed; no completed CS-ENG-001 recovery exercise is claimed

## Schedule

| Test | Frequency | Environment | Success evidence |
| --- | --- | --- | --- |
| Application Git revert | Each material release or quarterly | Test/Production-safe change | Known-good SHA deployed and smoke passes |
| Fresh database rebuild | Every migration change in CI | Ephemeral | Full migration set and RLS tests pass |
| Database restore/PITR | Quarterly or platform minimum | Isolated restore project | Measured RTO/RPO, schema/RLS/integrity pass |
| Domain/DNS recovery tabletop | Semiannual | Tabletop/safe test zone | Contacts, access and records verified |
| Credential compromise | Quarterly tabletop; annual exercise | Test credentials | Revoke/rotate/audit/session checks pass |
| Provider outage/callback reconciliation | Quarterly | Sandbox/Test Mode | Fail-closed behavior and reconciliation pass |
| Environment loss | Semiannual | Test deployment | Controlled inventory restores runtime |
| Repository loss | Annual | Isolated clone/restore | Branches/tags/history and build verified |

## Test record

Record scenario, owner, approvals, environment, starting SHA/schema, injected failure, steps, timestamps, observed impact, recovery time, data-loss window, integrity/security checks, deviations and actions. Never test destructive recovery against Production without explicit incident/change authority.

## Acceptance

A recovery test passes only when service is restored to the intended revision, tenant isolation and authentication pass, data/evidence integrity is reconciled, and the measured result is retained. A successful deploy without integrity validation is incomplete.

## Current blockers

Supabase backup/PITR state, account recovery, domain/provider contacts and isolated restore credentials are external. Until exercised, recovery remains `DOCUMENTED ONLY` or `BLOCKED BY EXTERNAL CONFIGURATION`.
