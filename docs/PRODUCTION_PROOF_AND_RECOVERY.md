# Production proof and recovery readiness

Observed 2026-09-29 against main `d40a0a14772af190a2d82e454b6294113ad35bd2`, Vercel Production deployment `dpl_B3eU7rHngMsjMBu3CPtex1GUEAFq` (READY). These observations concern the deployed baseline, not this unmerged branch. No credentials, reset emails, Production records, project configuration, deployments or restore operations were changed.

## Authentication evidence

The corrected `tools/release/auth-public-smoke.mjs` completed at `2026-09-29T08:48:35.701Z` with PASS and no artifact warnings. Its ignored local result is `artifacts/auth-production/result.json`; screenshots are local evidence, not credentials or committed test fixtures.

| Check | Observed Production evidence | Remaining proof |
| --- | --- | --- |
| Login | HTTP 200, Sign in heading, desktop and 390px mobile control fits | A real authenticated session is not established by this check. |
| Reset quarantine | Direct unauthenticated reset route displays expired/invalid link; no New password control | Valid emailed link, password change, consumed-link reuse and recovery-session isolation require owner testing. |
| Missing recovery code | Callback reaches `/login`, one committed document navigation, one tab, no loop | A missing code is not a real expired/consumed provider token. |
| Protected routes | `/dashboard`, `/workspace`, `/admin`, `/back-office`: 307 to same-origin login and noindex | Authenticated tenant/role behavior and actual backoffice data need manual proof. |
| Operational entities | HTTP 200 streamed login redirect, no protected page heading, browser ends at login, noindex | The limited protected-content sentinel is not an exhaustive authenticated data audit. |
| Logout implementation | Downloaded deployed login assets include Sign Out and `/api/auth/logout` in `/_next/static/chunks/app/layout-16fd117dfbb681d0.js` | Visible authenticated desktop/mobile control, session termination, login redirect and Back/reload denial need a real session. |

The browser regressions execute the committed helper against local HTTP fixtures: streamed redirects, history-only navigation, actual reload detection, immutable captured navigation evidence, content leakage and external redirects. Existing recovery/logout browser tests exercise application modules with controlled auth boundaries. Neither is a substitute for an authenticated Production session.

### Owner proof checklist

In an owner-controlled browser, sign in normally without sharing a password or recovery URL. On desktop and mobile, record the deployed version, visible Sign Out control, sign-out result and redirect. Use Back and reload protected routes; access must require fresh login. Exercise a valid emailed recovery link, verify quarantine before completing the reset, then verify the used link fails and recovery state cannot grant normal application access. Check backoffice using the intended account/tenant/role and an unauthorized role where available; confirm data freshness and denied cross-tenant access. Keep tokens, cookies, passwords and personal data out of screenshots/logs.

**Logout and authenticated backoffice: MANUAL AUTHENTICATED PROOF REQUIRED. Real email recovery: MANUAL PROOF REQUIRED.** No auth application change was justified by these missing manual observations.

## Actual Production backup metadata

Read-only command: `supabase backups list --project-ref kecgtsfibkypjuaxqbjx --output json` (CLI 2.116.0). This is the Production project; staging `agpyhygpfmppjkxwcpac` is separate.

```json
{"region":"eu-west-3","walg_enabled":true,"pitr_enabled":false,"backups":[],"physical_backup_data":{},"message":""}
```

| Question | Supported conclusion |
| --- | --- |
| Backups enabled | WAL-G backend flag is true; usable backup availability is NOT VERIFIED. |
| Backup type | No available backup record/type is returned; do not infer a recoverable physical backup from the flag. |
| Retention | UNKNOWN; no retention window or dated restore point was returned. |
| PITR | Disabled in the returned metadata. |
| Restore procedure documented | Existing [disaster recovery](operations/disaster-recovery.md) and [test plan](operations/recovery-test-plan.md), plus the isolated verification procedure below. |
| Last verified Production restore | NOT VERIFIED. [Earlier synthetic staging reconstruction](release/BACKUP_AND_RECOVERY_READINESS.md) does not prove Production recovery. |
| RPO / RTO | UNKNOWN / UNKNOWN; no approved target or measured real recovery evidence available. |

Official [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups) describes plan-dependent availability and retention, separate PITR capability, and database backup exclusions including Storage file bytes and custom-role passwords. Restoring the source project interrupts service. These general capabilities are not evidence of this project's enabled plan, recoverable backup or achieved recovery time. No paid capability was enabled.

### Safe restore-test recommendation (not executed)

1. The project owner confirms a real dated backup/restore point and retention in existing Supabase controls. If none exists, resolve recoverability before declaring readiness. Record evidence without exporting connection credentials.
2. Agree a separate, access-restricted non-Production destination, permitted data handling, cost ceiling, RPO and RTO targets. Confirm source and target project references independently. Never select Production as the restore target for a drill.
3. Follow the provider-supported procedure for the actual available backup type and PostgreSQL version. Keep email, webhooks, jobs and provider execution disabled on the destination so restored records cannot trigger external effects. Handle Storage objects and required secrets separately.
4. Record backup timestamp, start/end timestamps and observed restored transaction watermark. Validate migration ledger, RLS and service-only ACLs, tenant isolation, representative immutable decision/receipt/Replay/Memory relationships and application read paths using approved data. Run database lint against the isolated destination.
5. Calculate actual data loss window and elapsed recovery time; compare with approved RPO/RTO. Preserve redacted results, failures, owner and next test date in this existing runbook. A drill fails if data integrity, security or restore completeness cannot be demonstrated.
6. Obtain the owner's disposition for the isolated target and any exported files under the agreed retention policy. Do not delete or mutate the source as part of the drill.

This recommendation needs an actual available backup and owner-approved isolated target before execution. It does not claim that a restore was tested or schedule a Production operation.
