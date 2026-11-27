# Staging qualification update — 19 October 2026

STAGING_GO = NO — real human login and cleanup pending
PRODUCTION_GO_NO_GO = NO_GO

## Secret correction verified — 19 October, 16:22 Madrid time

The owner confirmed saving the matching Preview-only secret and allowing the Staging hostname. The same approved application SHA `a83824688249e52f3cc12e91f31c110bb5bc6026` was rebuilt as `dpl_Dbt8H6AkPaCgPkHPJD44ySxq8ADb`. Readiness returned HTTP 200, the exact SHA, Staging project `agpyhygpfmppjkxwcpac`, and Production binding `NOT_ACTIVE`; the Staging hostname was then assigned to this build.

The negative probe now reaches normal provider verification and fails with `invalid-input-response`, as expected for the intentionally invalid diagnostic token. The application returns HTTP 400 `INVALID_TOKEN`; the previous `invalid-input-secret` rejection is resolved for this deployment. Correlation: `staging-corrected-secret-20261019`; Vercel log timestamp `2026-10-19T14:22:41.141Z`. The provider HTTP status is not logged on successful HTTP responses; the `invalid_token` branch is reached only after `response.ok`.

Actual human challenge success, returned hostname acceptance, and browser login still require verification. The owner was asked to use the replacement synthetic credentials from the private local instructions in their normal browser. No security control was disabled. Earlier evidence below is retained as historical diagnosis.

New private evidence: `corrected-secret-readiness-20261019.private.json`, `corrected-secret-probe-20261019.private.json`.

## Verified deployment and failure

The owner-approved application commit `a83824688249e52f3cc12e91f31c110bb5bc6026` is deployed to Staging as `dpl_E23cGHPoccraNEuNtqSJ6arijAtV`. The Staging alias resolves to this deployment. `/api/ready` returned HTTP 200, the exact commit, project `agpyhygpfmppjkxwcpac`, `productionProjectActive: NOT_ACTIVE`, and the Staging application origin.

An intentionally invalid diagnostic token was submitted to the real verification endpoint; this is not evidence of a human challenge passing. The provider response proves the immediate configuration blocker:

- Cloudflare Siteverify HTTP status: **400**.
- Provider error code: **invalid-input-secret**.
- Application response: HTTP 503 `PROVIDER_UNAVAILABLE` (the existing classification of non-2xx provider responses).
- Correlation: `staging-diagnostic-20261019-a838-provider`.
- Vercel log timestamp: `2026-10-19T10:45:46.268Z`.
- Request and expected hostname: `staging.cybersentinels.com`.
- Provider hostname and challenge timestamp: absent. Actual challenge hostname acceptance remains unproven.

The widget uses interaction-only appearance; an absent checkbox does not establish that the widget failed to load. The secret rejection is independently demonstrated by server logs. The diagnostic change retains real provider verification and fails closed.

## Recovery and regression status

Staging Supabase resumed from INACTIVE and is now ACTIVE_HEALTHY. Read-only verification found 151 migration ledger entries, both `20261012084456` and `20261012122704`, and the active-session helper. No migration was applied in this session.

The exposed synthetic customer test password was replaced and the replacement successfully authenticated to Staging; that verification session was signed out. Credential values and account identities are excluded from this report. Private instructions and prior evidence remain in the restricted local qualification folder.

The approval lifecycle regression passed after service recovery. The initial Storage test failed ten hosted gateway checks because its harness omitted the existing Vercel automation-protection credential and received HTTP 302. Direct database/Storage checks were separate. The harness now supports the existing automation bypass only on the exact allowlisted Staging origin, with OIDC fallback; the corrected suite passed. Original failure evidence is retained. Exact diagnostic-deployment regression results are recorded separately on completion.

The corrected suite was repeated against the deployed diagnostic SHA: **129/129 checks passed**, including retained unexpired JWT denial after logout, tenant isolation, account-approval enforcement, and Storage restrictions. Evidence: `a838-hosted-20261019-storage-logout.private.log`, generated `2026-10-19T10:46:52.957Z`.

The diagnostic source passed 14 Turnstile tests and TypeScript checking before deployment. These checks do not substitute for a real human login.

## Required correction and remaining gates

The owner must provision the matching widget's secret directly into Vercel `TURNSTILE_SECRET_KEY`, Preview only, branch `feat/authority-of-record-tenente`, and confirm that the widget permits `staging.cybersentinels.com`. No secret should be pasted into chat, GitHub, or logs. Rebuild the same approved application commit after this environment correction, verify runtime isolation, and repeat provider diagnostics before requesting a human login.

Real human Turnstile verification, returned-hostname acceptance, and browser login remain incomplete. The four existing qualification identities and temporary administrator/qualification branch settings remain pending final cleanup. Fresh per-suite fixtures use their own cleanup hooks. Do not treat prior cleanup evidence as proof that these remaining fixtures were removed.

Production remains unchanged by this work. Its deployment was independently rechecked as `dpl_3aKJiNZB6jQssp9Urm8uDG1zBsyp`, SHA `3c2b5e6c93bc5c3ac1a918de874c5cd0645b4571`. No Production migrations, account changes, secrets, merge, or deployment were performed. Original backup/restore evidence is preserved. Database restore evidence does not prove synchronized Storage recovery.

Private evidence root: `C:\Users\emeae\Documents\CyberSentinels\ProductionBackups\staging-420-20261012`.

Relevant evidence: `diagnostic-readiness-20261019.private.json`, `turnstile-provider-response-20261019.private.json`, `fixture-rotation-verification-20261019.private.json`, `resume-20261019-approval.private.log`, `resume-20261019-storage.private.log`, `resume-corrected-20261019-storage-logout.private.log`.
