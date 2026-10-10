# Recovery Test Plan

**Latest Storage closure (10 October): ALL SIX RECOVERY CATEGORIES PASS for the accepted isolated profile with mandatory local hardening. Actual Production payload export and isolated restoration passed; Production was not mutated and targets are stopped. See [final Storage evidence and procedure](storage-recovery-closure-20261010.md). Storage BLOCKED statements below describe the earlier phase and are superseded; historical limitations and security qualifications remain.

**Status:** Database, integrated HTTP/runtime and security qualification passed on 2026-10-10 with the required local hardening migration. Original Storage payload recovery remains BLOCKED. See the [current evidence and repeatable drill](recovery-closure-20261010.md). No Production mutation or unattended host scheduling was performed.

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

Next quarterly isolated archive drill is due **2027-01-09**; repeat sooner after material schema, security, extension or backup changes. Assign an accountable operator and retained restricted evidence directory before execution. The recurring schedule is policy, not proof that a scheduler has been installed. Use a fresh network-isolated target and stop it after evidence capture. Archive-specific automation must not be reused for a different archive by bypassing hash, role or image guards.

Record scenario, owner, approvals, environment, starting SHA/schema, injected failure, steps, timestamps, observed impact, recovery time, data-loss window, integrity/security checks, deviations and actions. Never test destructive recovery against Production without explicit incident/change authority.

## Acceptance

A recovery test passes only when service is restored to the intended revision, tenant isolation and authentication pass, data/evidence integrity is reconciled, and the measured result is retained. A successful deploy without integrity validation is incomplete.

## Current blockers

The original Storage bytes remain unavailable. Storage export/restore tooling and synchronized future capture are implemented and locally exercised; synthetic objects do not substitute for the archived Production object. Independent dump-time snapshots cannot be recreated for the old archive. The recurring drill wrapper is implemented and exercised, but accountable operator/scheduler assignment remains an operational action. Account recovery, PITR guarantees and domain/provider recovery are separate exercises. The archive's confirmed Agent Registry RLS defect must be corrected using the recorded local hardening step before runtime acceptance; Production was not changed.
