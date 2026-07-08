# Security Hardening Review

This review preserves current auth, authorization and RLS posture. No weakening changes were made.

| Area | Current State | Risk | ERM Action |
| --- | --- | --- | --- |
| Authentication | Supabase auth, email verification and reset-password flows are present. | Live email/provider settings are environment-specific. | Verify deployed signup, login, callback, reset and logout. |
| Authorization | Middleware protects user, admin, internal and experimental route families. | Route sprawl makes missed prefixes more likely. | Any new protected route must be added to middleware or rejected. |
| Admin access | Admin routes require session, verified email, allowlist and admin verification cookie. | Misconfigured `ADMIN_EMAILS` blocks admin access by design. | Keep fail-closed behavior. |
| RLS | Multiple Supabase migrations enable RLS and owner/admin patterns. | Older broad authenticated policies remain a production risk. | Run deployed policy audit before enterprise launch. |
| Secret management | Providers use environment-gated configuration. | Credentials can be mistaken for readiness. | Never expose secrets or imply live provider capability from env presence. |
| Audit logging | Replay, governance and audit routes exist. | Missing reviewer attribution weakens audit evidence. | Require actor, authority, evidence and outcome fields. |
| CSRF | Server routes rely on auth, form patterns and provider-specific checks. | Sensitive mutation routes need review. | Add CSRF review to every public form or authenticated mutation. |
| Rate limiting | Some public surfaces use bot protection concepts. | Broad API surface creates abuse risk. | Prioritize rate limits for intake, verify, support and provider-triggering routes. |
| Turnstile | Registry supports Cloudflare Turnstile when configured. | Challenge evidence is not identity evidence. | Keep Turnstile as abuse signal only. |
| Session expiry | Expiry and session action routes exist. | UX and replay evidence need live testing. | Verify expiry, reauth and replay-event capture in deployment. |
| Step-up auth | Step-up route and admin verification cookie exist. | MFA readiness is not full MFA deployment. | Keep step-up for admin/sensitive actions and document MFA roadmap. |
| MFA readiness | `lib/auth/mfa.ts` exists as readiness support. | Not a complete enterprise MFA rollout. | Treat MFA as roadmap until provider-backed flow is validated. |

## Hardening Blockers

- Deployed RLS policy verification is required before enterprise production.
- Public mutation routes need rate-limit and CSRF review.
- Provider credentials must remain server-side and never appear in logs, receipts or public pages.
- Admin diagnostics must remain protected and noindexed.
