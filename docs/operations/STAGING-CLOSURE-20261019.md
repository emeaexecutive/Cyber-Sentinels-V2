# Hosted Staging qualification — 19 October 2026

This report supersedes earlier pending Turnstile, logout and cleanup statements. Production remains unapproved. Application candidate: `a83824688249e52f3cc12e91f31c110bb5bc6026`; subsequent PR commits contain test/evidence updates, not a different deployed application.

STAGING_GO = YES for the explicitly scoped hosted authentication, approval, isolation and scripted trust-control qualification; not a blanket provider/customer-release qualification.

PRODUCTION_GO_NO_GO = NO_GO pending the release requirements below.

Final clean deployment: `dpl_J6k1Eat3YwPmXdoRZzcfGQ4BfnKh`, serving `staging.cybersentinels.com`, rebuilt after removing temporary settings. Readiness and login HTTP 200; anonymous administrator page HTTP 307 to login; exact candidate SHA and Staging-only runtime binding verified. Private evidence: `final-clean-readiness-20261019.private.json` and `final-clean-alias-smoke-20261019.private.json`. The full functional workflow was run before fixture deletion on the same application SHA; the clean build received these post-cleanup checks, not another claimed full fixture run.

## Verified hosted outcomes

| Gate | Evidence and result |
| --- | --- |
| Real human login and Cloudflare hostname | PASS. Owner confirmed login; server logged `verified`, provider and expected hostname both `staging.cybersentinels.com`, no provider errors. Verification `2026-10-19T14:34:53.842Z` (16:34 Madrid), correlation `94b58d50-f0f0-44e7-bb5d-011b8cfb0644`. |
| Secret correction | PASS. Former HTTP 400 `invalid-input-secret` resolved after the owner corrected the Preview-only value and the exact approved commit was rebuilt. |
| Approval and administrator controls | PASS. Hosted rejection/reapproval with attributed audit; wrong administrator code, missing administrator cookie, non-allowlisted customer, overlong reason and forged actor denied or ignored as required. Revoked administrator self-approval denied; distinct synthetic administrator approval succeeds with attributed audit. Earlier missing-reason checks remain preserved. |
| RLS, tenant isolation and Storage | 129/129 hosted checks passed on the diagnostic candidate, including unexpired retained-JWT denial after logout. |
| V1 inheritance | PASS. Same fresh key denied for REJECTED/SUSPENDED/REVOKED, restored after audited reapproval; browser session gates also checked. Earlier 404 against a stale test-agent reference is retained as a harness failure, then superseded by a fresh tenant-owned agent run. |
| Hosted logout | PASS. Before logout one own row; after logout zero, retained browser cookie redirected, refresh denied, JWT had 3,593 seconds until expiry. |
| Customer Zero | PASS. Actual hosted Ed25519 proof, challenge/heartbeat replay denial, bounded authority, ALLOW, revocation then DENY, tenant negatives and incident export. |
| Receipts, Replay, Trust Memory | PASS. Hosted receipt and outcome review preserve original decision/digest; eight required memory types, graph and desktop/mobile incident page checks pass. |
| External provider execution | NOT CLAIMED. Observations are scripted; no downstream operation or model invocation. Signed-heartbeat qualification used the approved temporary Staging setting. Hosted REVIEW/provider-backed execution is not established by this run. |
| Exact application CI | PASS: Production verification, secret scan and CodeQL for `a838246`; 14 focused Turnstile tests and typecheck passed before deployment. |

The real login and final workflow ran on deployment `dpl_Dbt8H6AkPaCgPkHPJD44ySxq8ADb`. It returned readiness HTTP 200 with exact SHA, Supabase `agpyhygpfmppjkxwcpac`, and Production binding `NOT_ACTIVE`.

## Access cleanup and recovery evidence

Four test API keys were explicitly revoked and subsequently returned 401. Four synthetic Auth identities were globally signed out and deleted; independent lookup confirmed 404 for all four. The two test workspaces have zero memberships and no owner. Immutable audit, revoked-key and trust-history records are retained. This is verified access removal, not deletion of append-only evidence. Other per-suite fixtures used cleanup hooks.

`ADMIN_EMAILS`, `ADMIN_ACCESS_CODE`, and `CONTROL_PLANE_STAGING_QUALIFICATION` were removed from the qualification Preview branch. An untruncated branch-filtered metadata query found no remaining temporary entries. The five required isolation overrides remain scoped to that Preview branch. Old immutable deployments retain historical build configuration, but the associated identities and keys are removed.

The original archive was rehashed unchanged: `081310d3c1f64aaacf3c2207efa62bfa7641c81a670d5e23de6d11ae64784307`. It is preserved with all prior restore and failed/successful test attempts. Separate Storage recovery evidence does not prove a synchronized database/Storage snapshot.

Both approved Staging migrations remain in the 151-entry ledger. Earlier full application-schema equivalence plus the session-security delta comparison provide evidence beyond migration-name matching; the delta has zero differences against the isolated 16-migration rehearsal database. No history was rewritten. See [delta comparison](staging-session-delta-equivalence-20261019.json).

## Production approval package

The offline 16-file plan is `reviewed-migration-plan-20261019` in the private backup folder. Manifest SHA-256: `9f85337601a0aa4c5fa4746d5e4a7c06fed80443f39f9178b07699f4582ac23a`. All 16 source and execution hashes match the successful `migration_rehearsal_session16v2` evidence. Expected Production ledger after execution: 135, from the reviewed 119-entry baseline. Exact commands, verified TLS, hash guards, atomic ledger handling and stop/forward-repair instructions are in [the migration procedure](PRODUCTION-MIGRATION-REHEARSAL-20261012.md).

Production remains **NO_GO** until:

1. Keith selects two distinct authorized administrators and gives the five account dispositions using the existing private `OWNER-ACCOUNT-REVIEW-20261012.md` sheet. No identities or account inventory belong in GitHub.
2. The operator and change window are approved, a fresh recovery point is verified, retention/custody and coordinated Storage consistency are settled, and Production schema/ledger drift is checked against the rehearsed baseline. Drift requires a new rehearsal; an old snapshot is not proof of current state.
3. The actual provider/execution scope and remaining hosted REVIEW coverage are qualified for the release's customer-facing claims. The scripted control-plane proof does not satisfy actual provider execution.
4. The owner approves the exact merge, Production-bound application candidate and 16-migration procedure. Approval of Staging is not Production approval.

Sequence: fresh verified recovery point and approved interruption plan; exact project/TLS/hash/baseline preflight; apply one reviewed atomic migration at a time; coordinate the approval RPC/grants with the approved application deployment; bootstrap the named administrators using the tested audited path; apply only owner-approved account decisions; verify login, logout, tenant isolation, keys, Gateway, receipts/Replay/Memory and error rates before reopening access. Do not request quiescence merely for database-only `pg_dump`.

Abort for project/SHA/isolation mismatch, failed TLS/checksum/baseline/data integrity, missing audit, tenant leakage, unauthorized key access, unavailable administrators or recovery failure. Before commit, roll back that file. After commit, stop and rehearse an approved forward repair against the partial state. Inspect ledger state after ambiguous commit. Application rollback does not undo database grants, policies, triggers or migrations.

No Production writes, merge or Production deployment occurred. Production deployment remains `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`, SHA `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`.

## Private evidence index

Under `C:\Users\emeae\Documents\CyberSentinels\ProductionBackups\staging-420-20261012`: `human-login-verified-20261019.private.json`; `a838-hosted-20261019-storage-logout.private.log`; `final-a838-20261019/customer-zero.json`; `final-a838-20261019/application-proof.json`; `final-20261019-admin-negative-proof.private.json`; `final-20261019-self-approval-postmigration.private.json`; `final-20261019-v1-fresh.private.json`; `final-20261019-hosted-logout-expiry.private.json`; `final-fixture-cleanup-20261019.private.json`; `final-cleanup-verification-20261019.private.json`. Credential exports and browser state remain private and are not committed.
