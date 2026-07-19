# EPIC 17.1C Provider Health Runbook

## Purpose

Use the provider health view to distinguish configuration, live reachability and persisted verification evidence. Never interpret provider registration or a successful health request as proof of a verified identity.

## Operator workflow

1. Sign in with an authorized Trust Workspace account.
2. Open `/dashboard/identity/providers` and confirm the selected workspace.
3. Review capability states separately from the health table.
4. For Hopae, treat `AVAILABLE` as live health only. Require `TRANSACTIONAL`, `SIGNED` and `SERVER_VERIFIED` plus retained evidence references before describing a completed exchange as signed evidence.
5. For World ID, retain `Server verification not implemented` and `Proof received — server verification pending` until a real server verifier, persistence path and tests are deployed.
6. For placeholders, keep transactional, signature and server-verification capability false.
7. Record the correlation ID from the API response when escalating an incident. Do not copy secrets or raw provider payloads into a ticket.

## State interpretation

| State | Operator meaning |
| --- | --- |
| Registered | Provider metadata exists; no runtime claim follows. |
| Configured | Required configuration is present; credentials and provider availability may still fail. |
| Available | A safe live health request succeeded. |
| Transactional | A successful provider transaction with a retained reference exists. |
| Signed | Persisted execution shows verified signature and idempotency results. |
| Server Verified | Signed prerequisites plus normalized persisted positive evidence exist. |
| Degraded | Live health is unavailable or degraded. |
| Disabled | Provider execution is intentionally disabled. |
| Blocked | One or more evidence prerequisites are missing. |

## Safe escalation data

Allowed: provider ID, normalized state, last-check time, response duration, reason code, blocker, correlation ID, retained opaque provider reference.

Forbidden: API keys, webhook secrets, authorization headers, raw callback bodies, raw provider error bodies, identity documents or unnormalized provider payloads.

## External blockers

Vercel Production Branch, Vercel Production environment completeness, Cloudflare WAF/DNSSEC/bot controls/rate limiting, Supabase deployed migrations and Supabase Production RLS must remain `BLOCKED BY EXTERNAL CONFIGURATION` until evidence is collected from the relevant control plane.
