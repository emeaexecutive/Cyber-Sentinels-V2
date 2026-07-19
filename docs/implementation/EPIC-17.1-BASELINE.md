# EPIC 17.1 — Identity Signal Engine Baseline

**Baseline date:** 2026-07-19

**Repository:** `cyber-sentinels-clean`

**Branch:** `main`
**Baseline commit:** `df1c53f`

## Scope and guardrails

This baseline records repository truth before EPIC 17.1 runtime changes. It does not treat documentation, environment-variable names, UI copy, or provider placeholders as implemented capabilities. Runtime code is permitted by the EPIC, but provider credentials, hosted database configuration, Vercel configuration, and production data are not changed by this work.

The identity subsystem will use `trust_workspaces` as the enterprise boundary and `workspace_members` as its trusted membership source. API callers may select a workspace using `X-Enterprise-Id`, but the server must independently authorize that selection. A browser-supplied `enterprise_id` is never authority.

## Repository evidence

| Capability | Baseline status | Evidence |
| --- | --- | --- |
| Tenant/workspace membership | IMPLEMENTED | `trust_workspaces`, `workspace_members`, hardened RLS, and `user_can_access_trust_workspace(uuid)` |
| Hopae adapter | PARTIALLY IMPLEMENTED | Typed adapter, authenticated client, signed callback verification, idempotent webhook ledger, normalized evidence, health checks, and provider execution records exist. Live operation remains credential/configuration dependent. |
| World ID | PARTIALLY IMPLEMENTED | Authenticated proof-shape endpoint exists and fails safely with HTTP 501. No server-side World ID verification exchange exists. |
| Email ownership | MISSING | No provider adapter or verified evidence pipeline. |
| Phone ownership | MISSING | No provider adapter or verified evidence pipeline. |
| IP reputation | MISSING | Request IP hashing exists; no reputation provider or verified result. |
| VPN/proxy/Tor | MISSING | No provider adapter or verified evidence pipeline. |
| Geolocation | MISSING | No provider adapter or verified evidence pipeline. |
| Device context | PARTIALLY IMPLEMENTED | Privacy-safe request hashes exist, but no tenant-scoped identity signal evidence model or stable configured device signal. |
| Identity subjects | MISSING | No canonical identity subject table or API. |
| Verification orchestration | MISSING | Provider-specific orchestration exists, but no provider-neutral identity signal request lifecycle. |
| Identity confidence | MISSING | No evidence-aware identity confidence result model for this EPIC. |
| Provider capability truth | PARTIALLY IMPLEMENTED | Provider registry/readiness exists, but it does not expose the EPIC 17.1 signal-by-signal capability contract. |
| Enterprise identity UI | MISSING | No identity signal dashboard, verification detail view, or capability matrix. |
| Identity API | MISSING | None of the EPIC 17.1 `/api/identity/*` routes exist. |
| Identity-specific tests | MISSING | Hopae/provider tests exist; no subject, orchestration, confidence, API, or new-table RLS suite. |

## Existing assets to preserve

- Hopae Connect adapter and callback security under `lib/providers`.
- Canonical Hopae workflow under `lib/providers/hopae-rc1-server.ts`.
- Existing provider registry and normalized evidence migrations.
- Safe World ID behavior: an accepted payload shape must never become a verified identity result without an upstream server verification.
- Operational trust UI and API conventions.

## Known release constraints

- Provider health and successful live verification cannot be claimed without deployment credentials and upstream configuration.
- Applying the new migration and executing live RLS isolation tests require an authorized Supabase environment.
- The CS-ENG-002 audit identified separate broad legacy `teams` / `team_members` RLS policies. EPIC 17.1 does not rely on those tables, but the finding remains a production release blocker until separately remediated and verified.
- The worktree contained pre-existing documentation edits and generated audit reports. They are outside this EPIC and must remain unstaged.

## Implementation boundary

EPIC 17.1 will add an additive schema, service-only evidence writes, authenticated tenant-scoped APIs, provider-neutral orchestration, truthful disabled adapters, a provisional confidence result, operator UI, tests, and operations documentation. It will not manufacture provider success, store raw proof payloads, or mutate external configuration.
