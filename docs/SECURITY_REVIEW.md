# Cyber Sentinels V1 Security Review

Last reviewed: 2026-06-03

V1 security posture: authenticated user workflows, admin-only operations, private evidence storage, auditability and role-separated access.

## Summary

| Area | Status | Finding |
| --- | --- | --- |
| Middleware route protection | WORKING | User and admin route prefixes are protected in `middleware.ts`. |
| Admin route protection | WORKING | Admin routes require Supabase session, allowlisted email and `cyber_admin_verified` cookie. |
| Admin APIs | WORKING | `/api/admin/*` is protected by middleware and shared admin utility checks. |
| Public route separation | WORKING | `/demo` and `/enterprise-access` are public. `/passport` and `/passports` require auth. |
| Auth callback | WORKING | `/auth/callback` exchanges Supabase `code` and redirects to a safe local path. |
| Logout/session clearing | WORKING | `/api/auth/logout` signs out and clears Supabase/admin cookies. |
| Password reset | WORKING | Reset flow returns users to `/passport`. |
| Evidence storage privacy | WORKING | New migration sets `evidence-files` bucket to private; new uploads do not store public URLs. |
| RLS enabled | PARTIAL | RLS is enabled broadly, but some older policies allow all authenticated users to manage operational rows. |
| User data isolation | PARTIAL | Newer tables use owner/admin policies; some older tables still rely on app-side filtering plus broad authenticated RLS. |

## Route Protection

### Public

Public routes do not require login and should not query protected private records:

- `/`
- `/demo`
- `/enterprise-access`
- `/how-to-use`
- `/help`
- `/security`
- `/privacy`
- `/terms`
- `/trust-principles`
- `/ai-governance`
- `/transparency`
- legal/support pages
- `/status`

Status: **WORKING**

### Authenticated User

User routes require a Supabase session:

- `/passport`
- `/passports`
- `/passports/[id]`
- `/evidence-upload`
- `/notifications`
- `/appeals`
- `/data-rights`
- `/knowledge-base`
- `/trust-assistant`
- `/messages`
- `/developers/api-keys`

Status: **WORKING**, with V1 recommendation to keep developer and assistant surfaces out of primary user navigation.

### Admin

Admin routes require:

- authenticated Supabase user
- email allowlist from `ADMIN_EMAILS`
- admin verification cookie `cyber_admin_verified`

Protected admin routes include:

- `/back-office`
- `/verification-queue`
- `/evidence-vault`
- `/decision-engine`
- `/trust-intelligence`
- `/trust-graph-engine`
- `/workforce-trust`
- `/intent-verification`
- `/autonomy-governance`
- `/execution-passports`
- `/state-verification`
- `/agents`
- `/trust-events`
- `/api/admin/*`

Status: **WORKING**

## Supabase RLS Review

| Table group | Status | Notes |
| --- | --- | --- |
| `notifications`, `appeals`, `message_threads`, `message_events` | WORKING | Own-row user policies plus admin policies exist. |
| `trust_assistant_questions`, `knowledge_articles`, `api_keys`, `agents`, `trust_events`, `agent_permissions` | WORKING/PARTIAL | Newer policies include own-read/admin patterns. V1 should not promote future tables. |
| `passports`, `verification_cases`, `evidence_files`, `decisions`, `audit_logs`, `signals` | PARTIAL | RLS is enabled, but older migrations include broad authenticated policies. App pages filter user records, but database policies should be tightened before broad production use. |
| `enterprise_access_requests` | WORKING | Anonymous insert only; authenticated manage for operational review. |
| `trust_graph_nodes`, `trust_graph_edges` | PARTIAL | Authenticated manage policies exist. Keep admin-only in V1. |

## Evidence Storage

Status: **WORKING**

Findings:

- `evidence-files` was previously configured as a public bucket.
- Launch consolidation migration `202606030006_private_evidence_bucket.sql` sets the bucket to private.
- New uploads now store `storage_path` and do not write public URLs.
- Evidence upload still writes audit logs, signals and notifications.

Follow-up:

- Add a signed download route for authorized users/admins if direct evidence viewing is required.
- Avoid exposing `public_url` or raw storage paths in public pages.

## Audit Logs And Signals

Status: **WORKING**

Core workflows write audit and signal records:

- passport creation
- evidence upload
- evidence accept/reject/request more evidence
- admin decisions
- notifications
- appeals
- help/assistant actions
- graph snapshots
- enterprise access requests are intentionally simple lead intake and do not currently write audit/signal records.

V1 copy should describe these as auditability and operational transparency. Avoid implying guaranteed trustworthiness or automated truth.

## Auth Flow Review

| Flow | Status | Notes |
| --- | --- | --- |
| Signup | WORKING | Email redirect points to `/auth/callback?next=/passport`. |
| Email verification/magic link | WORKING | Callback exchanges code and redirects to safe next path. |
| Login | WORKING | Defaults to `/passport`. |
| Admin access | WORKING | Separate admin link and step-up protection. |
| Logout | WORKING | Clears session/admin cookies. |
| Password reset | WORKING | Updates password and returns to `/passport`. |

## Production Risks Before Wider Launch

| Risk | Severity | Recommendation |
| --- | --- | --- |
| Broad authenticated RLS on older operational tables | High | Replace broad authenticated policies with owner/admin policies for passports, cases, evidence, decisions, audit logs and signals. |
| Back Office complexity | Medium | Keep advanced/future panels collapsed and focus admin demo on queue, evidence, decisions, audit and signals. |
| Future AI/developer routes exist | Medium | Keep hidden/admin-only until they are product-ready and documented. |
| Evidence signed access missing | Medium | Add signed URL/download endpoint after private storage hardening. |
| Public status page may reveal operational availability | Low | Keep status checks high-level and avoid sensitive internals. |

## V1 Security Conclusion

Cyber Sentinels is **launch-demo ready** for a controlled V1 demo if the story stays focused on the V1 spine and private evidence storage is deployed through the latest migration.

It is **not yet ready for unrestricted production use** until older RLS policies are tightened to owner/admin access at the database layer.


## 2026-07-08 Enterprise Consolidation Update

The consolidation pass preserves the prior V1 findings and adds this security hardening frame:

| Area | Current posture | Hardening action |
| --- | --- | --- |
| Auth | Supabase auth, email verification, protected route middleware. | Keep public navigation auth build-safe and verify session handling after nav/auth edits. |
| RLS | Existing Supabase policies should remain intact. | Do not weaken RLS; use migration-safe dedupe for policy conflicts. |
| MFA readiness | Admin step-up/back-office flow exists conceptually. | Document MFA requirement for production admin and enterprise SSO. |
| Step-up auth | Admin verification cookie and back-office denial paths protect admin tools. | Preserve denial reasons and noindex headers. |
| Audit logging | Replay, receipt, trust events and admin actions are audit candidates. | Ensure lightweight metadata only; avoid secret or sensitive payload logging. |
| Secret management | Provider credentials must be env-bound. | Never expose credentials in UI, logs, docs, or client bundles. |
| Rate limiting | Public intake, support, waitlist, auth and provider endpoints need controls. | Keep Turnstile and rate limiting on public abuse-prone routes. |
| Turnstile | Auth/session protection path exists. | Re-test after any login or enterprise-access form changes. |
| Provider credentials | Credentials cannot be treated as proof of live capability. | Require endpoint test, signed evidence, and reviewed status before Live. |

Non-negotiables:

- Admin/internal tooling stays hidden from public navigation.
- Protected routes stay noindex and private/no-store.
- Public pages do not reveal internal provider keys, testbench behavior, seed endpoints, or repair operations.
- Security docs should name gaps plainly instead of converting them into marketing claims.
