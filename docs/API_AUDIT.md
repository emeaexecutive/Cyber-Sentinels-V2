# Cyber Sentinels API Audit

Date: 2026-06-04

Status legend: WORKING, PARTIAL, BROKEN, UNUSED, UNSAFE.

## Summary

Cyber Sentinels has a broad API surface. The core V1 spine is present: passports, evidence upload, admin evidence review, admin verification decisions, auth callbacks, notifications through server actions, appeals, feedback, trust events, and admin access. The main launch risks are not missing routes; they are breadth, legacy routes, and several future-platform endpoints that should remain out of the public V1 story.

## Core V1 APIs

| Area | Route | Status | Notes |
| --- | --- | --- | --- |
| Auth callback | `/auth/callback` | WORKING | Exchanges Supabase code, preserves safe `next`, redirects to `/passport` by default, and returns clear login errors. |
| Logout | `/api/auth/logout` | WORKING | Signs out Supabase session, clears Supabase/admin cookies, redirects to login. |
| Session expiry | `/api/auth/session-expired` | WORKING | Validates expiry reason, writes audit/signal when a user exists, returns safe success. |
| Passport creation | `/api/passports` | WORKING | Requires authentication, validates input, creates passport and verification case, writes audit logs, signals, and notification events. |
| Evidence upload | `/api/evidence/upload` | WORKING | Requires authentication, validates case ownership/admin access, validates file type/size, uploads to private `evidence-files` bucket, stores storage path, writes audit/signal/notification. |
| Legacy evidence metadata | `/api/evidence` | PARTIAL | Requires authentication and writes audit/signal. Updated to allow private `storage_path` without requiring a public URL. Prefer `/api/evidence/upload` for production. |
| Admin evidence decision | `/api/admin/evidence/[id]/decision` | WORKING | Requires admin API access, validates decision, updates evidence status, writes audit/signal, sends notification. |
| Admin verification decision | `/api/admin/verification-cases/[id]/decision` | WORKING | Requires admin API access, validates decision, inserts decision row, updates case/passport, writes multiple audit/signal records, runs policy/decision helpers. |
| User decision helper | `/api/passports/[id]/decision` | PARTIAL | Legacy/direct decision surface should not be positioned as the primary admin review path until separately reviewed. |

## Communications And Support

| Area | Route | Status | Notes |
| --- | --- | --- | --- |
| Notifications | Server actions and helper writes | WORKING | User notifications page filters by `user_id`; mark-all-read writes audit/signal. No standalone notification API is exposed. |
| Appeals submission | `/appeals` server action | WORKING | Requires authenticated user, verifies passport ownership by email, inserts appeal, writes audit/signal/notification. |
| Admin appeals review | `/api/admin/appeals/[id]/review` | WORKING | Requires admin API access, validates status, updates appeal, writes audit/signal/notification. |
| Feedback submission | `/feedback` server action | WORKING | Requires authenticated user, inserts feedback, optionally records interest signal, writes audit/signal. |
| Admin feedback update | `/api/admin/feedback/[id]` | WORKING | Requires admin API access, validates target/status, updates feedback or interest signal, writes audit/signal. |
| Enterprise access | `/enterprise-access` server action | WORKING | Public lead capture inserts `enterprise_access_requests` and lightweight `interest_signals`. No auth required by design. |
| Data rights admin update | `/api/admin/data-rights/[id]/status` | WORKING | Requires admin API access, validates status, writes audit/signal. |
| Admin messages | `/api/admin/messages/[id]/action` | WORKING | Requires admin API access, supports reply/escalate/close, writes audit/signal and user notification on replies. |
| Help answers | `/api/admin/help-questions/[id]/answer` | PARTIAL | Admin-managed knowledge flow exists; keep scoped to admin review and avoid presenting as AI-autonomous support. |
| Trust assistant answers | `/api/admin/trust-assistant-questions/[id]/answer` | PARTIAL | Admin-managed answer flow exists. AI drafting remains separate and admin-only. |

## Trust Events, Agents, And Developer Platform

| Area | Route | Status | Notes |
| --- | --- | --- | --- |
| Trust events | `/api/trust-events` | PARTIAL | Requires authentication. Users see own events by metadata/agent ownership; admins see all. Writes audit/signal on create. Future platform layer, not core V1. |
| Agents | `/api/agents` | PARTIAL | Requires authentication; owner/admin filtering exists; create writes agent, trust event, audit logs and signals. Future AI identity layer. |
| Agent detail | `/api/agents/[id]` | PARTIAL | Requires auth and owner/admin access; PATCH writes audit/signal. Future layer. |
| API keys | `/api/developer/api-keys` | PARTIAL | Requires auth, stores masked placeholder prefixes only. Not production-grade API authentication yet. |

## Admin And Experimental APIs

| Area | Route | Status | Notes |
| --- | --- | --- | --- |
| Admin access step-up | `/api/admin/access` | WORKING | Requires authenticated allowlisted admin, validates step-up code, sets admin verification cookie, writes audit/signal. |
| AI draft answers | `/api/admin/assistant/draft-answer` | PARTIAL | Admin-only. Depends on `OPENAI_API_KEY` and approved knowledge base content. Should remain disabled when key/content is absent. |
| Demo seed | `/api/demo/seed` | UNUSED | Keep out of public launch flow unless explicitly needed for seeded demo environments. |
| Public profile/seal/verify APIs | `/api/public/*`, `/api/seals/*`, `/api/embed/*` | PARTIAL | Public-facing verification surfaces exist but are not the core V1 workflow. Keep copy conservative. |
| World ID verification | `/api/verify/world` | PARTIAL | Requires authenticated session and validates proof shape, but provider verification is explicitly a placeholder. Not production-ready World ID verification. |
| Origin/HPG/reality-twin analysis | `/api/origin/analyze`, `/api/hpg/analyze`, `/api/reality-twin/analyze` | PARTIAL | Analysis-style endpoints exist from broader platform direction. Do not position as launch-critical unless independently validated. |
| Registry, ledger, revocation, permissions | Various | PARTIAL | Infrastructure-oriented APIs exist, but should remain secondary/future until route-level tests and product scope are tightened. |

## Billing API

| Area | Route | Status | Notes |
| --- | --- | --- | --- |
| Checkout | `/api/billing/checkout` | PARTIAL | Explicitly disabled with HTTP 501. Validates plan and authenticated user before recording a disabled checkout audit/signal. No Stripe checkout session is created. |

## Findings

- Core passport/evidence/decision APIs are operational and write audit/signal records.
- Admin APIs consistently use `requireAdminApiAccess`, which checks authenticated session, allowlist, and admin verification cookie.
- Legacy `/api/evidence` no longer requires public URLs, but `/api/evidence/upload` remains the preferred production path.
- Stripe is not implemented and is now explicitly disabled at the API layer.
- Future platform APIs should remain hidden, collapsed, or admin/developer-only for V1 clarity.
- Several endpoints return redirects for auth failures and JSON for validation failures. This is acceptable for mixed form/API use, but a later API consistency pass should standardize response envelopes by consumer type.

## Launch Recommendation

Proceed with V1 only around the core spine:

1. Trust Passport creation
2. Private evidence upload
3. Admin evidence review
4. Admin verification decisions
5. Audit logs and signals
6. Notifications and appeals
7. Public demo and enterprise access

Keep billing, World ID provider exchange, developer API keys, agents, and advanced analysis endpoints marked partial or future.
