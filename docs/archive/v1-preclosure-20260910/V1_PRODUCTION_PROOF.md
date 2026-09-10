# Cyber Sentinels V1 Production Proof

> HISTORICAL / SUPERSEDED. This report preserves an earlier qualification state. Its verdicts and next steps are not current instructions. See the [canonical final V1 Production proof](../../release/v1-control-plane-production-proof/PRODUCTION_PROOF.md).

Proof timestamp: 2026-08-31 17:26 UTC  
Release candidate: `8e3f616d1ea5846bc59ed081ec2f13a7019b7372`  
Production domain: `https://www.cybersentinels.com`  
Release status: **blocked at the pre-Production gate; no merge, Production migration, or candidate deployment performed**

## Release control

PR #72 remains open, mergeable, and clean. Its head is still the qualified SHA and all required CI checks are successful. `main` remains at `645945ff18bed601753a2b2595d6d3759298f11a`, the same merge base used for qualification.

The currently served Production deployment is `dpl_7Zyhf51a2JF2wnWMg1BDAMBDjVq1`, target `production`, running SHA `a4385dbf92488761714f805cd233ec81b6a7ee84`. It is an older baseline, not the qualified V1 candidate. Its `/api/health` and `/api/ready` endpoints returned HTTP 200, but readiness still reported authoritative external controls as blocked.

## Database reconciliation and recovery

The three-way Repository/Staging/Production migration reconciliation passed. Production version `20260819084252` is semantically equivalent to repository version `20260819082001`; the repository version must be recorded as an alias without re-executing its SQL. Production version `20260819084329` is Production-only execute-privilege hardening and must be retained. A naive migration push is forbidden.

The complete, per-operation forward plan is in `artifacts/production-migration-reconciliation.json`.

[REDACTED SENSITIVE LINE]
[REDACTED SENSITIVE LINE]
[REDACTED SENSITIVE LINE]

The archive passed checksum verification and restored into disposable local PostgreSQL 17. The restore preserved representative canonical rows, all eight critical RLS tables, and the Production-only function ACL hardening. The semantic alias and all eight forward migrations then succeeded in isolated single transactions, producing expected migration head `20260831125500` and a passing `public_api_readiness_v1()` result.

## Production configuration

The following missing Vercel Production values were created without printing or persisting their values in the repository:

- `API_KEY_PEPPER`
- `API_KEY_ROTATION_SECRET`
- `API_EXECUTION_SIGNING_SECRET`

`CYBER_SENTINELS_ENVIRONMENT`, `CYBER_SENTINELS_PUBLIC_ORIGIN`, and `NEXT_PUBLIC_SITE_URL` now have the exact Production values. Production has zero existing API keys, so establishing the pepper and rotation secret did not invalidate an issued key.

Production Supabase project `kecgtsfibkypjuaxqbjx` has the exact canonical Site URL, email confirmation enabled, unverified email sign-in denied, a 3,600-second JWT lifetime, and a fully populated custom SMTP configuration. Exact Production callback and recovery URLs were appended while every existing redirect was preserved.

## Turnstile and Auth gate

The hosted login page renders a live Cloudflare challenge for `www.cybersentinels.com`. A missing token returned HTTP 400 and a fabricated token returned HTTP 400 `INVALID_TOKEN`, demonstrating fail-closed behavior and a server secret accepted by Cloudflare rather than a missing/invalid-secret configuration error.

Automation did not solve or bypass the human challenge. Consequently, a valid-token success, single-use replay rejection, and wrong-host rejection remain unproven. Hosted provider-outage behavior also remains unproven.

The Auth control plane is configured, but no approved synthetic Production mailbox/session was available to prove sign-in, logout, session continuity, recovery delivery/callback, password update, clean re-login, or advertised magic-link delivery. These are mandatory gates in the release brief.

## Release decision

The candidate was deliberately not merged, Production migrations were not applied, and Vercel Production was not changed to the candidate. Production API and dashboard canaries therefore remain not run and are not claimed.

Exact owner action: complete one supervised Production qualification session with an approved synthetic inbox—solve the live Turnstile challenge, then execute the Auth lifecycle plus Turnstile valid/replay/wrong-host checks. Once that evidence passes, the rehearsed merge → migration → explicit Production deployment → API/dashboard/log canary sequence can proceed without repeating qualified Staging work.

Machine-readable evidence: `artifacts/v1-production-proof.json`.
