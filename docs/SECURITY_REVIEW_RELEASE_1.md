# Security review — Release 1

Review date: 2026-07-15
Scope: authentication, authorization, RLS, secret management, API access, rate limiting, session expiry, and audit logging.

## RC6 evidence update — 2026-07-16

The RC6 schema can retain environment, timestamp, state and non-secret evidence references for deployed checks, and the webhook ledgers retain sanitized replay outcomes. No target project, deployment URL or credentials are linked to this checkout, so deployed authentication, RLS denial, cross-tenant denial and webhook rejection results remain **Blocked**. Source review findings below are not promoted to deployed passes.

## Review boundary

This is a source and configuration-path review. It is not a penetration test, deployed Supabase policy inspection, secret-store audit, dependency CVE attestation, or production traffic test. A migration in source proves intended policy, not deployed policy.

## Findings

| ID | Area | Severity | Status | Evidence | Finding and required action |
| --- | --- | --- | --- | --- | --- |
| R1-SEC-01 | RLS | High | Open | RLS enablement and policies exist across `supabase/migrations`, including operational, workspace, API-key, billing, and agent tables. | Deployment state was not inspected. Export the production policy inventory and run tenant-isolation tests before Release 1.0. |
| R1-SEC-02 | Rate limiting | High | Open | `lib/bot-protection.ts` and `lib/security.ts` enforce bounded in-memory buckets; step-up and Trust Decision now use them. | Buckets are process-local and can reset or diverge across instances. Replace or front them with a durable distributed limiter before general external API availability. |
| R1-SEC-03 | API authorization | Medium | Open | `/api/trust/execute` requires an authenticated Supabase user; `/api/trust/decision` validates a Trust API key; `/api/step-up` now requires a user and is rate limited. | Partner-specific key scopes and quotas are not enforced. Define per-route scopes and tenant binding before issuing production partner keys. |
| R1-SEC-04 | Session expiry | Medium | Open | Supabase server clients call `auth.getUser()`, invalid refresh cookies are cleared, and `/api/auth/session-expired` records inactivity or absolute-timeout events. | Absolute lifetime, inactivity duration, refresh rotation, and MFA policy are deployment responsibilities not verified here. Record and test the production settings. |
| R1-SEC-05 | Secret management | Medium | Open | `lib/env.ts` fails closed for required variables and keeps service-role access server-side. `hashValue()` now uses `SECURITY_HASH_SECRET` or a random per-process fallback instead of a shared hard-coded fallback. | Secret storage, rotation, access logs, and incident revocation cannot be proven from source. Verify the deployment secret manager and rotation runbook. |
| R1-SEC-06 | Audit coverage | Medium | Open | Admin access, Trust API calls, decisions, evidence, step-up, session expiry, and workflow paths write audit records. | Completeness and immutability were not tested across every mutation route. Build an endpoint-to-audit-event coverage matrix and verify append-only retention. |
| R1-SEC-07 | Authentication | Low | Implemented; verify deployment | Middleware requires verified Supabase users for protected paths and applies an admin email allowlist plus verified admin cookie for admin surfaces. | Run production login, refresh, email verification, logout, denial, and stale-session tests. |
| R1-SEC-08 | Request privacy | Low | Improved | IP and user-agent identifiers are hashed before rate-limit/audit metadata; missing hash configuration now produces a per-process secret. | Configure `SECURITY_HASH_SECRET` in production so hashes remain stable for the intended retention window without using raw identifiers. |

## Control summary

- Authentication: present and fail-closed on protected routes; production session behavior needs live testing.
- Authorization: admin checks exist in middleware and server handlers; tenant and partner scopes need deployed verification.
- RLS: extensive migration coverage exists; production state remains unverified.
- Secrets: values are environment-sourced and not exposed by readiness output; rotation is external.
- API access: sensitive reviewed routes use session or API-key gates; scope granularity remains open.
- Rate limiting: functional on selected public and sensitive routes, but not distributed.
- Session expiry: event paths exist; actual provider policy is not evidenced.
- Audit logging: broad coverage exists; exhaustive mutation coverage is not yet proven.

## Release gate

No Critical source finding was identified. Release 1.0 should remain blocked for unrestricted external API use until R1-SEC-01 and R1-SEC-02 are closed. R1-SEC-03 through R1-SEC-06 require owners, dates, and production evidence before enterprise general availability.
